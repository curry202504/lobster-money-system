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

  console.log('=== Login via platform.openai.com ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);

  // Fill email
  await page.locator('#login-email').fill(EMAIL);
  await wait(500);
  console.log('Email filled');

  // Click Continue (email submit)
  await page.locator('button[type="submit"]').first().click();
  await wait(3000);
  console.log('Continue clicked');
  await page.screenshot({ path: 'ga1.png' });

  // We should be on Google sign-in page now
  console.log('URL:', page.url());
  await page.screenshot({ path: 'ga2_google.png' });
  
  const pageText = await page.locator('body').innerText();
  console.log('Page:', pageText.substring(0, 1000));

  // Check if we're on Google sign-in
  if (page.url().includes('accounts.google.com')) {
    // Google is asking for email (since headless was detected)
    console.log('On Google sign-in page');
    
    // Fill email
    const emailInput = page.locator('#identifierId');
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(EMAIL);
      console.log('Google email filled');
      await page.screenshot({ path: 'ga3_google_email.png' });
      
      // Click Next
      await page.locator('button:has-text("Next"), button:has-text("Sign in")').first().click();
      await wait(3000);
      console.log('Next clicked');
      await page.screenshot({ path: 'ga4_after_email.png' });
      
      // Now fill password
      const passInput = page.locator('#password, input[name="Passwd"], input[type="password"]').first();
      if (await passInput.isVisible().catch(() => false)) {
        await passInput.fill(PASSWORD);
        console.log('Google password filled');
        await page.screenshot({ path: 'ga5_pass.png' });
        
        // Click Next/Sign in
        await page.locator('button:has-text("Next"), button:has-text("Sign in")').first().click();
        await wait(5000);
        console.log('Password submitted');
        await page.screenshot({ path: 'ga6_after_pass.png' });
        console.log('URL:', page.url());
        
        const textAfter = await page.locator('body').innerText();
        console.log('After sign-in:', textAfter.substring(0, 800));
        
        // If we got redirected back to OpenAI, we're logged in!
        if (page.url().includes('platform.openai.com') || page.url().includes('openai.com')) {
          console.log('=== LOGGED IN! ===');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'ga7_loggedin.png' });
          
          // Go to API keys
          await page.goto('https://platform.openai.com/api-keys', { timeout: 30000 });
          await wait(3000);
          console.log('API keys URL:', page.url());
          await page.screenshot({ path: 'ga8_keys.png' });
          
          const keysText = await page.locator('body').innerText();
          console.log('Keys page:', keysText.substring(0, 2000));
          
          // Try creating a new key
          const createBtn = page.locator('button:has-text("Create"), a:has-text("Create"), button:has-text("New secret")').first();
          if (await createBtn.isVisible().catch(() => false)) {
            await createBtn.click();
            await wait(2000);
            await page.screenshot({ path: 'ga9_newkey.png' });
            
            const modalText = await page.locator('body').innerText();
            console.log('Create key modal:', modalText.substring(0, 1000));
          }
        } else {
          console.log('Still on Google/error page');
          await page.screenshot({ path: 'ga7_issue.png' });
          
          const inputs2 = await page.locator('input:visible').all();
          for (const inp of inputs2) {
            console.log(`  ${await inp.getAttribute('id')} ${await inp.getAttribute('name')} ${await inp.getAttribute('type')}`);
          }
        }
      }
    }
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'ga_final.png' });
  await browser.close();
})();
