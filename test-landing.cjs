const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
    const title = await page.title();
    console.log("Title:", title);
    
    // Check if LandingPage text is there
    const content = await page.evaluate(() => document.body.innerText);
    console.log('CONTENT START:', content.substring(0, 150));
  } catch (e) {
    console.log("Exception:", e);
  }
  
  await browser.close();
})();
