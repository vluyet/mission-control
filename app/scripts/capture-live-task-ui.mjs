import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const taskId = process.env.MC_TASK_ID || process.argv[2];

if (!taskId) {
  throw new Error("Missing task id. Pass one as argv[2] or set MC_TASK_ID.");
}

const outDir = path.resolve(process.cwd(), "artifacts");
const outPath = path.join(outDir, `live-task-${taskId}.png`);

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    values[key.trim()] = rest.join("=").trim();
  }
  return values;
}

const runtimeEnvPath = path.resolve(process.cwd(), "..", ".env");
const runtimeEnv = parseEnv(await fs.readFile(runtimeEnvPath, "utf8"));
const email = process.env.MC_OWNER_EMAIL || process.env.OWNER_EMAIL || runtimeEnv.MC_OWNER_EMAIL || runtimeEnv.OWNER_EMAIL;
const password = process.env.MC_OWNER_PASSWORD || process.env.OWNER_PASSWORD || runtimeEnv.MC_OWNER_PASSWORD || runtimeEnv.OWNER_PASSWORD;

if (!email || !password) {
  throw new Error(`Missing owner credentials in runtime env: ${runtimeEnvPath}`);
}

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

try {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  let signInResponse = null;
  page.on("response", (response) => {
    if (!signInResponse && response.url().includes("/api/auth/sign-in") && response.request().method() === "POST") {
      signInResponse = response;
    }
  });

  await page.getByRole("button", { name: /continue to workspace/i }).click();
  await page.waitForLoadState("networkidle");

  if (signInResponse && !signInResponse.ok()) {
    const payload = await signInResponse.text().catch(() => "");
    throw new Error(`Sign-in failed with ${signInResponse.status()}: ${payload}`);
  }

  if (page.url().includes("/sign-in")) {
    await page.goto(`${baseUrl}/my-tasks`, { waitUntil: "networkidle" });
  }

  await page.goto(`${baseUrl}/tasks/${encodeURIComponent(taskId)}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(JSON.stringify({ ok: true, taskId, path: outPath, url: page.url(), title: await page.title() }));
} finally {
  await browser.close();
}
