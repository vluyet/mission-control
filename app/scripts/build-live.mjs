import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { stampDeploymentMetadata } from './stamp-deployment-metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, '.next-build');
const tempDistDir = path.join(appDir, '.next-build.__new');
const backupDistDir = path.join(appDir, '.next-build.__old');
const staleDistDir = path.join(appDir, '.next');

function currentPort3000Pid() {
  const result = spawnSync('sh', ['-lc', "ss -ltnp '( sport = :3000 )' 2>/dev/null"], {
    cwd: appDir,
    encoding: 'utf8'
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const match = output.match(/pid=(\d+)/);
  return match?.[1] ?? null;
}

function removeDir(target) {
  try {
    rmSync(target, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to remove build dir ${target}:`, error);
    process.exit(1);
  }
}

function validateBuild(target) {
  const buildIdPath = path.join(target, 'BUILD_ID');
  const staticDir = path.join(target, 'static');
  const chunksDir = path.join(staticDir, 'chunks');
  const cssDir = path.join(staticDir, 'css');

  if (!existsSync(buildIdPath)) {
    console.error(`Build validation failed: missing ${buildIdPath}`);
    process.exit(1);
  }

  if (!existsSync(staticDir) || !existsSync(chunksDir) || !existsSync(cssDir)) {
    console.error('Build validation failed: expected static/chunks/css output is missing.');
    process.exit(1);
  }

  const chunkFiles = readdirSync(chunksDir).filter((name) => name.endsWith('.js'));
  const cssFiles = readdirSync(cssDir).filter((name) => name.endsWith('.css'));

  if (!chunkFiles.length || !cssFiles.length) {
    console.error('Build validation failed: missing hashed JS chunks or CSS assets in the live build output.');
    process.exit(1);
  }
}

const existingPid = currentPort3000Pid();
if (existingPid) {
  console.error(
    `Refusing to promote a new .next-build while port 3000 is live (pid ${existingPid}). ` +
      'Build a private candidate first and cut over only after the listener stops.'
  );
  process.exit(1);
}

removeDir(tempDistDir);
removeDir(backupDistDir);
removeDir(staleDistDir);

const child = spawn('node', ['scripts/with-root-env.mjs', './node_modules/.bin/next', 'build'], {
  cwd: appDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_DIST_DIR: path.basename(tempDistDir)
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if ((code ?? 1) !== 0) {
    removeDir(tempDistDir);
    process.exit(code ?? 1);
  }

  validateBuild(tempDistDir);

  try {
    if (existsSync(distDir)) {
      renameSync(distDir, backupDistDir);
    }
    renameSync(tempDistDir, distDir);
    removeDir(backupDistDir);
  } catch (error) {
    console.error('Failed to promote the freshly built live bundle into .next-build:', error);
    try {
      if (!existsSync(distDir) && existsSync(backupDistDir)) {
        renameSync(backupDistDir, distDir);
      }
    } catch {}
    process.exit(1);
  }

  process.exit(0);
});

  try {
    const deployment = stampDeploymentMetadata(appDir);
    if (deployment.commit) {
      console.log(`Stamped DEPLOYMENT.json to ${deployment.commit.slice(0, 7)}.`);
    }
  } catch (error) {
    console.warn('Warning: failed to stamp DEPLOYMENT.json after promoting the live build.', error);
  }
