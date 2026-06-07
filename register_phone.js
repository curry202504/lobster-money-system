const { chromium } = require('playwright');

const PHONE = '+447450774020';
const ORDER_ID = '1011216761';
const API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTA2MzgyNjAsImlhdCI6MTc3OTEwMjI2MCwicmF5IjoiMzBlMDZmZjNmY2FiOWZhYmI1MDlkZGZlZmE1OWUzNTkiLCJzdWIiOjQwODg4MDl9.JE7_Hhcf2is5s2qgevJM3hBGvKVKmBBwBoyrGvTIv5ySLpL1myYhd6Btql008USJBRsrbbIEpoOLgRNjtE70f9FrGI_THdHH2JNheoFW17oaHxhTC4djjZ7BUkO1YHh9YLukNnwSz5L7R8-_5C9VCTZQdGyvYdbP0toBmwO9VRKRpbh3lM6xLTOTffiWTww5OMo8n1KS1wgnZNXCd-iFCesSixRmxES8E1GmHDsbq2l9rPVHD_bEFxh8zHiCd6pXPLMfRds218cA5oqetL91y2kmYddWkgthiVXrtFbGmALpzZArHVJAg2Zn1dXMLg3Xb0JUzqGgX9jUIS_jMK64uQ';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkSms() {
  const { execSync } = require('child_process');
  try {
    const r = execSync(`curl.exe -s "https://5sim.net/v1/user/check/${ORDER_ID}" -H "Authorization: Bearer ${API_TOKEN}" -H "Accept: application/json"`, { encoding: 'utf8', timeout: 10000 });
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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  console.log('=== 1. Login with phone ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'ph1.png' });

  // Look for the phone flow - the phone button uses Google's phone auth
  // Click "Continue with phone" 
  const phoneBtn = page.locator('button:has-text("Continue with phone")');
  if (await phoneBtn.isVisible().catch(() => false)) {
    await phoneBtn.click();
    await wait(3000);
    console.log('Clicked "Continue with phone"');
    await page.screenshot({ path: 'ph2_phone_flow.png' });
    
    // We might be on Google sign-in or OpenAI's phone flow
    console.log('URL:', page.url());
    const pageText = await page.locator('body').innerText();
    console.log('Page:', pageText.substring(0, 1000));
    
    // Look for phone input
    const phoneInput = page.locator('input[type="tel"], #phone, input[name="phone"], input[placeholder*="phone" i]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(PHONE);
      console.log('Phone filled');
      await page.screenshot({ path: 'ph3_phone_filled.png' });
      
      // Click Next/Send code
      const nextBtn = page.locator('button[type="submit"]:has-text("Next"), button:has-text("Send"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await wait(2000);
        console.log('Phone sent, waiting for SMS...');
        await page.screenshot({ path: 'ph4_sent.png' });
        
        // Poll SMS
        for (let i = 0; i < 36; i++) {
          await wait(5000);
          const data = checkSms();
          if (data && data.sms && data.sms.length > 0) {
            const smsText = data.sms[0].text || data.sms[0].code || '';
            const code = smsText.match(/\d{4,8}/)?.[0];
            console.log(`SMS: text="${smsText.substring(0,60)}" code="${code}"`);
            if (code) {
              // Find code input
              const codeInput = page.locator('#code, input[type="text"], input[maxlength]').first();
              await codeInput.fill(code);
              await wait(500);
              const subBtn = page.locator('button[type="submit"]').first();
              await subBtn.click();
              await wait(3000);
              console.log('Verification submitted!');
              await page.screenshot({ path: 'ph5_verified.png' });
              console.log('URL:', page.url());
              break;
            }
          }
          console.log(`Waiting ${i+1}/36 (${(i+1)*5}s)`);
        }
      }
    } else {
      console.log('Phone input not visible. Dumping...');
      const inputs = await page.locator('input:visible').all();
      for (const inp of inputs) {
        console.log(`  ${await inp.getAttribute('id')} ${await inp.getAttribute('name')} ${await inp.getAttribute('type')}`);
      }
      const btns = await page.locator('button:visible').all();
      for (const btn of btns) {
        const t = await btn.textContent();
        if (t && t.trim().length < 40) console.log(`  button "${t.trim()}"`);
      }
    }
  } else {
    console.log('"Continue with phone" not found');
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'ph_final.png' });
  await browser.close();
})();
