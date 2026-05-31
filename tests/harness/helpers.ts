import { expect, type Page, type Route, type TestInfo } from '@playwright/test';

export interface HarnessRoute {
  path: string;
  name: string;
  locale: 'zh' | 'en';
}

export const coreRoutes: HarnessRoute[] = [
  { path: '/', name: 'home-zh', locale: 'zh' },
  { path: '/en/', name: 'home-en', locale: 'en' },
  { path: '/journals', name: 'journals-zh', locale: 'zh' },
  { path: '/en/journals', name: 'journals-en', locale: 'en' },
  { path: '/route', name: 'route-zh', locale: 'zh' },
  { path: '/en/route', name: 'route-en', locale: 'en' },
  { path: '/deconstruct', name: 'deconstruct-zh', locale: 'zh' },
  { path: '/en/deconstruct', name: 'deconstruct-en', locale: 'en' },
  { path: '/guide', name: 'guide-zh', locale: 'zh' },
  { path: '/en/guide', name: 'guide-en', locale: 'en' },
  { path: '/about', name: 'about-zh', locale: 'zh' },
  { path: '/en/about', name: 'about-en', locale: 'en' },
  { path: '/elements', name: 'elements-zh', locale: 'zh' },
  { path: '/en/elements', name: 'elements-en', locale: 'en' },
];

export const detailRoutes: HarnessRoute[] = [
  { path: '/journals/2026-04-30-liuzhou-sandu', name: 'journal-detail-zh', locale: 'zh' },
  { path: '/en/journals/2026-04-30-liuzhou-sandu', name: 'journal-detail-en', locale: 'en' },
];

export const visualRoutes: HarnessRoute[] = [
  { path: '/', name: 'home-zh', locale: 'zh' },
  { path: '/en/', name: 'home-en', locale: 'en' },
  { path: '/route', name: 'route-zh', locale: 'zh' },
  { path: '/journals', name: 'journals-zh', locale: 'zh' },
  { path: '/deconstruct', name: 'deconstruct-zh', locale: 'zh' },
  { path: '/guide', name: 'guide-zh', locale: 'zh' },
  { path: '/about', name: 'about-zh', locale: 'zh' },
];

export async function installHarnessGuards(page: Page) {
  const empty = (route: Route) => route.fulfill({ status: 204, body: '' });
  await page.route('https://www.clarity.ms/**', empty);
  await page.route('https://www.googletagmanager.com/**', empty);
  await page.route('https://www.google-analytics.com/**', empty);
}

export function collectRuntimeErrors(page: Page) {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => {
    runtimeErrors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(`console.error: ${message.text()}`);
    }
  });
  return runtimeErrors;
}

export async function gotoRoute(page: Page, route: HarnessRoute) {
  const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  expect(response, `${route.path} should return a response`).not.toBeNull();
  expect(response?.status(), `${route.path} should not fail HTTP status`).toBeLessThan(400);
  await expect(page.locator('body'), `${route.path} body should render`).toBeVisible();
  await expect(page.locator('main'), `${route.path} should expose main landmark`).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 }).first(), `${route.path} should expose an h1`).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page, routeName: string) {
  const overflow = await page.evaluate(() =>
    Math.ceil(document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  expect(overflow, `${routeName} should not create horizontal page overflow`).toBeLessThanOrEqual(2);
}

export async function expectPageSubstance(page: Page, routeName: string) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
    const mainRect = main?.getBoundingClientRect();
    const visibleImages = Array.from(document.images).filter((img) => {
      const rect = img.getBoundingClientRect();
      return img.complete && img.naturalWidth > 0 && rect.width > 8 && rect.height > 8;
    }).length;
    return {
      textLength: bodyText.length,
      mainHeight: mainRect?.height ?? 0,
      visibleImages,
    };
  });

  expect(metrics.textLength, `${routeName} should render meaningful text`).toBeGreaterThan(80);
  expect(metrics.mainHeight, `${routeName} main content should occupy visible space`).toBeGreaterThan(240);
}

export async function attachPageScreenshot(page: Page, testInfo: TestInfo, routeName: string) {
  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${routeName}.png`, {
    body: screenshot,
    contentType: 'image/png',
  });
}

export async function expectNoVehicleCanvas(page: Page, routeName: string) {
  await expect(page.locator('main canvas'), `${routeName} should not render model canvases`).toHaveCount(0);
}

export async function settleForVisual(page: Page) {
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.001ms !important;
      }
    `,
  });
}
