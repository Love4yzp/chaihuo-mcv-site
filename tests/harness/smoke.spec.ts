import { expect, test } from '@playwright/test';
import {
  collectRuntimeErrors,
  coreRoutes,
  detailRoutes,
  expectNoHorizontalOverflow,
  expectPageSubstance,
  gotoRoute,
  installHarnessGuards,
} from './helpers';

test.describe('route smoke', () => {
  for (const route of [...coreRoutes, ...detailRoutes]) {
    test(`${route.name} renders`, async ({ page }) => {
      await installHarnessGuards(page);
      const runtimeErrors = collectRuntimeErrors(page);

      await gotoRoute(page, route);
      await expect(page).toHaveTitle(/.+ \| .+/);
      await expectNoHorizontalOverflow(page, route.name);
      await expectPageSubstance(page, route.name);

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang, `${route.name} should set document language`).toBe(route.locale === 'zh' ? 'zh-CN' : 'en');
      expect(runtimeErrors, `${route.name} should not emit runtime console/page errors`).toEqual([]);
    });
  }

  test('legacy documentation routes redirect to journals', async ({ page }) => {
    await installHarnessGuards(page);

    await page.goto('/documentation', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/journals\/?$/);

    await page.goto('/en/documentation', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/journals\/?$/);
  });
});
