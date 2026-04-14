import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const outDir = path.resolve(process.cwd(), "artifacts");
const outPath = path.join(outDir, "live-ui-my-tasks.png");

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
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

try {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  const signInResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/auth/sign-in') && response.request().method() === 'POST',
    { timeout: 15000 }
  );
  await page.getByRole('button', { name: /continue to workspace/i }).click();
  const signInResponse = await signInResponsePromise;

  if (!signInResponse.ok()) {
    const payload = await signInResponse.text().catch(() => "");
    throw new Error(`Sign-in failed with ${signInResponse.status()}: ${payload}`);
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  if (!page.url().includes('/my-tasks')) {
    await page.goto(`${baseUrl}/my-tasks`, { waitUntil: "networkidle" });
  }
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(JSON.stringify({ ok: true, path: outPath, url: page.url(), title: await page.title() }));
} finally {
  await browser.close();
}
