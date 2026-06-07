const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--proxy-server=http://127.0.0.1:7897',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });
  const page = await context.newPage();

  console.log('=== Try to LOG IN ===');
  await page.goto('https://chatgpt.com/auth/login', { timeout: 30000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'login1.png' });

  // Check for email input on login page
  const emailInput = page.locator('#email-address, #email, input[name="email"], input[type="email"]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(EMAIL);
    console.log('Email filled');
    await page.screenshot({ path: 'login2_email.png' });

    const continueBtn = page.locator('button[type="submit"]').first();
    await continueBtn.click();
    await wait(2000);
    console.log('Continue clicked');
    await page.screenshot({ path: 'login3_after_email.png' });

    // Check for password field or error
    const passInput = page.locator('#password, input[type="password"]').first();
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill(PASSWORD);
      console.log('Password filled');

      const loginBtn = page.locator('button[type="submit"]').first();
      await loginBtn.click();
      await wait(5000);
      console.log('Login submitted. URL:', page.url());
      await page.screenshot({ path: 'login4_result.png' });
      
      const text = await page.locator('body').innerText();
      console.log('Page:', text.substring(0, 500));
    } else {
      console.log('No password field. Checking page...');
      await page.screenshot({ path: 'login3b_error.png' });
      const text = await page.locator('body').innerText();
      console.log('Page:', text.substring(0, 500));
    }
  } else {
    // Try clicking "Log in" button first
    console.log('Email input not visible. Trying homepage approach...');
    await page.goto('https://chatgpt.com', { timeout: 30000 });
    await wait(2000);
    
    const loginBtn = page.locator('button:has-text("Log in")').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await wait(3000);
      console.log('Clicked Log in. URL:', page.url());
      await page.screenshot({ path: 'login1b.png' });
      
      // Now fill email
      const email = page.locator('#email-address, #email, input[name="email"], input[type="email"]').first();
      if (await email.isVisible().catch(() => false)) {
        await email.fill(EMAIL);
        const cont = page.locator('button[type="submit"]').first();
        await cont.click();
        await wait(2000);
        
        const pass = page.locator('#password, input[type="password"]').first();
        if (await pass.isVisible().catch(() => false)) {
          await pass.fill(PASSWORD);
          const sub = page.locator('button[type="submit"]').first();
          await sub.click();
          await wait(5000);
          console.log('Login done. URL:', page.url());
          await page.screenshot({ path: 'login4b_result.png' });
        }
      }
    }
  }

  console.log('Final URL:', page.url());
  const finalText = await page.locator('body').innerText().catch(() => '');
  console.log('Final text:', finalText.substring(0, 800));
  await page.screenshot({ path: 'login_final.png' });
  await browser.close();
})();
