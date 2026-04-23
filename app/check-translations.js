const { chromium } = require("playwright");
const fs = require("fs");

const envContent = fs.readFileSync("/opt/mission-control/.env", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const email = envVars.OWNER_EMAIL;
const password = envVars.OWNER_PASSWORD;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  await context.addCookies([{
    name: "mission_control_locale",
    value: "fr",
    domain: "127.0.0.1",
    path: "/"
  }]);
  
  const page = await context.newPage();
  
  try {
    await page.goto("http://127.0.0.1:3000/sign-in", { waitUntil: "networkidle" });
    await page.waitForSelector("input", { timeout: 10000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/projects", { timeout: 15000 });
    
    await page.goto("http://127.0.0.1:3000/projects", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    
    const projectLinks = await page.$$eval('a[href*="/projects/"]', els => els.map(e => e.getAttribute("href")));
    let projectSlug = null;
    for (const href of projectLinks) {
      const match = href.match(/\/projects\/([a-z0-9-]+)\/view/);
      if (match) { projectSlug = match[1]; break; }
    }
    
    if (projectSlug) {
      console.log("=== /projects/" + projectSlug + "/view ===\n");
      await page.goto("http://127.0.0.1:3000/projects/" + projectSlug + "/view", { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      
      const uiText = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('button, [role="tab"], h1, h2, h3, label, th').forEach(el => {
          const text = el.innerText.trim();
          if (text && text.length > 0 && text.length < 60) results.push({ el: el.tagName, text });
        });
        return results;
      });
      
      const seen = new Set();
      for (const item of uiText) {
        if (seen.has(item.text)) continue;
        seen.add(item.text);
        console.log("  [" + item.el + "] " + item.text);
      }
    }
    
    const taskLinks = await page.$$eval('a[href*="/tasks/"]', els => els.map(e => e.getAttribute("href")));
    let taskId = null;
    for (const href of taskLinks) {
      const match = href.match(/\/tasks\/(\d+)/);
      if (match) { taskId = match[1]; break; }
    }
    
    if (taskId) {
      console.log("\n=== /tasks/" + taskId + " ===\n");
      await page.goto("http://127.0.0.1:3000/tasks/" + taskId, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      
      const uiText = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('button, [role="tab"], h1, h2, h3, label').forEach(el => {
          const text = el.innerText.trim();
          if (text && text.length > 0 && text.length < 60) results.push({ el: el.tagName, text });
        });
        return results;
      });
      
      const seen = new Set();
      for (const item of uiText) {
        if (seen.has(item.text)) continue;
        seen.add(item.text);
        console.log("  [" + item.el + "] " + item.text);
      }
    }
    
  } catch (err) {
    console.log("Error:", err.message);
  } finally {
    await browser.close();
  }
})();
