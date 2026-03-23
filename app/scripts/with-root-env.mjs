import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  const env = {};
  if (!existsSync(filePath)) return env;

  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    let value = rest.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key.trim()] = value;
  }
  return env;
}

const [, , ...commandParts] = process.argv;
if (!commandParts.length) {
  console.error("Usage: node scripts/with-root-env.mjs <command> [args...]");
  process.exit(1);
}

const appDir = process.cwd();
const rootEnvPath = path.resolve(appDir, "..", ".env");
const rootEnv = loadEnvFile(rootEnvPath);
const mergedEnv = { ...rootEnv, ...process.env };
const child = spawn(commandParts[0], commandParts.slice(1), {
  stdio: "inherit",
  env: mergedEnv,
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
