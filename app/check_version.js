const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:3000/sign-in', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="email"]', process.env.OWNER_EMAIL);
  await page.fill('input[type="password"]', process.env.OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/projects', { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  const hasNewVersion = html.includes('Version v0.3 (e9cb9a7)');
  const hasShortCommit = html.includes('e9cb9a7');
  
  console.log('=== Projects Page Results ===');
  console.log('Final URL:', page.url());
  console.log('Has "Version v0.3 (e9cb9a7)":', hasNewVersion);
  console.log('Has short commit "e9cb9a7":', hasShortCommit);
  
  // Find all version-related text
  const versionMatches = html.match(/Version[^<"]{0,50}(v[\d.]+)?[^<"]{0,50}/gi);
  if (versionMatches) {
    console.log('Version matches in HTML:', versionMatches.slice(0, 5));
  }
  
  // Check for commit hash anywhere
  const commitMatch = html.match(/[0-9a-f]{7,40}/g);
  const shortCommit = commitMatch?.find(m => m.length >= 7 && m.length <= 10);
  console.log('Short commit hash found:', shortCommit || 'none');
  
  await browser.close();
})();
