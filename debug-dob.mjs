import { chromium } from 'playwright-core';

const PROXY = 'http://127.0.0.1:7897';

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome', proxy: { server: PROXY } });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

  await p.goto('https://x.com/i/flow/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(5000);

  // Click create account
  await p.getByRole('button', { name: '创建账号' }).first().click({ timeout: 10000 });
  await p.waitForTimeout(2000);

  // Fill name
  await p.locator('input[name="name"]').first().fill('Test');

  // Switch to email
  await p.getByText('改用电子邮件').click();
  await p.waitForTimeout(1000);

  // Fill email
  await p.locator('input[type="email"]').first().fill('test@test.com');
  await p.waitForTimeout(1000);

  // Get the dialog's inner HTML to find DOB selectors
  const html = await p.locator('[role="dialog"]').evaluate(el => el.innerHTML.substring(0, 8000));
  console.log(html);

  // Also try to find specific elements
  console.log('\n=== ALL INPUTS ===');
  const inputs = await p.locator('input, select, [role="combobox"], [role="listbox"], [data-testid]').evaluateAll(els =>
    els.map(el => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      role: el.getAttribute('role'),
      testid: el.getAttribute('data-testid'),
      name: el.getAttribute('name'),
      autocomplete: el.getAttribute('autocomplete'),
      'aria-label': el.getAttribute('aria-label'),
      placeholder: el.getAttribute('placeholder'),
      text: el.textContent?.substring(0, 50),
      classes: el.className?.substring(0, 80),
    }))
  );
  console.log(JSON.stringify(inputs, null, 2));

  await b.close();
})();
