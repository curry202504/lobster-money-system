const { chromium } = require('playwright');

const EMAIL = 'xin10141014@gmail.com';
const PASSWORD = 'Tujiaxin1996.';
const PHONE = '+447781583195';
const API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ';
const PROMO_CODE = '';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkSms() {
  const { execSync } = require('child_process');
  try {
    const result = execSync(`curl.exe -s "https://5sim.net/v1/user/check/1011203083" -H "Authorization: Bearer ${API_TOKEN}" -H "Accept: application/json"`, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
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
    viewport: { width: 1280, height: 800 }
  });

  await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    navigator.webdriver = false;
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  console.log('1. Opening chatgpt.com...');
  await page.goto('https://chatgpt.com/auth/signup', { waitUntil: 'networkidle', timeout: 60000 }).catch(async (e) => {
    console.log('Initial goto error:', e.message.substring(0, 100));
    await page.goto('https://chatgpt.com', { waitUntil: 'load', timeout: 60000 });
  });
  await wait(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 's1.png' });

  // Try clicking signup if on home page
  if (!page.url().includes('signup')) {
    const links = await page.locator('a[href*="sign"], a:has-text("Get started"), a:has-text("Sign up")').all();
    for (const link of links) {
      try {
        if (await link.isVisible()) {
          await link.click();
          await wait(3000);
          console.log('Clicked signup link');
          break;
        }
      } catch(e) {}
    }
  }
  
  console.log('2. URL now:', page.url());
  await page.screenshot({ path: 's2.png' });

  // Find and fill email
  const emailInput = page.locator('#email-address, input[name="email"], input[type="email"], input[placeholder*="Email" i]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(EMAIL);
    console.log('Email filled');
    await page.screenshot({ path: 's3_email.png' });
    
    // Click continue
    const contBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    if (await contBtn.isVisible().catch(() => false)) {
      await contBtn.click();
      await wait(2000);
      console.log('Clicked Continue');
    }
    
    await page.screenshot({ path: 's4_after_email.png' });
    
    // Fill password
    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill(PASSWORD);
      console.log('Password filled');
      await page.screenshot({ path: 's5_password.png' });
      
      // Click continue / create account
      const createBtn = page.locator('button:has-text("Continue"), button[type="submit"], button:has-text("Create")').first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await wait(2000);
        console.log('Clicked Create/Continue');
      }
    }
    
    await page.screenshot({ path: 's6_after_password.png' });
    console.log('URL after password:', page.url());
    const bodyText = await page.locator('body').innerText();
    console.log('Body text (first 500):', bodyText.substring(0, 500));
    
    // Fill phone number
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i], input:not([type="hidden"])').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      const currentVal = await phoneInput.inputValue();
      console.log('Current value:', currentVal);
      if (currentVal === '') {
        await phoneInput.fill(PHONE);
        console.log('Phone filled:', PHONE);
        await page.screenshot({ path: 's7_phone.png' });
        
        // Click verify/send code
        const sendBtn = page.locator('button:has-text("Send"), button:has-text("Verify"), button:has-text("Continue"), button[type="submit"]').first();
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
          await wait(2000);
          console.log('Phone verification sent!');
          await page.screenshot({ path: 's8_code_sent.png' });
        }
      }
    } else {
      // Maybe phone verification isn't visible yet, check page content
      console.log('Phone input not visible. Checking page...');
      const allInputs = await page.locator('input').all();
      for (const inp of allInputs) {
        console.log('Input:', await inp.getAttribute('type'), await inp.getAttribute('id'), await inp.getAttribute('name'));
      }
      
      const allBtns = await page.locator('button').all();
      for (const btn of allBtns) {
        const text = await btn.textContent();
        if (text && text.length < 50) console.log('Button:', text.trim());
      }
    }
    
    // Poll for SMS
    console.log('\nWaiting for SMS...');
    for (let i = 0; i < 36; i++) {
      await wait(5000);
      const data = checkSms();
      if (data && data.sms && data.sms.length > 0) {
        console.log('SMS received!', JSON.stringify(data.sms));
        const smsText = data.sms[0].text || '';
        const code = smsText.match(/\d{4,8}/)?.[0];
        if (code) {
          console.log('Verification code:', code);
          // Find code input
          const codeInputs = await page.locator('input[type="text"], input[autocomplete="one-time-code"]').all();
          if (codeInputs.length > 0) {
            await codeInputs[0].fill(code);
          }
          await wait(1000);
          await page.screenshot({ path: 's9_code_entered.png' });
          
          // Click confirm
          const confirmBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            await wait(3000);
          }
          console.log('Registration completed!');
          await page.screenshot({ path: 's10_complete.png' });
          break;
        }
      }
      console.log(`Waiting... ${i+1}/36 (${(i+1)*5}s)`);
    }
  } else {
    console.log('Email input not found. Page content:');
    const pageText = await page.locator('body').innerText().catch(() => 'N/A');
    console.log(pageText.substring(0, 1000));
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 's11_final.png' });
  
  console.log('Done. Browser closing.');
  await browser.close();
})();
