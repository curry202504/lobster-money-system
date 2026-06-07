const { chromium } = require('playwright');

const PHONE = '7441583159';
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

  console.log('=== Inspect phone flow ===');
  await page.goto('https://platform.openai.com/login', { timeout: 30000 });
  await wait(2000);
  await page.locator('button:has-text("Continue with phone")').click();
  await wait(2000);

  // Dump ALL visible elements near the country code dropdown
  console.log('=== PAGE HTML SNIPPET ===');
  const html = await page.locator('#phone').first().evaluate(el => el.closest('div')?.outerHTML || 'N/A');
  console.log(html.substring(0, 2000));

  // Try clicking on the Singapore/+65 area to open the dropdown
  const countrySelector = page.locator('text=Singapore').first();
  if (await countrySelector.isVisible().catch(() => false)) {
    console.log('Found Singapore text, clicking parent...');
    const parentBtn = countrySelector.locator('..');
    await parentBtn.click();
    await wait(1000);
    await page.screenshot({ path: 'country_open.png'));
    
    // Dump all visible elements now
    console.log('Searching for UK...');
    const allVisible = await page.locator('button:visible, [role="button"]:visible').all();
    for (const el of allVisible) {
      const text = await el.textContent().catch(() => '');
      if (text && text.includes('United') || text.includes('UK') || text.includes('44')) {
        console.log('Found:', text.trim());
      }
    }
    
    // Try typing "United" or "UK"
    const searchInput = page.locator('input:visible[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('United');
      await wait(500);
      await page.screenshot({ path: 'country_searched.png'));
      
      // Now get the results
      const results = await page.locator('button:visible, div[role="option"]:visible, li:visible').all();
      for (const r of results) {
        const t = await r.textContent().catch(() => '');
        if (t && t.trim().length > 0 && t.trim().length < 50) console.log('Option:', t.trim());
      }
    }
  }

  await browser.close();
})();
