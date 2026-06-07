import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';

const PROXY = 'http://127.0.0.1:7897';
const RESULT = 'C:\\Users\\tu\\.openclaw\\workspace\\twitter-result.json';

async function main() {
  writeFileSync(RESULT, JSON.stringify({ status: 'starting' }));

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    proxy: { server: PROXY },
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const ctx = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
  });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));

  const p = await ctx.newPage();
  await p.goto('https://x.com/i/flow/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(8000);

  // Escape overlays
  await p.keyboard.press('Escape');
  await p.waitForTimeout(1000);

  // Debug: print all buttons and links
  const all = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('a[role="link"], button, [role="button"]')).slice(0, 15).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      testid: el.getAttribute('data-testid'),
      href: el.getAttribute('href'),
      text: el.textContent?.substring(0, 30),
      rect: el.getBoundingClientRect(),
      visible: el.offsetParent !== null,
      zIndex: getComputedStyle(el).zIndex,
    }));
  });
  console.log('Interactive elements:', JSON.stringify(all, null, 2));

  // Also check for the main dialog overlay
  const layerContent = await p.evaluate(() => {
    const layers = document.querySelector('#layers');
    return layers?.innerHTML?.substring(0, 2000) || 'no layers';
  });
  console.log('\nLayers HTML (first 500 chars):', layerContent.substring(0, 500));

  await browser.close();
}

main().catch(e => console.error(e.message));
