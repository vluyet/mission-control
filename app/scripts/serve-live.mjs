import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, '.next-build');
const staleDistDir = path.join(appDir, '.next');

if (!existsSync(distDir)) {
  console.error('Missing .next-build. Run `npm run build` before `npm run start`.');
  process.exit(1);
}

if (existsSync(staleDistDir)) {
  console.error('Refusing to start with stale .next present. Run `npm run build` to cleanly rebuild first.');
  process.exit(1);
}

function currentPort3000Pid() {
  const result = spawnSync('sh', ['-lc', "ss -ltnp '( sport = :3000 )' 2>/dev/null"], {
    cwd: appDir,
    encoding: 'utf8'
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const match = output.match(/pid=(\d+)/);
  return match?.[1] ?? null;
}

function terminateExistingListener(pid) {
  const killResult = spawnSync('kill', [pid], {
    cwd: appDir,
    encoding: 'utf8'
  });

  if (killResult.status !== 0) {
    const details = `${killResult.stdout ?? ''}${killResult.stderr ?? ''}`.trim();
    console.error(`Failed to stop existing port 3000 listener (pid ${pid}).${details ? ` ${details}` : ''}`);
    process.exit(killResult.status ?? 1);
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const livePid = currentPort3000Pid();
    if (!livePid) return;
    if (livePid !== pid) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }

  const remainingPid = currentPort3000Pid();
  if (remainingPid === pid) {
    console.error(`Timed out waiting for existing port 3000 listener (pid ${pid}) to exit.`);
    process.exit(1);
  }
}

const existingPid = currentPort3000Pid();
if (existingPid) {
  console.warn(`Replacing existing port 3000 listener (pid ${existingPid}) before starting the fresh live server.`);
  terminateExistingListener(existingPid);
}

const child = spawn('node', ['scripts/with-root-env.mjs', './node_modules/.bin/next', 'start', '-H', '0.0.0.0'], {
  cwd: appDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_DIST_DIR: '.next-build'
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
