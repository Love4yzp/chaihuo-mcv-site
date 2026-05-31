import { expect, test } from '@playwright/test';
import {
  attachPageScreenshot,
  collectRuntimeErrors,
  expectNoHorizontalOverflow,
  expectNoVehicleCanvas,
  expectPageSubstance,
  gotoRoute,
  installHarnessGuards,
  settleForVisual,
  visualRoutes,
} from './helpers';

test.describe('visual smoke', () => {
  for (const route of visualRoutes) {
    test(`${route.name} has stable visual substance`, async ({ page }, testInfo) => {
      await installHarnessGuards(page);
      const runtimeErrors = collectRuntimeErrors(page);

      await gotoRoute(page, route);
      await settleForVisual(page);
      await expectNoHorizontalOverflow(page, route.name);
      await expectPageSubstance(page, route.name);

      if (route.path.includes('deconstruct')) {
        await expectNoVehicleCanvas(page, route.name);
      }

      await attachPageScreenshot(page, testInfo, route.name);
      expect(runtimeErrors, `${route.name} should not emit runtime console/page errors`).toEqual(
        [],
      );
    });
  }
});
