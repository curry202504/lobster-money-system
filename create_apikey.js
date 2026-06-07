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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  // Intercept all auth/API responses
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('session') || url.includes('login') || url.includes('api/auth') || url.includes('apikey') || url.includes('api-keys')) {
      console.log(`[${resp.status()}] ${url.substring(0,130)}`);
    }
  });

  console.log('=== 1. Login to platform.openai.com ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'oa1.png' });

  // Fill email
  await page.locator('#login-email').fill(EMAIL);
  console.log('Email filled');
  await page.screenshot({ path: 'oa2_email.png' });

  // Click Continue (main email button, not Google/Apple)
  await page.locator('button[type="submit"]:has-text("Continue")').first().click();
  await wait(2000);
  console.log('Continue clicked');
  await page.screenshot({ path: 'oa3_after_email.png' });

  // Check for password field
  const passInput = page.locator('input[type="password"], #password');
  if (await passInput.isVisible().catch(() => false)) {
    await passInput.fill(PASSWORD);
    console.log('Password filled');
    
    // Click Continue/Log in
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await wait(5000);
    console.log('Login submitted');
    await page.screenshot({ path: 'oa4_after_login.png' });
    console.log('URL:', page.url());

    // Check if logged in
    const url = page.url();
    if (url.includes('login') || url.includes('error')) {
      console.log('Login might have failed. Checking...');
      const text = await page.locator('body').innerText();
      console.log('Text:', text.substring(0, 500));
      await page.screenshot({ path: 'oa4_error.png' });
    } else {
      console.log('Login successful!');
      
      // Navigate to API keys page
      await page.goto('https://platform.openai.com/api-keys', { timeout: 30000 });
      await wait(3000);
      console.log('API keys page:', page.url());
      await page.screenshot({ path: 'oa5_apikeys.png' });
      
      const keysText = await page.locator('body').innerText();
      console.log('Keys page:', keysText.substring(0, 1000));
      await page.screenshot({ path: 'oa5_keys.png' });
      
      // Look for create API key button
      const createBtn = page.locator('button:has-text("Create"), a:has-text("Create"), button:has-text("New")').first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await wait(2000);
        console.log('Create button clicked');
        await page.screenshot({ path: 'oa6_create_key.png' });
        
        // Try to find and fill key name
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('codex-cli');
          await wait(500);
        }
        
        // Click create/confirm
        const confirmBtn = page.locator('button:has-text("Create"), button[type="submit"]').first();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await wait(2000);
          console.log('Key creation confirmed');
          await page.screenshot({ path: 'oa7_key_created.png' });
          
          // Get the key value
          const keysText2 = await page.locator('body').innerText();
          console.log('After create:', keysText2.substring(0, 1500));
          await page.screenshot({ path: 'oa8_result.png' });
        }
      } else {
        console.log('No create button found');
        // Maybe keys already exist, let me find them
        const keysText2 = await page.locator('body').innerText();
        console.log('Full text:', keysText2.substring(0, 2000));
      }
    }
  } else {
    console.log('Password input not found. Checking page...');
    const text = await page.locator('body').innerText();
    console.log('Page:', text.substring(0, 500));
    
    const inputs = await page.locator('input:visible').all();
    for (const inp of inputs) {
      console.log(`  ${await inp.getAttribute('id')} ${await inp.getAttribute('name')} ${await inp.getAttribute('type')}`);
    }
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'oa_final.png' });
  await browser.close();
})();
