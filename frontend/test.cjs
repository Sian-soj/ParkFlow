const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQ_FAIL:', request.url(), request.failure().errorText));

    console.log("Navigating to home page...");
    await page.goto('http://localhost:5173');

    console.log("Clicking on /resident link...");
    await page.waitForSelector('a[href="/resident"]');

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('a[href="/resident"]')
    ]);

    console.log('Current URL:', page.url());

    await new Promise(r => setTimeout(r, 2000));

    await browser.close();
})();
