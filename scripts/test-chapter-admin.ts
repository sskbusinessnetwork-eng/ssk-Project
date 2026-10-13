import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { chromium, type Browser } from 'playwright';
import lighthouse from 'lighthouse';

dotenv.config({ quiet: true });

const BASE_URL = (process.env.LIGHTHOUSE_BASE_URL || 'https://www.sskbusiness.com').replace(/\/$/, '');
const TARGET_PATH = '/chapter-admin/home';
const TARGET_URL = `${BASE_URL}${TARGET_PATH}`;
const TEST_EMAIL = process.env.LIGHTHOUSE_TEST_EMAIL || process.env.LIGHTHOUSE_TEST_IDENTIFIER || process.env.LIGHTHOUSE_TEST_PHONE || '';
const TEST_PASSWORD = process.env.LIGHTHOUSE_TEST_PASSWORD || '';
const CDP_PORT = 9222;

async function executeAuthenticatedAudit() {
  console.log(`==================================================`);
  console.log(`AUTHENTICATED LIGHTHOUSE AUDIT: CHAPTER ADMIN HOME`);
  console.log(`==================================================`);
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Target Route: ${TARGET_URL}`);
  console.log(`Credentials present: ${Boolean(TEST_EMAIL && TEST_PASSWORD)}`);
  console.log(`Remote CDP Port: ${CDP_PORT}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error(`AUTHENTICATION FAILED: Missing test credentials in environment.`);
    console.error(`Please provide LIGHTHOUSE_TEST_EMAIL and LIGHTHOUSE_TEST_PASSWORD in your .env file.`);
    process.exit(1);
  }

  // Ensure report directories exist
  const reportDir = path.join(process.cwd(), 'lighthouse-reports', 'mobile');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  console.log(`1. Launching Playwright Chromium on CDP port ${CDP_PORT}...`);
  const shellPath = '/root/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
  const executablePath = fs.existsSync(shellPath) ? shellPath : undefined;

  const browser: Browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [`--remote-debugging-port=${CDP_PORT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  try {
    console.log(`2. Navigating to login page: ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 35000 });

    const identifierInput = page.locator('input[name="identifier"], input[id="login-identifier"], input[type="tel"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[id="login-password"], input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await identifierInput.waitFor({ state: 'visible', timeout: 15000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 });

    console.log(`3. Entering test credentials into login form...`);
    await identifierInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    console.log(`4. Submitting login request...`);
    await submitBtn.click();

    // Wait for authentication response
    await page.waitForTimeout(4000);

    console.log(`5. Navigating to Chapter Admin Home: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`6. Verifying active URL after navigation: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.error(`\n[!] AUTHENTICATION FAILED`);
      console.error(`Authentication/session was not preserved. The application redirected back to /login.`);
      await browser.close();
      process.exit(1);
    }

    // Verify dashboard elements are loaded
    const bodyContent = await page.content();
    const hasDashboardContent = bodyContent.includes('Analytics') || bodyContent.includes('Chapter') || bodyContent.includes('Meeting') || bodyContent.includes('Member');

    if (!hasDashboardContent) {
      console.warn(`Warning: Dashboard content check found minimal markers, but URL verified as ${currentUrl}`);
    }

    console.log(`\n==================================================`);
    console.log(`[✓] AUTHENTICATION VERIFIED ON ${TARGET_URL}`);
    console.log(`Keeping browser session open and connecting Lighthouse to CDP port ${CDP_PORT}...`);
    console.log(`==================================================\n`);

    // Run Lighthouse directly on the authenticated page without resetting localStorage/session
    const options = {
      port: CDP_PORT,
      output: ['html', 'json'] as const,
      logLevel: 'error' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      disableStorageReset: true,
      clearStorageTypes: []
    };

    console.log(`Running Lighthouse Mobile audit on ${TARGET_URL}...`);
    const auditResult = await (lighthouse as any)(TARGET_URL, options);
    const lhr = auditResult.lhr;

    const perf = Math.round((lhr.categories.performance?.score || 0) * 100);
    const a11y = Math.round((lhr.categories.accessibility?.score || 0) * 100);
    const bp = Math.round((lhr.categories['best-practices']?.score || 0) * 100);
    const seo = Math.round((lhr.categories.seo?.score || 0) * 100);

    const fcp = lhr.audits['first-contentful-paint']?.displayValue || 'N/A';
    const lcp = lhr.audits['largest-contentful-paint']?.displayValue || 'N/A';
    const tbt = lhr.audits['total-blocking-time']?.displayValue || '0 ms';
    const cls = lhr.audits['cumulative-layout-shift']?.displayValue || '0';
    const speedIndex = lhr.audits['speed-index']?.displayValue || 'N/A';

    const htmlPath = path.join(reportDir, 'chapter_admin_home_mobile.html');
    const jsonPath = path.join(reportDir, 'chapter_admin_home_mobile.json');

    fs.writeFileSync(htmlPath, auditResult.report[0], 'utf-8');
    fs.writeFileSync(jsonPath, auditResult.report[1], 'utf-8');

    console.log(`\n==================================================`);
    console.log(`LIGHTHOUSE MOBILE AUDIT RESULTS`);
    console.log(`==================================================`);
    console.log(`Exact URL Tested: ${lhr.finalDisplayedUrl || TARGET_URL}`);
    console.log(`Performance:    ${perf}`);
    console.log(`Accessibility:  ${a11y}`);
    console.log(`Best Practices: ${bp}`);
    console.log(`SEO:            ${seo}`);
    console.log(`--------------------------------------------------`);
    console.log(`FCP (First Contentful Paint):    ${fcp}`);
    console.log(`LCP (Largest Contentful Paint):  ${lcp}`);
    console.log(`TBT (Total Blocking Time):       ${tbt}`);
    console.log(`CLS (Cumulative Layout Shift):   ${cls}`);
    console.log(`Speed Index:                     ${speedIndex}`);
    console.log(`--------------------------------------------------`);
    console.log(`HTML Report: ${htmlPath}`);
    console.log(`JSON Report: ${jsonPath}`);
    console.log(`==================================================\n`);

    await browser.close();
  } catch (err: any) {
    console.error(`Audit execution encountered an error:`, err.message || err);
    await browser.close();
    process.exit(1);
  }
}

executeAuthenticatedAudit();
