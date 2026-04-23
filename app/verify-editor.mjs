import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to sign-in...');
    await page.goto('http://127.0.0.1:3001/sign-in', { waitUntil: 'networkidle' });
    
    console.log('Filling credentials...');
    await page.locator('input[type="email"], input[name="email"]').fill('owner@example.com');
    await page.locator('input[type="password"], input[name="password"]').fill('e85f1091f4136ae281c53a75917ee35eb131b03d3f54a422');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    console.log('Login complete, URL:', page.url());
    
    await page.goto('http://127.0.0.1:3001/projects/new', { waitUntil: 'networkidle' });
    console.log('At /projects/new, URL:', page.url());
    
    // Wait for something more than just a DIV
    await page.waitForSelector('textarea, [contenteditable="true"], .monaco-editor', { timeout: 15000 }).catch(e => console.log('Timeout waiting for editor element...'));
    
    const elements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).map(el => el.tagName).filter((v, i, a) => a.indexOf(v) === i);
    });
    console.log('Tags on page:', elements.join(', '));
    
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
        console.log('Found textarea');
        await textarea.scrollIntoViewIfNeeded();
        await textarea.click();
        await page.keyboard.type('hello');
        
        const results = await textarea.evaluate((el) => {
          const computedStyle = window.getComputedStyle(el);
          const container = el.closest('[data-mode]') || el.closest('.overtype-container'); // Check containers
          return {
            typed: el.value.includes('hello'),
            disabled: el.disabled,
            fontFamily: computedStyle.fontFamily,
            mode: container ? container.getAttribute('data-mode') : 'none'
          };
        });
        fs.writeFileSync('verify-results.json', JSON.stringify(results, null, 2));
    } else {
        console.log('No textarea still. Printing HTML snippet:');
        const html = await page.content();
        console.log(html.slice(0, 500));
    }
    
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
