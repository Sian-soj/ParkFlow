const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQ_FAIL:', request.url(), request.failure()?.errorText));

    console.log("Navigating to login page directly...");
    await page.goto('http://localhost:5173/resident/login');

    console.log("Clicking Sign In...");
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);

    console.log('Current URL:', page.url());

    // Check localStorage
    const user = await page.evaluate(() => localStorage.getItem('parkflow_user'));
    console.log('Stored User:', user);

    await browser.close();
})();
