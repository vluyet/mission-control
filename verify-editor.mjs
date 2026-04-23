import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
        console.log('Navigating' );
        await page.goto('http://localhost:3000/sign-in');
        
        // Wait for any input and fill it
        const inputs = await page.$$('input');
        for (const input of inputs) {
            const type = await input.getAttribute('type');
            if (type === 'email' || type === 'text') await input.fill('admin@example.com');
            if (type === 'password') await input.fill('password');
        }
        
        await page.click('button[type="submit"]');
        await page.waitForURL(url => !url.href.includes('sign-in'), { timeout: 10000 });

        await page.goto('http://localhost:3000/projects/new');
        
        await page.waitForSelector('textarea', { timeout: 15000 });
        const selector = 'textarea';

        let typingSucceeded = false;
        try {
            await page.focus(selector);
            await page.keyboard.type('hello');
            const val = await page.$eval(selector, el => el.value);
            typingSucceeded = val.trim() === 'hello';
        } catch (e) {
            typingSucceeded = false;
        }

        const isDisabled = await page.$eval(selector, el => el.disabled);
        const fontFamily = await page.$eval(selector, el => getComputedStyle(el).fontFamily);

        console.log('RESULT_START');
        console.log(JSON.stringify({
            typingSucceeded,
            isDisabled,
            fontFamily
        }));
        console.log('RESULT_END');

    } catch (err) {
        console.error('Error during execution:', err);
    } finally {
        await browser.close();
    }
})();
