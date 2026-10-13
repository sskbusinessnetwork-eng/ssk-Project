import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { chromium, type Browser, type Page } from 'playwright';
import lighthouse from 'lighthouse';

dotenv.config({ quiet: true });

interface AuditResult {
  route: string;
  name: string;
  access: 'Public' | 'Protected';
  role: string;
  device: 'Mobile' | 'Desktop';
  status: 'PASS' | 'WARN' | 'FAIL' | 'AUTH_FAILED';
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: string;
  lcp: string;
  tbt: string;
  cls: string;
  speedIndex: string;
  unusedJsKiB: number;
  renderBlockingMs: number;
  problems: string[];
  reportHtmlPath: string;
  reportJsonPath: string;
}

const BASE_URL = (process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TEST_EMAIL = process.env.LIGHTHOUSE_TEST_EMAIL || process.env.LIGHTHOUSE_TEST_IDENTIFIER || process.env.LIGHTHOUSE_TEST_PHONE || '';
const TEST_PASSWORD = process.env.LIGHTHOUSE_TEST_PASSWORD || '';
const CDP_PORT = 9222;

const ROUTES_TO_AUDIT = [
  // Primary target first as requested by user
  { path: '/chapter-admin/home', name: 'Chapter Admin Home', access: 'Protected', role: 'CHAPTER_ADMIN' },
  { path: '/analytics', name: 'Analytics Dashboard', access: 'Protected', role: 'All Authenticated' },
  { path: '/member/home', name: 'Member Home', access: 'Protected', role: 'MEMBER' },
  { path: '/meetings', name: 'Chapter Meetings', access: 'Protected', role: 'All Authenticated' },
  { path: '/activity', name: 'Activity & Referrals', access: 'Protected', role: 'All Authenticated' },
  { path: '/wallet', name: 'Digital Wallet', access: 'Protected', role: 'MEMBER' },
  { path: '/guests', name: 'Guests Hub', access: 'Protected', role: 'All Authenticated' },
  { path: '/one-to-one', name: '1-to-1 Meetings', access: 'Protected', role: 'MEMBER' },
  { path: '/directory', name: 'Member Directory', access: 'Protected', role: 'All Authenticated' },
  { path: '/reports', name: 'Chapter Reports', access: 'Protected', role: 'CHAPTER_ADMIN' },
  { path: '/profile', name: 'Profile Settings', access: 'Protected', role: 'All Authenticated' },
  
  // Public Routes
  { path: '/', name: 'Landing Page', access: 'Public', role: 'Public' },
  { path: '/login', name: 'Login Page', access: 'Public', role: 'Public' },
  { path: '/register', name: 'Register Page', access: 'Public', role: 'Public' },
];

function ensureDirectories() {
  const dirs = [
    'lighthouse-reports',
    'lighthouse-reports/mobile',
    'lighthouse-reports/desktop',
    'lighthouse-reports/public',
    'lighthouse-reports/authenticated',
    'lighthouse-reports/summary'
  ];
  for (const d of dirs) {
    const full = path.join(process.cwd(), d);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
    }
  }
}

async function loginWithPlaywright(page: Page): Promise<{ success: boolean; message: string; role?: string }> {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return {
      success: false,
      message: 'No credentials found in environment. Please set LIGHTHOUSE_TEST_EMAIL and LIGHTHOUSE_TEST_PASSWORD in .env file.'
    };
  }

  console.log(`\n==================================================`);
  console.log(`STEP: AUTHENTICATION FLOW`);
  console.log(`Target: ${BASE_URL}/login`);
  console.log(`User: ${TEST_EMAIL}`);
  console.log(`==================================================\n`);

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 25000 });

    // Wait for the login form inputs to be ready
    const identifierInput = page.locator('input[name="identifier"], input[id="login-identifier"], input[type="tel"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[id="login-password"], input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await identifierInput.waitFor({ state: 'visible', timeout: 10000 });
    await identifierInput.fill(TEST_EMAIL);

    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(TEST_PASSWORD);

    console.log('Credentials entered. Submitting login request...');
    await submitBtn.click();

    // Wait for navigation or authentication token to populate in localStorage
    await page.waitForTimeout(3000);

    // Check current URL and session
    const currentUrl = page.url();
    const localStorageData = await page.evaluate(() => {
      return {
        hasSupabaseToken: Object.keys(localStorage).some(k => k.includes('auth-token') || k.includes('supabase') || k.includes('user')),
        userProfile: localStorage.getItem('ssk_user_profile') || localStorage.getItem('user_profile')
      };
    });

    if (currentUrl.includes('/login') && !localStorageData.hasSupabaseToken) {
      // Check for on-screen error banner
      const errorText = await page.locator('.text-red-400, .bg-red-950, [role="alert"]').innerText().catch(() => '');
      return {
        success: false,
        message: `Authentication failed: ${errorText || 'Invalid credentials or login rejected by server.'}`
      };
    }

    // Verify session persistence by navigating to /chapter-admin/home
    await page.goto(`${BASE_URL}/chapter-admin/home`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    const verifiedUrl = page.url();
    if (verifiedUrl.includes('/login')) {
      return {
        success: false,
        message: 'Authentication/session was not preserved. Navigating to /chapter-admin/home redirected back to /login.'
      };
    }

    console.log(`AUTHENTICATION SUCCESSFUL!`);
    console.log(`Active Authenticated URL: ${verifiedUrl}\n`);
    return {
      success: true,
      message: 'Successfully authenticated and session preserved.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Authentication attempt failed: ${err.message || err}`
    };
  }
}

async function runLighthouseAudit(
  url: string,
  device: 'Mobile' | 'Desktop'
): Promise<any> {
  const isMobile = device === 'Mobile';
  const config = isMobile
    ? undefined // Default Lighthouse mobile preset
    : {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0
          }
        }
      };

  const options = {
    port: CDP_PORT,
    output: ['html', 'json'] as const,
    logLevel: 'error' as const,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  };

  const runnerResult = await (lighthouse as any)(url, options, config);
  return runnerResult;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

async function main() {
  console.log(`==================================================`);
  console.log(`SSK BUSINESS NETWORK — FULL LIGHTHOUSE AUDIT SYSTEM`);
  console.log(`==================================================`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Remote CDP Port: ${CDP_PORT}`);
  console.log(`Audit Timestamp: ${new Date().toISOString()}`);

  ensureDirectories();

  // Launch Playwright Chromium with remote debugging port so Lighthouse can audit the exact same session
  console.log(`\nLaunching Chromium instance with CDP port ${CDP_PORT}...`);
  const browser: Browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${CDP_PORT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let isAuthenticated = false;
  if (TEST_EMAIL && TEST_PASSWORD) {
    const authResult = await loginWithPlaywright(page);
    isAuthenticated = authResult.success;
    if (!isAuthenticated) {
      console.error(`\n[!] AUTHENTICATION FAILED`);
      console.error(`Reason: ${authResult.message}`);
      console.warn(`Continuing audit for Public pages only.\n`);
    }
  } else {
    console.warn(`\n[NOTICE] No LIGHTHOUSE_TEST_EMAIL provided in .env.`);
    console.warn(`Testing public routes. To test protected routes (/chapter-admin/home, etc.), specify LIGHTHOUSE_TEST_EMAIL and LIGHTHOUSE_TEST_PASSWORD in your .env file.\n`);
  }

  const results: AuditResult[] = [];

  for (const routeObj of ROUTES_TO_AUDIT) {
    const fullUrl = `${BASE_URL}${routeObj.path}`;
    const isProtected = routeObj.access === 'Protected';

    if (isProtected && !isAuthenticated) {
      console.log(`Skipping protected route ${routeObj.path} (Unauthenticated).`);
      continue;
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`Auditing: ${routeObj.name} (${routeObj.path})`);
    console.log(`Access: ${routeObj.access} | Required Role: ${routeObj.role}`);
    console.log(`--------------------------------------------------`);

    // Verify page in browser first to ensure it does not bounce to /login
    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1500);

      const resolvedUrl = page.url();
      if (isProtected && resolvedUrl.includes('/login')) {
        console.error(`[!] AUTHENTICATION FAILED on ${routeObj.path}: Redirected to /login. Skipping Lighthouse audit.`);
        for (const dev of ['Mobile', 'Desktop'] as const) {
          results.push({
            route: routeObj.path,
            name: routeObj.name,
            access: routeObj.access as 'Protected',
            role: routeObj.role,
            device: dev,
            status: 'AUTH_FAILED',
            performance: 0,
            accessibility: 0,
            bestPractices: 0,
            seo: 0,
            fcp: 'N/A',
            lcp: 'N/A',
            tbt: 'N/A',
            cls: 'N/A',
            speedIndex: 'N/A',
            unusedJsKiB: 0,
            renderBlockingMs: 0,
            problems: ['Authentication/session was not preserved. Page redirected to /login.'],
            reportHtmlPath: '',
            reportJsonPath: ''
          });
        }
        continue;
      }
    } catch (navErr: any) {
      console.error(`Navigation error on ${routeObj.path}:`, navErr.message);
    }

    // Run Mobile & Desktop audits
    for (const device of ['Mobile', 'Desktop'] as const) {
      console.log(`Running ${device} Lighthouse audit on ${routeObj.path}...`);
      try {
        const auditOutput = await runLighthouseAudit(fullUrl, device);
        const lhr = auditOutput.lhr;

        const perfScore = Math.round((lhr.categories.performance?.score || 0) * 100);
        const a11yScore = Math.round((lhr.categories.accessibility?.score || 0) * 100);
        const bpScore = Math.round((lhr.categories['best-practices']?.score || 0) * 100);
        const seoScore = Math.round((lhr.categories.seo?.score || 0) * 100);

        const fcp = lhr.audits['first-contentful-paint']?.displayValue || 'N/A';
        const lcp = lhr.audits['largest-contentful-paint']?.displayValue || 'N/A';
        const tbt = lhr.audits['total-blocking-time']?.displayValue || '0 ms';
        const cls = lhr.audits['cumulative-layout-shift']?.displayValue || '0';
        const speedIndex = lhr.audits['speed-index']?.displayValue || 'N/A';

        // Extract problems and optimization opportunities
        const problems: string[] = [];
        const unusedJsBytes = lhr.audits['unused-javascript']?.details?.overallSavingsBytes || 0;
        const unusedJsKiB = Math.round(unusedJsBytes / 1024);
        if (unusedJsKiB > 20) problems.push(`Unused JavaScript: ~${unusedJsKiB} KiB estimated savings`);

        const renderBlockingMs = lhr.audits['render-blocking-resources']?.details?.overallSavingsMs || 0;
        if (renderBlockingMs > 50) problems.push(`Render-blocking resources: ~${renderBlockingMs} ms potential savings`);

        const lcpNumeric = lhr.audits['largest-contentful-paint']?.numericValue || 0;
        if (lcpNumeric > 2500) problems.push(`LCP is ${lcp} (Target: < 2.5s)`);

        const fcpNumeric = lhr.audits['first-contentful-paint']?.numericValue || 0;
        if (fcpNumeric > 1800) problems.push(`FCP is ${fcp} (Target: < 1.8s)`);

        // Save individual HTML and JSON reports
        const safeName = sanitizeFileName(`${routeObj.name}_${device}`);
        const htmlFileName = `report_${safeName}.html`;
        const jsonFileName = `report_${safeName}.json`;

        const deviceFolder = device.toLowerCase();
        const htmlRelPath = path.join('lighthouse-reports', deviceFolder, htmlFileName);
        const jsonRelPath = path.join('lighthouse-reports', deviceFolder, jsonFileName);

        fs.writeFileSync(path.join(process.cwd(), htmlRelPath), auditOutput.report[0], 'utf-8');
        fs.writeFileSync(path.join(process.cwd(), jsonRelPath), auditOutput.report[1], 'utf-8');

        // Copy to public / authenticated categories
        const catFolder = isProtected ? 'authenticated' : 'public';
        fs.writeFileSync(path.join(process.cwd(), 'lighthouse-reports', catFolder, htmlFileName), auditOutput.report[0], 'utf-8');

        const status = perfScore >= 80 ? 'PASS' : perfScore >= 60 ? 'WARN' : 'FAIL';

        results.push({
          route: routeObj.path,
          name: routeObj.name,
          access: routeObj.access as 'Public' | 'Protected',
          role: routeObj.role,
          device,
          status,
          performance: perfScore,
          accessibility: a11yScore,
          bestPractices: bpScore,
          seo: seoScore,
          fcp,
          lcp,
          tbt,
          cls,
          speedIndex,
          unusedJsKiB,
          renderBlockingMs,
          problems,
          reportHtmlPath: htmlRelPath,
          reportJsonPath: jsonRelPath
        });

        console.log(`[✓] ${device} Result: Perf ${perfScore} | A11y ${a11yScore} | BP ${bpScore} | SEO ${seoScore} | LCP: ${lcp}`);
      } catch (auditErr: any) {
        console.error(`[X] Lighthouse audit failed on ${routeObj.path} (${device}):`, auditErr.message);
      }
    }
  }

  await browser.close();

  // Generate full HTML and Markdown reports
  generateFullMarkdownReport(results);
  generateFullHtmlReport(results);

  printConsoleSummary(results);
}

function printConsoleSummary(results: AuditResult[]) {
  const mobileResults = results.filter(r => r.device === 'Mobile' && r.status !== 'AUTH_FAILED');
  const desktopResults = results.filter(r => r.device === 'Desktop' && r.status !== 'AUTH_FAILED');
  const authFailures = results.filter(r => r.status === 'AUTH_FAILED');

  const avgMobPerf = mobileResults.length > 0 ? Math.round(mobileResults.reduce((a, b) => a + b.performance, 0) / mobileResults.length) : 0;
  const avgDeskPerf = desktopResults.length > 0 ? Math.round(desktopResults.reduce((a, b) => a + b.performance, 0) / desktopResults.length) : 0;

  const needingImprovement = results.filter(r => r.performance < 80 && r.status !== 'AUTH_FAILED').length;

  console.log(`\n==================================================`);
  console.log(`FULL LIGHTHOUSE AUDIT COMPLETE`);
  console.log(`==================================================`);
  console.log(`Total audits executed: ${results.length}`);
  console.log(`Mobile Average Performance: ${avgMobPerf}`);
  console.log(`Desktop Average Performance: ${avgDeskPerf}`);
  console.log(`Pages needing improvement: ${needingImprovement}`);
  console.log(`Authentication failures: ${authFailures.length}`);
  console.log(`\nReports saved to:`);
  console.log(`  - HTML Dashboard: LIGHTHOUSE_FULL_PROJECT_REPORT.html`);
  console.log(`  - Markdown Report: LIGHTHOUSE_FULL_PROJECT_REPORT.md`);
  console.log(`  - Detailed reports folder: lighthouse-reports/\n`);
}

function generateFullMarkdownReport(results: AuditResult[]) {
  const total = results.length;
  const publicCount = results.filter(r => r.access === 'Public').length;
  const protectedCount = results.filter(r => r.access === 'Protected').length;
  const authFails = results.filter(r => r.status === 'AUTH_FAILED').length;

  const mobileResults = results.filter(r => r.device === 'Mobile' && r.status !== 'AUTH_FAILED');
  const desktopResults = results.filter(r => r.device === 'Desktop' && r.status !== 'AUTH_FAILED');

  const avg = (arr: AuditResult[], key: keyof AuditResult) =>
    arr.length > 0 ? Math.round(arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length) : 0;

  let md = `# SSK Business Network — Full Lighthouse Audit Report\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}  \n`;
  md += `**Target Base URL:** ${BASE_URL}  \n\n`;

  md += `## OVERALL SUMMARY\n\n`;
  md += `- **Total pages tested:** ${total / 2}\n`;
  md += `- **Public pages:** ${publicCount / 2}\n`;
  md += `- **Protected pages:** ${protectedCount / 2}\n`;
  md += `- **Failed authentication pages:** ${authFails / 2}\n\n`;

  md += `## MOBILE SUMMARY\n\n`;
  md += `- **Average Performance:** ${avg(mobileResults, 'performance')}\n`;
  md += `- **Average Accessibility:** ${avg(mobileResults, 'accessibility')}\n`;
  md += `- **Average Best Practices:** ${avg(mobileResults, 'bestPractices')}\n`;
  md += `- **Average SEO:** ${avg(mobileResults, 'seo')}\n\n`;

  md += `## DESKTOP SUMMARY\n\n`;
  md += `- **Average Performance:** ${avg(desktopResults, 'performance')}\n`;
  md += `- **Average Accessibility:** ${avg(desktopResults, 'accessibility')}\n`;
  md += `- **Average Best Practices:** ${avg(desktopResults, 'bestPractices')}\n`;
  md += `- **Average SEO:** ${avg(desktopResults, 'seo')}\n\n`;

  md += `## PAGE-BY-PAGE AUDIT RESULTS\n\n`;
  md += `| Page | Route | Access | Device | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | Status |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    md += `| ${r.name} | \`${r.route}\` | ${r.access} | ${r.device} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.fcp} | ${r.lcp} | ${r.tbt} | ${r.status} |\n`;
  }

  md += `\n## IDENTIFIED PERFORMANCE ISSUES & RECOMMENDATIONS\n\n`;
  const problemResults = results.filter(r => r.problems.length > 0);
  if (problemResults.length === 0) {
    md += `All audited pages meet high performance standards.\n`;
  } else {
    for (const r of problemResults) {
      md += `### ${r.name} (${r.device})\n`;
      md += `- **Route:** \`${r.route}\` (${r.access})\n`;
      md += `- **Performance Score:** ${r.performance}/100\n`;
      md += `- **Issues:**\n`;
      for (const p of r.problems) {
        md += `  - ${p}\n`;
      }
      md += `\n`;
    }
  }

  fs.writeFileSync(path.join(process.cwd(), 'LIGHTHOUSE_FULL_PROJECT_REPORT.md'), md, 'utf-8');
}

function generateFullHtmlReport(results: AuditResult[]) {
  const total = results.length;
  const mobileResults = results.filter(r => r.device === 'Mobile' && r.status !== 'AUTH_FAILED');
  const desktopResults = results.filter(r => r.device === 'Desktop' && r.status !== 'AUTH_FAILED');

  const avg = (arr: AuditResult[], key: keyof AuditResult) =>
    arr.length > 0 ? Math.round(arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length) : 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSK Business Network — Lighthouse Audit Report</title>
  <style>
    :root {
      --bg: #0B0F19;
      --card-bg: #151C2E;
      --card-border: #232D42;
      --text: #F8FAFC;
      --text-dim: #94A3B8;
      --primary: #FF6321;
      --emerald: #10B981;
      --amber: #F59E0B;
      --red: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header { margin-bottom: 32px; border-bottom: 1px solid var(--card-border); padding-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 800; color: #FFF; margin-bottom: 8px; }
    .subtitle { color: var(--text-dim); font-size: 14px; }
    .grid-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
    }
    .card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 8px; }
    .card-value { font-size: 32px; font-weight: 800; color: #FFF; }
    .score-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
    }
    .score-high { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .score-med { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .score-low { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 13px;
    }
    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      background: #0E1424;
      color: var(--text-dim);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .tag-protected { background: rgba(99, 102, 241, 0.15); color: #818CF8; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .tag-public { background: rgba(16, 185, 129, 0.15); color: #34D399; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .problem-box {
      margin-top: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
    }
    .problem-item {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .problem-item:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>SSK Business Network — Full Lighthouse Audit Dashboard</h1>
      <p class="subtitle">Automated Mobile & Desktop Performance, Accessibility, Best Practices, and SEO Report</p>
    </header>

    <div class="grid-summary">
      <div class="card">
        <div class="card-title">Mobile Avg Performance</div>
        <div class="card-value" style="color: #34D399;">${avg(mobileResults, 'performance')}</div>
      </div>
      <div class="card">
        <div class="card-title">Desktop Avg Performance</div>
        <div class="card-value" style="color: #34D399;">${avg(desktopResults, 'performance')}</div>
      </div>
      <div class="card">
        <div class="card-title">Accessibility Avg</div>
        <div class="card-value" style="color: #60A5FA;">${avg(mobileResults, 'accessibility')}</div>
      </div>
      <div class="card">
        <div class="card-title">Pages Audited</div>
        <div class="card-value">${total}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; margin-bottom: 16px;">Page-by-Page Audit Table</h2>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Page Name</th>
              <th>Route</th>
              <th>Access</th>
              <th>Device</th>
              <th>Perf</th>
              <th>A11y</th>
              <th>Best Prac</th>
              <th>SEO</th>
              <th>FCP</th>
              <th>LCP</th>
              <th>TBT</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => {
              const badgeClass = r.performance >= 80 ? 'score-high' : r.performance >= 60 ? 'score-med' : 'score-low';
              return `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td><code>${r.route}</code></td>
                <td><span class="${r.access === 'Protected' ? 'tag-protected' : 'tag-public'}">${r.access}</span></td>
                <td>${r.device}</td>
                <td><span class="score-badge ${badgeClass}">${r.performance}</span></td>
                <td>${r.accessibility}</td>
                <td>${r.bestPractices}</td>
                <td>${r.seo}</td>
                <td>${r.fcp}</td>
                <td>${r.lcp}</td>
                <td>${r.tbt}</td>
                <td><span class="score-badge ${r.status === 'PASS' ? 'score-high' : r.status === 'WARN' ? 'score-med' : 'score-low'}">${r.status}</span></td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="problem-box">
      <h2 style="font-size: 18px; margin-bottom: 16px;">Page-by-Page Identified Issues & Improvements</h2>
      ${results.filter(r => r.problems.length > 0).map(r => `
        <div class="problem-item">
          <h3 style="font-size: 15px; font-weight: 700; color: #FFF;">${r.name} (${r.device}) — <span style="color: #F87171;">Score: ${r.performance}</span></h3>
          <p style="font-size: 12px; color: var(--text-dim); margin: 4px 0 8px 0;">Route: <code>${r.route}</code> | Access: ${r.access}</p>
          <ul style="padding-left: 20px; font-size: 13px; color: #E2E8F0;">
            ${r.problems.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'LIGHTHOUSE_FULL_PROJECT_REPORT.html'), html, 'utf-8');
}

main().catch(err => {
  console.error('\nFatal Lighthouse runner error:', err);
  process.exit(1);
});
