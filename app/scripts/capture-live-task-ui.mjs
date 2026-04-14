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
  const signInResponsePromise = page
    .waitForResponse(
      (response) => response.url().includes("/api/auth/sign-in") && response.request().method() === "POST",
      { timeout: 15000 }
    )
    .catch(() => null);

  await page.getByRole("button", { name: /continue to workspace/i }).click();
  const signInResponse = await signInResponsePromise;

  if (signInResponse && !signInResponse.ok()) {
    const payload = await signInResponse.text().catch(() => "");
    throw new Error(`Sign-in failed with ${signInResponse.status()}: ${payload}`);
  }

  await page.waitForLoadState("networkidle");
  if (page.url().includes("/sign-in")) {
    await page.goto(`${baseUrl}/my-tasks`, { waitUntil: "networkidle" });
  }

  await page.goto(`${baseUrl}/tasks/${encodeURIComponent(taskId)}`, { waitUntil: "networkidle" });
  await page.waitForURL((url) => url.pathname === `/tasks/${taskId}` || url.pathname === "/sign-in", { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  const signInHeading = page.getByRole("heading", { name: /sign in/i }).first();

  if (await signInHeading.isVisible().catch(() => false)) {
    throw new Error(`Task page validation fell back to sign-in for ${taskId}: ${page.url()}`);
  }

  const taskWorkspaceId = page.getByTestId("task-workspace-id").first();
  const taskWorkspaceTitle = page.getByTestId("task-workspace-title").first();
  await taskWorkspaceId.waitFor({ state: "visible", timeout: 15000 });
  await taskWorkspaceTitle.waitFor({ state: "visible", timeout: 15000 });

  const renderedTaskId = (await taskWorkspaceId.textContent())?.trim();
  if (renderedTaskId !== taskId) {
    throw new Error(`Task page validation reached ${page.url()} but rendered task id was ${JSON.stringify(renderedTaskId)} instead of ${JSON.stringify(taskId)}`);
  }

  await page.screenshot({ path: outPath, fullPage: true });

  console.log(JSON.stringify({ ok: true, taskId, path: outPath, url: page.url(), title: await page.title() }));
} finally {
  await browser.close();
}
