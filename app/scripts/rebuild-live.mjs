import { existsSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import { stampDeploymentMetadata } from './stamp-deployment-metadata.mjs';

const LIVE_BASE_URL = 'http://127.0.0.1:3000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, '.next-build');
const candidateDistDir = path.join(appDir, '.next-build.__new');
const previousDistDir = path.join(appDir, '.next-build-prev');
const staleDistDir = path.join(appDir, '.next');
const rootEnvPath = path.resolve(appDir, '..', '.env');
const sharedPagePaths = ['/', '/projects', '/my-tasks', '/queue', '/manage-workspace', '/docs/agents'];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...rest] = trimmed.split('=');
    if (!key || process.env[key.trim()] !== undefined) {
      continue;
    }

    let value = rest.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key.trim()] = value;
  }
}

loadEnvFile(rootEnvPath);


function currentPort3000Pid() {
  const result = spawnSync('sh', ['-lc', "ss -ltnp '( sport = :3000 )' 2>/dev/null"], {
    cwd: appDir,
    encoding: 'utf8'
  });

  const output = `${result.stdout ?? ''}
${result.stderr ?? ''}`;
  const match = output.match(/pid=(\d+)/);
  return match?.[1] ?? null;
}

function removeDir(target) {
  rmSync(target, { recursive: true, force: true });
}

function validateBuild(target) {
  const buildIdPath = path.join(target, 'BUILD_ID');
  const staticDir = path.join(target, 'static');
  const chunksDir = path.join(staticDir, 'chunks');
  const cssDir = path.join(staticDir, 'css');

  if (!existsSync(buildIdPath)) {
    throw new Error(`Build validation failed: missing ${buildIdPath}`);
  }

  if (!existsSync(staticDir) || !existsSync(chunksDir) || !existsSync(cssDir)) {
    throw new Error('Build validation failed: expected static/chunks/css output is missing.');
  }

  const chunkFiles = readdirSync(chunksDir).filter((name) => name.endsWith('.js'));
  const cssFiles = readdirSync(cssDir).filter((name) => name.endsWith('.css'));

  if (!chunkFiles.length || !cssFiles.length) {
    throw new Error('Build validation failed: missing hashed JS chunks or CSS assets in the candidate build output.');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminateExistingListener(pid) {
  const killResult = spawnSync('kill', [pid], {
    cwd: appDir,
    encoding: 'utf8'
  });

  if (killResult.status !== 0) {
    const details = `${killResult.stdout ?? ''}${killResult.stderr ?? ''}`.trim();
    throw new Error(`Failed to stop existing port 3000 listener (pid ${pid}).${details ? ` ${details}` : ''}`);
  }
}

async function waitForPortRelease(previousPid, attempts = 25, delayMs = 200) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const livePid = currentPort3000Pid();
    if (!livePid || livePid !== previousPid) {
      return;
    }
    await sleep(delayMs);
  }

  throw new Error(`Timed out waiting for existing port 3000 listener (pid ${previousPid}) to exit.`);
}


function runAndWait(command, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: appDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv
      }
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function buildCandidate() {
  removeDir(candidateDistDir);
  removeDir(staleDistDir);

  const buildCode = await runAndWait(
    'node',
    ['scripts/with-root-env.mjs', './node_modules/.bin/next', 'build'],
    { NEXT_DIST_DIR: path.basename(candidateDistDir) }
  );

  if (buildCode !== 0) {
    process.exit(buildCode);
  }

  validateBuild(candidateDistDir);
}

function promoteCandidateBuild() {
  removeDir(previousDistDir);

  try {
    if (existsSync(distDir)) {
      renameSync(distDir, previousDistDir);
    }
    renameSync(candidateDistDir, distDir);
  } catch (error) {
    try {
      if (!existsSync(distDir) && existsSync(previousDistDir)) {
        renameSync(previousDistDir, distDir);
      }
    } catch {}

    throw new Error(
      `Failed to promote the private candidate build into .next-build.${error instanceof Error ? ` ${error.message}` : ''}`
    );
  }
}

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    const req = transport.request(target, { method, headers }, (res) => {
      const status = res.statusCode ?? 0;
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ status, body, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function probe(url) {
  const { status } = await request(url);
  if (status >= 200 && status < 500) {
    return status;
  }
  throw new Error(`Unexpected HTTP ${status} from ${url}`);
}

async function waitForLiveProbe(url, attempts = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const status = await probe(url);
      console.log(`Live probe OK on attempt ${attempt}: ${url} -> HTTP ${status}`);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleep(delayMs);
    }
  }
}

async function signInForValidation() {
  const email = process.env.MC_OWNER_EMAIL || process.env.OWNER_EMAIL || 'owner@northstar.lab';
  const password = process.env.MC_OWNER_PASSWORD || process.env.OWNER_PASSWORD || 'mission-control-local';
  const payload = JSON.stringify({ email, password });
  const { status, headers } = await request(`${LIVE_BASE_URL}/api/auth/sign-in`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload))
    },
    body: payload
  });

  if (status !== 200) {
    throw new Error(`Live sign-in validation failed with HTTP ${status}.`);
  }

  const setCookie = headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookiePair = cookieHeader?.split(';')[0];

  if (!cookiePair) {
    throw new Error('Live sign-in validation failed: expected auth cookie from /api/auth/sign-in.');
  }

  return cookiePair;
}

async function fetchHtmlWithRedirects(pathname, headers, redirectsRemaining = 5) {
  const { status, body, headers: responseHeaders } = await request(`${LIVE_BASE_URL}${pathname}`, { headers });

  if ([301, 302, 303, 307, 308].includes(status)) {
    if (redirectsRemaining <= 0) {
      throw new Error(`Too many redirects while validating ${pathname}.`);
    }

    const location = responseHeaders.location;
    if (!location) {
      throw new Error(`Redirect from ${pathname} did not include a Location header.`);
    }

    const nextPath = new URL(location, LIVE_BASE_URL).pathname;
    return fetchHtmlWithRedirects(nextPath, headers, redirectsRemaining - 1);
  }

  return {
    status,
    body,
    pathname
  };
}

function extractStaticAssetPaths(html) {
  const assetPaths = new Set();
  const assetPattern = /(?:href|src)="([^"]*\/_next\/static\/[^""]+)"/g;

  for (const match of html.matchAll(assetPattern)) {
    const assetPath = match[1];
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      continue;
    }
    assetPaths.add(assetPath.startsWith('/') ? assetPath : `/${assetPath}`);
  }

  return Array.from(assetPaths);
}

async function validateLiveHtmlAssets(attempts = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { status, body } = await request(`${LIVE_BASE_URL}/sign-in`);
    if (status < 200 || status >= 500) {
      throw new Error(`Unexpected HTTP ${status} from ${LIVE_BASE_URL}/sign-in during HTML asset validation`);
    }

    const assetPaths = extractStaticAssetPaths(body);
    if (!assetPaths.length) {
      throw new Error('Live HTML asset validation failed: /sign-in did not reference any /_next/static assets.');
    }

    const cssAssets = assetPaths.filter((assetPath) => assetPath.includes('.css'));
    const jsAssets = assetPaths.filter((assetPath) => assetPath.includes('.js'));
    if (!cssAssets.length || !jsAssets.length) {
      throw new Error('Live HTML asset validation failed: expected at least one CSS asset and one JS asset in /sign-in HTML.');
    }

    let failedAsset = null;
    for (const assetPath of assetPaths) {
      const { status: assetStatus } = await request(`${LIVE_BASE_URL}${assetPath}`);
      if (assetStatus < 200 || assetStatus >= 400) {
        failedAsset = `${assetPath} returned HTTP ${assetStatus}`;
        break;
      }
    }

    if (!failedAsset) {
      console.log(`Live HTML asset validation OK: ${assetPaths.length} referenced /_next/static assets responded successfully.`);
      return;
    }

    if (attempt === attempts) {
      throw new Error(`Live asset validation failed: ${failedAsset}`);
    }

    await sleep(delayMs);
  }
}

async function validateSharedWorkspacePages() {
  const cookie = await signInForValidation();

  for (const pagePath of sharedPagePaths) {
    const { status, body } = await fetchHtmlWithRedirects(pagePath, { cookie });
    if (status < 200 || status >= 500) {
      throw new Error(`Unexpected HTTP ${status} from ${pagePath} during shared page validation.`);
    }

    const assetPaths = extractStaticAssetPaths(body);
    if (!assetPaths.length) {
      throw new Error(`Shared page asset validation failed: ${pagePath} did not reference any /_next/static assets.`);
    }

    for (const assetPath of assetPaths) {
      const { status: assetStatus } = await request(`${LIVE_BASE_URL}${assetPath}`, { headers: { cookie } });
      if (assetStatus < 200 || assetStatus >= 400) {
        throw new Error(`Shared page asset validation failed: ${pagePath} referenced ${assetPath}, which returned HTTP ${assetStatus}.`);
      }
    }

    console.log(`Shared page asset validation OK: ${pagePath} -> ${assetPaths.length} /_next/static assets responded successfully.`);
  }
}

await buildCandidate();

const existingPid = currentPort3000Pid();
if (existingPid) {
  console.warn(`Replacing existing port 3000 listener (pid ${existingPid}) before starting the fresh live server.`);
  terminateExistingListener(existingPid);
  await waitForPortRelease(existingPid);
}

promoteCandidateBuild();

try {
  const deployment = stampDeploymentMetadata(appDir);
  if (deployment.commit) {
    console.log(`Stamped DEPLOYMENT.json to ${deployment.commit.slice(0, 7)}.`);
  }
} catch (error) {
  console.warn('Warning: failed to stamp DEPLOYMENT.json after promoting the live build.', error);
}

const startChild = spawn('node', ['scripts/serve-live.mjs'], {
  cwd: appDir,
  stdio: 'inherit',
  env: process.env
});

startChild.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

await waitForLiveProbe(`${LIVE_BASE_URL}/sign-in`);
await validateLiveHtmlAssets();
await validateSharedWorkspacePages();
