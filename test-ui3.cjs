const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('user', JSON.stringify({
      uid: "test-uid",
      phone: "123",
      profile: {
        role: "CHAPTER_ADMIN",
        name: "Test User",
        chapterId: "test-chapter",
        subscription_status: "Active",
        passwordChanged: true,
        mustChangePassword: false
      }
    }));
  });

  await page.goto('http://127.0.0.1:3000/dashboard', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
