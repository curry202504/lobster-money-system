const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';
const PHONE = '+447781583195';
const API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkSms() {
  const { execSync } = require('child_process');
  try {
    const r = execSync(`curl.exe -s "https://5sim.net/v1/user/check/1011203083" -H "Authorization: Bearer ${API_TOKEN}" -H "Accept: application/json"`, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(r);
  } catch(e) { return null; }
}

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

  console.log('=== 1. Go to chatgpt.com homepage ===');
  await page.goto('https://chatgpt.com', { timeout: 30000 });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'c1.png' });
  
  // Click "Sign up for free" button on homepage
  const signupBtn = page.locator('button:has-text("Sign up for free"), a:has-text("Sign up for free")');
  if (await signupBtn.isVisible().catch(() => false)) {
    await signupBtn.click();
    await wait(3000);
    console.log('Clicked "Sign up for free"');
    await page.screenshot({ path: 'c2_after_signup.png' });
  }
  
  // Look for email input - it's embedded on the page
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(EMAIL);
    console.log('Email filled');
    await page.screenshot({ path: 'c3_email.png' });
    
    // Click Continue
    const continueBtn = page.locator('button[type="submit"]:has-text("Continue")');
    await continueBtn.click();
    await wait(2000);
    console.log('Continue clicked');
    await page.screenshot({ path: 'c4_after_continue.png' });

    // Wait for password field
    const passInput = page.locator('#password');
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill(PASSWORD);
      console.log('Password filled');
      await wait(500);
      
      // Click Continue / Create account
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await wait(3000);
      console.log('Account creation submitted');
      await page.screenshot({ path: 'c5_password_done.png' });
    }
    
    // Check for phone input
    console.log('URL now:', page.url());
    const pageText = await page.locator('body').innerText();
    console.log('Page preview:', pageText.substring(0, 300));
    
    // Look for phone input
    const phoneInput = page.locator('#phone, input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(PHONE);
      console.log('Phone filled');
      await page.screenshot({ path: 'c6_phone.png' });
      
      const sendBtn = page.locator('button[type="submit"]').first();
      await sendBtn.click();
      await wait(2000);
      console.log('Phone submitted, waiting for SMS...');
      await page.screenshot({ path: 'c7_code_sent.png' });
      
      // Poll SMS
      for (let i = 0; i < 36; i++) {
        await wait(5000);
        const data = checkSms();
        if (data && data.sms && data.sms.length > 0) {
          const smsText = data.sms[0].text || data.sms[0].code || '';
          const code = smsText.match(/\d{4,8}/)?.[0];
          console.log(`SMS received! text="${smsText.substring(0,50)}" code="${code}"`);
          if (code) {
            const codeInput = page.locator('input').first();
            await codeInput.fill(code);
            await wait(500);
            const subBtn = page.locator('button[type="submit"]').first();
            await subBtn.click();
            await wait(3000);
            console.log('Verification submitted!');
            await page.screenshot({ path: 'c8_verified.png' });
            break;
          }
        }
        console.log(`Waiting SMS ${i+1}/36`);
      }
    } else {
      console.log('Phone input not found. Dumping inputs...');
      const inputs = await page.locator('input:visible').all();
      for (const inp of inputs) {
        const id = await inp.getAttribute('id');
        const name = await inp.getAttribute('name');
        const type = await inp.getAttribute('type');
        const pl = await inp.getAttribute('placeholder');
        console.log(`  input id="${id}" name="${name}" type="${type}" placeholder="${pl}"`);
      }
    }
  } else {
    console.log('Email input not found on signup page!');
  }
  
  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'c9_final.png' });
  await browser.close();
  console.log('Done');
})();
