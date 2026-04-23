import { chromium } from 'playwright';
import fs from 'fs';

async function getEditorData(page, selector) {
  try {
    const textarea = page.locator(selector).first();
    const container = page.locator('.overtype-container').filter({ has: textarea }).first();
    
    await textarea.click();
    const focusedAfterClick = await textarea.evaluate(el => document.activeElement === el);
    const disabled = await textarea.isDisabled();
    const dataMode = await container.getAttribute('data-mode').catch(() => null);
    
    const styles = await textarea.evaluate(el => {
      const style = window.getComputedStyle(el, '::placeholder');
      return {
        color: style ? style.color : null,
        opacity: style ? style.opacity : null
      };
    }).catch(() => ({color: null, opacity: null}));

    const shimsCount = await page.locator('.overtype-placeholder').evaluateAll(els => {
      return els.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0;
      }).length;
    });

    const bothVisible = parseFloat(styles.opacity) > 0 && shimsCount > 0;

    return {
      focusedAfterClick,
      disabled,
      dataMode,
      placeholderColor: styles.color,
      placeholderOpacity: styles.opacity,
      visibleShimCount: shimsCount,
      bothVisible
    };
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const env = fs.readFileSync('/opt/mission-control/.env', 'utf8');
  const email = env.match(/^OWNER_EMAIL=(.*)$/m)?.[1];
  const password = env.match(/^OWNER_PASSWORD=(.*)$/m)?.[1];

  try {
    await page.goto('http://127.0.0.1:3000/sign-in', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname === '/', { timeout: 10000 });

    const results = {};

    await page.goto('http://127.0.0.1:3000/projects/new', { waitUntil: 'networkidle' });
    results.projectsNew = await getEditorData(page, 'textarea');

    await page.goto('http://127.0.0.1:3000/my-tasks', { waitUntil: 'networkidle' });
    const taskLink = await page.getAttribute('a[href^="/tasks/"]', 'href');
    if (taskLink) {
      await page.goto(`http://127.0.0.1:3000${taskLink}`, { waitUntil: 'networkidle' });
      results.taskComment = await getEditorData(page, 'textarea');
    } else {
      results.taskComment = "No task found";
    }

    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
