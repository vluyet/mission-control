import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function cleanValue(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readDeploymentFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function readTextFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readVersion(repoDir) {
  try {
    return cleanValue(readFileSync(path.join(repoDir, 'VERSION'), 'utf8'));
  } catch {
    return null;
  }
}

function runGit(repoDir, args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return null;
  }

  return cleanValue(result.stdout);
}

function applyDeploymentEnvironment(payload) {
  const deploymentEnv = {
    MISSION_CONTROL_VERSION: payload.version,
    MISSION_CONTROL_BRANCH: payload.branch ?? '',
    MISSION_CONTROL_COMMIT: payload.commit ?? '',
    MISSION_CONTROL_DEPLOY_REF: payload.ref ?? ''
  };

  for (const [key, value] of Object.entries(deploymentEnv)) {
    process.env[key] = value;
  }

  return deploymentEnv;
}

function syncRootEnvMetadata(rootEnvPath, payload) {
  const desiredEntries = [
    ['MISSION_CONTROL_VERSION', payload.version],
    ['MISSION_CONTROL_BRANCH', payload.branch ?? ''],
    ['MISSION_CONTROL_COMMIT', payload.commit ?? ''],
    ['MISSION_CONTROL_DEPLOY_REF', payload.ref ?? '']
  ];

  const originalText = readTextFile(rootEnvPath);
  const hasTrailingNewline = !originalText || originalText.endsWith('\n');
  const lines = originalText ? originalText.split(/\r?\n/) : [];
  const seenKeys = new Set();

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) {
      return line;
    }

    const key = match[1];
    const desired = desiredEntries.find(([entryKey]) => entryKey === key);
    if (!desired) {
      return line;
    }

    seenKeys.add(key);
    return `${key}=${desired[1]}`;
  });

  for (const [key, value] of desiredEntries) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  const normalized = nextLines.join('\n');
  const finalText = hasTrailingNewline || !normalized ? `${normalized}\n` : normalized;
  writeFileSync(rootEnvPath, finalText, 'utf8');
}

export function stampDeploymentMetadata(appDir) {
  const repoDir = path.resolve(appDir, '..');
  const deploymentFilePath = path.join(appDir, 'DEPLOYMENT.json');
  const rootEnvPath = path.join(repoDir, '.env');
  const existing = readDeploymentFile(deploymentFilePath);

  const version = readVersion(repoDir)
    ?? cleanValue(existing.version)
    ?? cleanValue(process.env.MISSION_CONTROL_VERSION)
    ?? 'unknown';
  const branch = runGit(repoDir, ['rev-parse', '--abbrev-ref', 'HEAD'])
    ?? cleanValue(existing.branch)
    ?? cleanValue(process.env.MISSION_CONTROL_BRANCH)
    ?? null;
  const commit = runGit(repoDir, ['rev-parse', 'HEAD'])
    ?? cleanValue(existing.commit)
    ?? cleanValue(process.env.MISSION_CONTROL_COMMIT)
    ?? null;
  const ref = runGit(repoDir, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
    ?? branch
    ?? cleanValue(existing.ref);

  const payload = {
    version,
    branch,
    commit,
    ref,
    updatedAt: new Date().toISOString()
  };

  writeFileSync(deploymentFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  if (existsSync(rootEnvPath)) {
    syncRootEnvMetadata(rootEnvPath, payload);
  }
  applyDeploymentEnvironment(payload);
  return payload;
}

export function getDeploymentEnvironment(payload) {
  return {
    MISSION_CONTROL_VERSION: payload.version,
    MISSION_CONTROL_BRANCH: payload.branch ?? '',
    MISSION_CONTROL_COMMIT: payload.commit ?? '',
    MISSION_CONTROL_DEPLOY_REF: payload.ref ?? ''
  };
}