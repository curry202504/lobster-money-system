import { chromium } from 'playwright-core';
const PROXY = '127.0.0.1:7897';

async function test() {
  const b = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--proxy-server=' + PROXY, '--no-sandbox']
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  
  await p.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(3000);
  console.log('登录页:', p.url());

  // Enter email
  await p.locator('input[autocomplete="username"], input[name="text"]').first().fill('xx91udnjthab@deltajohnsons.com');
  await p.waitForTimeout(1000);
  await p.locator('button:has-text("下一步"), [role="button"] span:has-text("Next")').first().click();
  await p.waitForTimeout(3000);
  console.log('提交邮箱后URL:', p.url());

  // Enter password
  await p.locator('input[type="password"], input[name="password"]').first().fill('XiaUser2026!@#');
  await p.waitForTimeout(1000);
  await p.locator('[data-testid="LoginForm_Login_Button"], button:has-text("登录")').first().click();
  await p.waitForTimeout(8000);
  console.log('登录后URL:', p.url());

  // Check success
  if (p.url().includes('home') || p.url() === 'https://x.com/') {
    console.log('✅ 账号可用！');
    console.log('xx91udnjthab@deltajohnsons.com / XiaUser2026!@#');
  } else {
    const err = await p.locator('[role="alert"], .error, .message').textContent().catch(() => 'no error msg');
    console.log('❌ 登录失败:', err?.substring(0, 200));
  }

  await b.close();
}

test().catch(e => console.error(e.message));
