import { expect, test } from '@playwright/test';
import { installHarnessGuards } from './helpers';

test.describe('typography', () => {
  test('hero uses the display font stack; body uses the system stack', async ({ page }) => {
    await installHarnessGuards(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFont).toMatch(/PingFang SC|Microsoft YaHei|system-ui/);

    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).fontFamily : '';
    });
    expect(h1Font).toMatch(/Space Grotesk|Smiley Sans/);
  });
});
