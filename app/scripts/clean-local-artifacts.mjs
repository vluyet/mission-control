import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');

const exactTargets = [
  '.next-build-failed',
  '.next-build.__new',
  '.next.__verify',
  'artifacts',
  'server.log',
  'debug.png',
  'failure.png'
];

const patternedTargets = [/^\.next-build\.archive-/, /^\.next-build-prev\.archive-/];

function removeTarget(targetName) {
  rmSync(path.join(appDir, targetName), { recursive: true, force: true });
  console.log(`Removed ${targetName}`);
}

const entries = new Set(readdirSync(appDir));
const targets = new Set(exactTargets.filter((target) => entries.has(target)));

for (const entry of entries) {
  if (patternedTargets.some((pattern) => pattern.test(entry))) {
    targets.add(entry);
  }
}

if (!targets.size) {
  console.log('No local build artifacts found.');
  process.exit(0);
}

for (const target of [...targets].sort()) {
  removeTarget(target);
}