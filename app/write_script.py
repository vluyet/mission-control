import sys
content = """const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  try {
    console.log('Navigating to login page...');
    await page.goto('http://127.0.0.1:3001/sign-in', { waitUntil: 'networkidle' });
    
    console.log('Logging in...');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/projects') || url.pathname === '/', { timeout: 15000 });

    console.log('Navigating to /projects/new...');
    await page.goto('http://127.0.0.1:3001/projects/new', { waitUntil: 'networkidle' });

    console.log('Current URL:', page.url());

    const editorSelector = 'textarea';
    await page.waitForSelector(editorSelector, { timeout: 10000 });
    
    const isDisabled = await page.isDisabled(editorSelector);
    const fontFamily = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return window.getComputedStyle(el).fontFamily;
    }, editorSelector);

    console.log('Typing "hello"...');
    await page.click(editorSelector);
    await page.type(editorSelector, 'hello');
    const value = await page.inputValue(editorSelector);

    console.log('Results:');
    console.log('- Typing succeeded:', value.includes('hello'));
    console.log('- Is textarea disabled:', isDisabled);
    console.log('- Computed font-family:', fontFamily);

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'failure.png' });
  } finally {
    await browser.close();
  }
})();
"""
with open('verify-fix.js', 'w') as f:
    f.write(content)
