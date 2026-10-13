import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

// Credentials from environment variables
const email = process.env.LIGHTHOUSE_TEST_EMAIL;
const password = process.env.LIGHTHOUSE_TEST_PASSWORD;
const baseUrl = process.env.LIGHTHOUSE_BASE_URL || 'https://www.sskbusiness.com';
const targetUrl = `${baseUrl}/chapter-admin/home`;

async function runLighthouseAudit() {
  if (!email || !password) {
    console.error('AUTHENTICATION FAILED: Missing credentials in .env');
    process.exit(1);
  }

  // Launch Playwright
  const browser = await chromium.launch({
    headless: true, // Set to true
    args: ['--remote-debugging-port=9222', '--no-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${baseUrl}/login`);
  
  // Wait for login page
  await page.waitForSelector('input[name="identifier"]');
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);
  
  // Find and click login button
  await page.click('button[type="submit"]');

  // Verify auth
  await page.waitForURL(targetUrl, { timeout: 30000 }).catch(() => {
    console.error('AUTHENTICATION FAILED: Did not redirect to dashboard');
    browser.close();
    process.exit(1);
  });

  console.log('Login successful, authenticated session preserved.');

  // Run Lighthouse
  console.log('Running Lighthouse audit...');
  const chrome = await chromeLauncher.launch({ port: 9222 });
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse(targetUrl, options);
  
  // Generate reports
  const htmlReport = runnerResult.report;
  const reportPath = path.join(process.cwd(), 'lighthouse-reports', 'chapter-admin-report.html');
  
  if (!fs.existsSync(path.join(process.cwd(), 'lighthouse-reports'))) {
      fs.mkdirSync(path.join(process.cwd(), 'lighthouse-reports'));
  }
  
  fs.writeFileSync(reportPath, htmlReport);

  // Print results
  const lhr = runnerResult.lhr;
  console.log(`Lighthouse test URL: ${lhr.finalUrl}`);
  console.log(`Performance: ${lhr.categories.performance.score * 100}`);
  console.log(`Accessibility: ${lhr.categories.accessibility.score * 100}`);
  console.log(`Best Practices: ${lhr.categories['best-practices'].score * 100}`);
  console.log(`SEO: ${lhr.categories.seo.score * 100}`);
  console.log(`FCP: ${lhr.audits['first-contentful-paint'].displayValue}`);
  console.log(`LCP: ${lhr.audits['largest-contentful-paint'].displayValue}`);
  console.log(`TBT: ${lhr.audits['total-blocking-time'].displayValue}`);
  console.log(`CLS: ${lhr.audits['cumulative-layout-shift'].displayValue}`);
  console.log(`Speed Index: ${lhr.audits['speed-index'].displayValue}`);
  console.log(`Report location: ${reportPath}`);

  await browser.close();
  await chrome.kill();
}

runLighthouseAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
