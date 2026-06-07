const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';
const PHONE = '+447781583195';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkSms() {
  const { execSync } = require('child_process');
  const cmd = `curl.exe -s "https://5sim.net/v1/user/check/1011203083" -H "Authorization: Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ" -H "Accept: application/json"`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

(async () => {
  const browser = await chromium.launch({ 
    headless: false,  // non-headless to avoid bot detection
    args: [
      '--proxy-server=http://127.0.0.1:7897',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--lang=en-US'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });
  const page = await context.newPage();

  // Bypass webdriver detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });

  console.log('Navigating to chatgpt.com...');
  await page.goto('https://chatgpt.com', { waitUntil: 'networkidle', timeout: 60000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'cgpt_home.png' });
  
  // Look for and click sign up
  const signupSelectors = ['a[href*="signup"]', 'button:has-text("Sign up")', 'a:has-text("Sign up")', 'a[data-testid="signup-button"]', 'a:has-text("Get started")'];
  for (const sel of signupSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      console.log('Clicking:', sel);
      await btn.click();
      await wait(3000);
      break;
    }
  }
  
  console.log('URL after click:', page.url());
  await page.screenshot({ path: 'cgpt_after_click.png' });
  
  // Type email
  const emailField = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first();
  if (await emailField.isVisible().catch(() => false)) {
    console.log('Filling email...');
    await emailField.fill(EMAIL);
    await page.screenshot({ path: 'cgpt_email.png' });
    
    // Click continue/next
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await wait(3000);
    }
    
    await page.screenshot({ path: 'cgpt_password.png'));
    
    // Fill password
    const passField = page.locator('input[type="password"]').first();
    if (await passField.isVisible().catch(() => false)) {
      await passField.fill(PASSWORD);
      await wait(1000);
      
      const createBtn = page.locator('button:has-text("Create"), button[type="submit"]').first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await wait(3000);
      }
    }
    
    await page.screenshot({ path: 'cgpt_phone.png'));
    
    // Now we should see phone verification
    const phoneField = page.locator('input[type="tel"]').first();
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(PHONE);
      await wait(1000);
      
      const sendBtn = page.locator('button:has-text("Send"), button:has-text("Verify"), button[type="submit"]').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await wait(2000);
      }
      
      console.log('Phone submitted! Checking for SMS...');
      await page.screenshot({ path: 'cgpt_code.png'));
      
      // Poll for SMS
      for (let i = 0; i < 30; i++) {
        await wait(5000);
        const smsData = checkSms();
        if (smsData && smsData.sms && smsData.sms.length > 0) {
          console.log('SMS received!', JSON.stringify(smsData.sms));
          const smsText = smsData.sms[0].text || '';
          const code = smsText.match(/\d{4,8}/g)?.[0];
          if (code) {
            console.log('Code found:', code);
            // Enter the code
            const codeInputs = await page.locator('input[type="text"][maxlength], input[autocomplete="one-time-code"]').all();
            if (codeInputs.length > 0) {
              for (let j = 0; j < codeInputs.length && j < code.length; j++) {
                await codeInputs[j].fill(code[j]);
              }
            } else {
              const codeInput = page.locator('input').first();
              await codeInput.fill(code);
            }
            await wait(1000);
            await page.screenshot({ path: 'cgpt_done.png'));
            console.log('Code entered!');
            break;
          }
        }
        console.log(`Waiting for SMS... (${i+1}/30)`);
      }
    }
  }
  
  console.log('Final URL:', page.url());
  await page.screenshot({ path: 'cgpt_final.png'));
  
  // Keep browser open for inspection
  console.log('Browser open for inspection. Press Ctrl+C to exit.');
})();
