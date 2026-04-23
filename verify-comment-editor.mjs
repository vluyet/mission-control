import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  try {
    const envContent = fs.readFileSync('/opt/mission-control/.env', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      if (line.includes('=')) {
        const [key, ...value] = line.split('=');
        env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
      }
    });

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to sign-in...');
    await page.goto('http://127.0.0.1:3000/sign-in');
    
    if (page.url().includes('/sign-in')) {
      await page.fill('input[name="email"]', env.OWNER_EMAIL || 'admin@example.com');
      await page.fill('input[name="password"]', env.OWNER_PASSWORD || 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL(url => !url.href.includes('/sign-in'));
    }

    console.log('Navigating to my tasks...');
    await page.goto('http://127.0.0.1:3000/my-tasks');
    await page.waitForSelector('a[href^="/tasks/"]', { timeout: 10000 });
    const firstTaskLink = await page.getAttribute('a[href^="/tasks/"]', 'href');
    
    console.log('Navigating to task: ' + firstTaskLink);
    await page.goto('http://127.0.0.1:3000' + firstTaskLink);

    const editorWrapper = page.locator('[data-testid="task-comment-markdown-editor"]');
    await editorWrapper.waitFor({ state: 'visible' });

    const textarea = editorWrapper.locator('textarea');
    
    await textarea.click();
    const isFocused = await textarea.evaluate(el => document.activeElement === el);
    const isDisabled = await textarea.isDisabled();

    const placeholderStyles = await textarea.evaluate(el => {
      const style = window.getComputedStyle(el, '::placeholder');
      return { color: style.color, opacity: style.opacity };
    });

    const dataMode = await editorWrapper.locator('xpath=./ancestor-or-self::*[contains(@class, "overtype-container")]').getAttribute('data-mode');

    const visibleOvertypePlaceholders = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.overtype-placeholder'));
      return els.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
      }).length;
    });

    console.log(JSON.stringify({
      isFocused,
      isDisabled,
      placeholderStyles,
      dataMode,
      visibleOvertypePlaceholders
    }, null, 2));

    await browser.close();
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
})();
