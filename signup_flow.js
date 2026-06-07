const { chromium } = require('playwright');

const DEVICE_CODE = '8DJG-97BV0';
const PASSWORD = 'Tujiaxin1996.';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--proxy-server=http://127.0.0.1:7897',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  console.log('1. Go to device auth page');
  // Pass the code as URL param
  await page.goto(`https://auth.openai.com/codex/device?user_code=${DEVICE_CODE}`, { timeout: 30000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'sf1.png' });

  const t0 = await page.locator('body').innerText();
  console.log('Page:', t0.substring(0, 500));

  // If login, click sign up
  const signupLink = page.locator('a:has-text("Sign up")').first();
  if (await signupLink.isVisible().catch(() => false)) {
    await signupLink.click();
    await wait(2000);
    console.log('Clicked Sign up');
    console.log('URL:', page.url());
    await page.screenshot({ path: 'sf2.png' });
  }

  // Fill email on signup
  const emailInput = page.locator('#email-address, #email, input[type="email"]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('xin10141014@gmail.com');
    await page.locator('button[type="submit"]').first().click();
    await wait(3000);
    console.log('Email submitted');
    console.log('URL:', page.url());
    await page.screenshot({ path: 'sf3.png'));
  }

  const t1 = await page.locator('body').innerText();
  console.log('After email:', t1.substring(0, 500));

  // Check for password or redirect
  const passInput = page.locator('#password, input[type="password"]').first();
  if (await passInput.isVisible().catch(() => false)) {
    await passInput.fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await wait(3000);
    console.log('Password submitted');
    await page.screenshot({ path: 'sf4.png'));
    console.log('URL:', page.url());
  }

  const t2 = await page.locator('body').innerText();
  console.log('Final:', t2.substring(0, 500));

  console.log('\nBrowser open - close manually or wait 120s');
  await wait(120000);
  await browser.close();
})();
