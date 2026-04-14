import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, '.next-build');
const staleDistDir = path.join(appDir, '.next');

for (const target of [distDir, staleDistDir]) {
  try {
    rmSync(target, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to remove build dir ${target}:`, error);
    process.exit(1);
  }
}

const child = spawn('node', ['scripts/with-root-env.mjs', './node_modules/.bin/next', 'build'], {
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
