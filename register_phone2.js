const { chromium } = require('playwright');

const PHONE_FULL = '+447781583159';
const PHONE_LOCAL = '7441583159'; // without +44
const ORDER_ID = '1011217698';
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

  console.log('=== Login with phone (UK) ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);

  // Click "Continue with phone"
  await page.locator('button:has-text("Continue with phone")').click();
  await wait(2000);
  console.log('Phone flow opened');
  await page.screenshot({ path: 'ph1_phone_flow.png' });

  // Find and click the country code dropdown to change from Singapore to UK
  // Look for the country code select/dropdown
  const countryDropdown = page.locator('[role="combobox"], [role="listbox"], select, button:has-text("+65"), button:has-text("Singapore")').first();
  if (await countryDropdown.isVisible().catch(() => false)) {
    const ddText = await countryDropdown.textContent();
    console.log('Country dropdown:', ddText);
    await countryDropdown.click();
    await wait(1000);
    await page.screenshot({ path: 'ph2_country_open.png' });

    // Search for "United Kingdom" or "UK"
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('United Kingdom');
      await wait(500);
    }

    // Click on United Kingdom
    const ukItem = page.locator('button:has-text("United Kingdom"), div:has-text("United Kingdom"), [role="option"]:has-text("United Kingdom"), li:has-text("United Kingdom")').first();
    if (await ukItem.isVisible().catch(() => false)) {
      await ukItem.click();
      await wait(500);
      console.log('United Kingdom selected');
      await page.screenshot({ path: 'ph3_uk_selected.png' });
    } else {
      // Try by country code +44
      const cc44 = page.locator('button:has-text("+44"), div:has-text("+44")').first();
      if (await cc44.isVisible().catch(() => false)) {
        await cc44.click();
        await wait(500);
        console.log('+44 selected');
        await page.screenshot({ path: 'ph3_44_selected.png' });
      }
    }
  }

  await wait(500);

  // Now fill phone number (just the local part)
  const phoneInput = page.locator('#phone, input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill(PHONE_LOCAL);
    console.log('Phone filled:', PHONE_LOCAL);
    await page.screenshot({ path: 'ph4_phone_filled.png' });

    // Click Continue
    const continueBtn = page.locator('button[type="submit"]:has-text("Continue"), button:has-text("Send code"), button:has-text("Next")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await wait(2000);
      console.log('Continue clicked, waiting for SMS...');
      await page.screenshot({ path: 'ph5_sent.png' });
      
      const afterText = await page.locator('body').innerText();
      console.log('After submit:', afterText.substring(0, 300));

      // Poll SMS
      for (let i = 0; i < 36; i++) {
        await wait(5000);
        const data = checkSms();
        if (data && data.sms && data.sms.length > 0) {
          const smsText = data.sms[0].text || data.sms[0].code || '';
          const code = smsText.match(/\d{4,8}/)?.[0];
          console.log(`\n=== SMS RECEIVED! === text="${smsText.substring(0,80)}" code="${code}"`);
          if (code) {
            await page.screenshot({ path: 'ph6_sms_received.png' });
            
            // Enter code
            const codeInput = page.locator('input[maxlength], input[type="text"], #code').first();
            await codeInput.fill(code);
            await wait(500);
            console.log('Code entered');

            // Submit
            const submitBtn = page.locator('button[type="submit"]').first();
            await submitBtn.click();
            await wait(3000);
            console.log('Verification submitted!');
            await page.screenshot({ path: 'ph7_verified.png' });
            console.log('URL:', page.url());
            
            // Check if we're logged in
            const finalText = await page.locator('body').innerText();
            console.log('Final text:', finalText.substring(0, 500));
            break;
          }
        }
        process.stdout.write(`.`);
      }
      console.log('\nDone polling');
    }
  } else {
    console.log('Phone input not found');
  }

  console.log('\nFinal URL:', page.url());
  await page.screenshot({ path: 'ph_final.png' });
  await browser.close();
})();
