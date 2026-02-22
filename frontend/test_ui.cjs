const puppeteer = require('puppeteer');

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();

    // Test 1: Home Page
    console.log("Navigating to Home Page...");
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000)); // wait for animations
    await page.screenshot({ path: 'home-premium.png' });
    console.log("Saved home-premium.png");

    // Test 2: Resident Login
    console.log("Clicking Access Resident Portal...");
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('a[href="/resident/login"]')
    ]);
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'login-premium.png' });
    console.log("Saved login-premium.png");

    // Test 3: Resident Dashboard
    console.log("Submitting login form...");
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'dashboard-premium.png', fullPage: true });
    console.log("Saved dashboard-premium.png");

    await browser.close();
})();
