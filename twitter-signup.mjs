import { chromium } from 'playwright-core';
const PROXY = '127.0.0.1:7897';

async function main() {
  const mail = await (async () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let local = '';
    for (let i = 0; i < 12; i++) local += chars[Math.floor(Math.random() * chars.length)];
    const d = await fetch('https://api.mail.tm/domains').then(r => r.json());
    const domain = d['hydra:member']?.[0]?.domain || 'cliptik.net';
    const email = local + '@' + domain;
    const pw = 'Temp' + Math.random().toString(36).slice(2, 8);
    await fetch('https://api.mail.tm/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: pw }),
    });
    const t = await fetch('https://api.mail.tm/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: pw }),
    }).then(r => r.json());
    return { email, password: 'XiaUser2026!@#', token: t.token };
  })();
  console.log('邮箱:', mail.email, '密码:', mail.password);

  const browser = await chromium.launch({
    headless: false, channel: 'chrome',
    args: ['--proxy-server=' + PROXY, '--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const ctx = await browser.newContext({
    locale: 'zh-CN', viewport: { width: 1280, height: 800 },
  });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));

  const p = await ctx.newPage();
  await p.goto('https://x.com/i/flow/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(5000);
  console.log('[OK] 推特已加载');

  // Click the BUTTON (NOT the link) that says 创建账号
  // The button has tag BUTTON, the link has tag A
  const btn = p.locator('button:has-text("创建账号")');
  const btnCount = await btn.count();
  console.log('找到', btnCount, '个创建账号按钮');
  await btn.first().click({ timeout: 10000 });
  await p.waitForTimeout(3000);

  const dialog = p.locator('[role="dialog"][aria-modal="true"]');
  if ((await dialog.count()) === 0) {
    console.log('[!] 对话框未出现');
    return;
  }
  console.log('[OK] 对话框已打开');

  // Fill form
  await dialog.locator('input').first().fill('User Xia');
  await dialog.getByText('改用电子邮件').click();
  await p.waitForTimeout(1000);
  await dialog.locator('input[type="email"]').first().fill(mail.email);
  await dialog.locator('select').nth(0).selectOption('3 月');
  await dialog.locator('select').nth(1).selectOption('15');
  await dialog.locator('select').nth(2).selectOption('1990');
  console.log('[OK] 表单已填完');

  // Click next using the actual button with coordinates
  // The next button is inside the dialog
  const nextBtn = p.locator('[data-testid="nextButton"]');
  const disabled = await nextBtn.isDisabled().catch(() => false);
  console.log('下一步 disabled:', disabled);

  // Click using evaluate (bypasses overlay issues)
  await p.evaluate(() => {
    const btn = document.querySelector('[data-testid="nextButton"]');
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
  console.log('[OK] 已点击下一步');
  await p.waitForTimeout(5000);
  console.log('URL:', p.url());

  // Also try clicking the visible "下一步" button text if still on same page
  if (p.url().includes('signup') || p.url().includes('flow')) {
    const nextTextBtn = dialog.locator('div:has-text("下一步")');
    if (await nextTextBtn.count() > 0) {
      await nextTextBtn.first().click({ timeout: 3000, force: true });
      console.log('[OK] 点击下一步文本');
      await p.waitForTimeout(5000);
      console.log('URL:', p.url());
    }
  }

  // Monitor
  let lastState = '';
  for (let i = 0; i < 720; i++) {
    await p.waitForTimeout(5000);
    const url = p.url();
    if (url.includes('home') || url === 'https://x.com/') {
      console.log('\n✅ 注册成功！\n' + mail.email + ' / ' + mail.password);
      return;
    }
    try {
      if ((await p.locator('input[inputmode="numeric"]').count()) > 0) {
        if (lastState !== 'code') { console.log('\n[!] 验证码输入...'); lastState = 'code'; }
        const msgs = await fetch('https://api.mail.tm/messages', { headers: { 'Authorization': 'Bearer ' + mail.token } }).then(r => r.json());
        for (const msg of (msgs['hydra:member'] || [])) {
          const full = await fetch('https://api.mail.tm/messages/' + msg.id, { headers: { 'Authorization': 'Bearer ' + mail.token } }).then(r => r.json());
          const text = (full.text || '') + (full.html || '');
          const codes = [...text.matchAll(/\b(\d{6})\b/g)].map(m => m[1]).filter(c => c !== '000000');
          if (codes.length > 0) {
            console.log('验证码:', codes[0]);
            const inputs = p.locator('input[inputmode="numeric"]');
            for (let j = 0; j < codes[0].length; j++) await inputs.nth(j).fill(codes[0][j]);
            console.log('已填入');
            await p.waitForTimeout(5000);
            break;
          }
        }
      }
    } catch {}
    try {
      if ((await p.locator('iframe[src*="arkoselabs"], iframe[src*="funcaptcha"]').count()) > 0 && lastState !== 'captcha') {
        console.log('\n[!] CAPTCHA');
        lastState = 'captcha';
      }
    } catch {}
  }

  console.log('\n最终:', mail.email, '/', mail.password);
  await new Promise(() => {});
  await browser.close();
}

main().catch(e => console.error(e.message));
