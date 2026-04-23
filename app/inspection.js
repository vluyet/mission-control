const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'e85f1091f4136ae281c53a75917ee35eb131b03d3f54a422');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.goto('http://127.0.0.1:3000/projects/new');
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ timeout: 10000 });
    const containerWithDataMode = page.locator('[data-mode]').first();
    let dataMode = 'not found';
    if (await containerWithDataMode.count() > 0) { dataMode = await containerWithDataMode.getAttribute('data-mode'); }
    const isFocusedBefore = await textarea.evaluate(el => document.activeElement === el);
    await textarea.click({ force: true });
    const isFocusedAfter = await textarea.evaluate(el => document.activeElement === el);
    await textarea.fill('hello');
    const value = await textarea.inputValue();
    const fontFamily = await textarea.evaluate(el => window.getComputedStyle(el).fontFamily);
    const textareaDims = await textarea.evaluate(el => ({ h: el.clientHeight, w: el.clientWidth }));
    const wrapper = page.locator('div:has(> textarea)').first();
    const wrapperDims = await wrapper.evaluate(el => ({ h: el.clientHeight, w: el.clientWidth }));
    console.log(JSON.stringify({ isFocused: isFocusedAfter, valueCorrect: value.includes('hello'), dataMode, fontFamily, textareaDims, wrapperDims }));
  } catch (err) { console.error(err); } finally { await browser.close(); }
})();
