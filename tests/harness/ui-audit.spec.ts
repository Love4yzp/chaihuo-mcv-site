import { expect, test } from '@playwright/test';
import { coreRoutes, detailRoutes, gotoRoute, installHarnessGuards } from './helpers';

interface AuditFailure {
  rule: string;
  detail: string;
}

test.describe('ui accessibility audit', () => {
  // See smoke.spec.ts — reduced-motion emulation is safe given the SSR-safe
  // mounted gate in ChinaRouteMap; it also calms teardown under parallel load.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const route of [...coreRoutes, ...detailRoutes]) {
    test(`${route.name} exposes usable semantics`, async ({ page }) => {
      await installHarnessGuards(page);
      await gotoRoute(page, route);

      const failures = await page.evaluate<AuditFailure[]>(() => {
        const issues: AuditFailure[] = [];

        const isVisible = (element: Element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        const textFromIds = (ids: string | null) =>
          ids
            ?.split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .filter(Boolean)
            .join(' ')
            .trim() ?? '';

        const accessibleName = (element: Element) => {
          const labelledBy = textFromIds(element.getAttribute('aria-labelledby'));
          if (labelledBy) return labelledBy;
          const ariaLabel = element.getAttribute('aria-label')?.trim();
          if (ariaLabel) return ariaLabel;
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
          ) {
            const label = element.id
              ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
              : null;
            if (label?.textContent?.trim()) return label.textContent.trim();
          }
          const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim();
          if (imageAlt) return imageAlt;
          const svgTitle = element.querySelector('svg title')?.textContent?.trim();
          if (svgTitle) return svgTitle;
          return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        };

        const describe = (element: Element) => {
          const tag = element.tagName.toLowerCase();
          const id = element.id ? `#${element.id}` : '';
          const classes =
            element.className && typeof element.className === 'string'
              ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
              : '';
          return `${tag}${id}${classes}`;
        };

        if (!document.documentElement.lang) {
          issues.push({ rule: 'document-language', detail: '<html> is missing lang' });
        }
        if (!document.querySelector('main')) {
          issues.push({ rule: 'landmark-main', detail: 'missing <main> landmark' });
        }
        if (!document.querySelector('nav')) {
          issues.push({ rule: 'landmark-nav', detail: 'missing <nav> landmark' });
        }

        const visibleH1s = Array.from(document.querySelectorAll('h1')).filter(isVisible);
        if (visibleH1s.length !== 1) {
          issues.push({
            rule: 'heading-h1',
            detail: `expected 1 visible h1, found ${visibleH1s.length}`,
          });
        }

        for (const image of Array.from(document.images)) {
          if (!image.hasAttribute('alt')) {
            issues.push({ rule: 'image-alt', detail: describe(image) });
          }
        }

        const interactiveSelector = [
          'a[href]',
          'button',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[role="tab"]',
        ].join(',');

        for (const element of Array.from(document.querySelectorAll(interactiveSelector))) {
          if (!isVisible(element)) continue;
          if (element.getAttribute('aria-hidden') === 'true') {
            issues.push({ rule: 'focusable-hidden', detail: describe(element) });
          }
          if (!accessibleName(element)) {
            issues.push({ rule: 'interactive-name', detail: describe(element) });
          }
        }

        const linkNames = new Map<string, Set<string>>();
        for (const link of Array.from(document.querySelectorAll('a[href]')).filter(isVisible)) {
          const name = accessibleName(link);
          const href = link.getAttribute('href') ?? '';
          if (!name || href.startsWith('#')) continue;
          const hrefs = linkNames.get(name) ?? new Set<string>();
          hrefs.add(href);
          linkNames.set(name, hrefs);
        }
        for (const [name, hrefs] of linkNames) {
          if (hrefs.size > 1) {
            issues.push({
              rule: 'link-name-target',
              detail: `"${name}" points to multiple hrefs: ${Array.from(hrefs).join(', ')}`,
            });
          }
        }

        return issues;
      });

      expect(failures).toEqual([]);
    });
  }
});
