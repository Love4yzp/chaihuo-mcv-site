# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

柴火基地车官网 (Chaihuo MCV Site) — a bilingual (zh/en) marketing website for Chaihuo's mobile AI laboratory vehicle "普罗米修斯号". Astro SSR site with route map, journals, and Content Collections for structured data.

## Commands

- `pnpm dev` — start Astro dev server
- `pnpm check` — run content/reference validation and Astro type diagnostics
- `pnpm smoke` — run browser route smoke tests against production preview
- `pnpm audit:ui` — run lightweight UI/accessibility semantics audit
- `pnpm visual` — capture desktop/mobile screenshots and verify visual substance, overflow, and runtime errors
- `pnpm harness` — run `pnpm check` and the full Playwright harness
- `pnpm build` — run checks, then production build (Node standalone)
- `pnpm build:astro` — raw Astro build without the pre-build check wrapper
- `pnpm preview` — preview production build locally
- `pnpm start` — run production server (`node ./dist/server/entry.mjs`)
- `./deploy.sh` — Docker build + deploy (one command)

**pnpm only.** Do not use `npm` or `yarn`. `.npmrc` sets `legacy-peer-deps=true` for React 19 compatibility.

No unit test framework or linter is configured. Use `pnpm check` as the main non-browser issue-discovery command, and `pnpm harness` when a change affects rendered behavior.

## Architecture

**Stack:** Astro 6 + React 19 (Islands) + TypeScript + Tailwind CSS 4 + shadcn/ui (Radix) + Framer Motion

**Deployment:** Node.js standalone via `@astrojs/node` adapter. Docker (`Dockerfile` + `docker-compose.yml`). GitHub push triggers Jenkins deploy through repository webhook job `chaihuo-chaihuo-mcv-site`.

**Routing:** Astro file-based routing in `src/pages/`. Chinese is default (no prefix), English under `/en/`:
- `/` `/en/` → Home (hero carousel, video modal, China route map SVG, mobile lab cards)
- `/journals` `/en/journals` → Journals (city journal list, filters, detail pages)
- `/route` `/en/route` → Route (interactive China map, city panels, linked journals)
- `/deconstruct` `/en/deconstruct` → Deconstruct (modification logs, equipment list)
- `/guide` `/en/guide` → Guide (participation guide, FAQ accordion, team)
- `/about` `/en/about` → About (Chaihuo history timeline, GSAP scroll-driven)

**React Islands pattern:** Each Astro page renders a `*Content.tsx` React component with `client:load` or `client:visible`. Data is fetched in `.astro` frontmatter (via `getCollection()` or JSON import), localized, then passed as props.

**Path alias:** `@` maps to `src/` (in `astro.config.mjs`)

## i18n System

**Config:** `astro.config.mjs` has `i18n: { defaultLocale: 'zh', locales: ['zh', 'en'], routing: { prefixDefaultLocale: false } }`

**Translation dictionaries:** `src/i18n/` — one file per page + shared UI:
- `index.ts` — `Locale` type, `getLangFromUrl()`, `t()`, `localize()`, `localePath()`, `getAlternateUrl()`
- `ui.ts` — nav, footer, site-wide strings
- `home.ts`, `journals.ts`, `route.ts`, `deconstruct.ts`, `guide.ts`, `about.ts` — page-specific strings

Each dict exports `Record<Locale, Record<string, string>>`. Astro pages select the dict by locale and pass it as `t` prop to React Islands.

**JSON data bilingualization:** JSON files in `src/data/` use `_en` suffix fields (`title_en`, `name_en`, `bio_en`, etc.). Use `localize(obj, ['field1', 'field2'], locale)` from `src/i18n/index.ts` to pick the right field before passing to React.

**English routes:** `src/pages/en/` mirrors the Chinese pages. Each English page is self-contained (not a thin wrapper) — it imports dicts, localizes data, and renders with the same React Islands.

**To add a new translatable string:**
1. Add zh/en entries to the relevant `src/i18n/*.ts` dict
2. Reference via `t['key.name']` in the React component

**To add a new `_en` field to JSON data:**
1. Add the field to the JSON file
2. Add the optional field to the schema in `src/content.config.ts`
3. Use `localize()` in the `.astro` page frontmatter

## Content Layer

- `src/content.config.ts` — Collection schemas (Zod). Collections: `notes`, `journals`, `equipment`, `team`, `faq`, `partners`, `heroes`
- `src/content/notes/*.md` — 改装手记 (modification logs)
- `src/content/journals/*.md` — 旅途日记 (travel journals)
- `src/data/*.json` — Structured data: equipment, team, faq, partners, heroes, timeline

Schema validation runs at build time — type errors will fail the build.

`scripts/validate-site.mjs` runs before build through `pnpm check` and validates cross-file references that Astro schemas cannot see: i18n key parity, zh/en page mirrors, route city IDs, team IDs, equipment IDs, public image paths, journal references, and boarding handoffs.

`playwright.config.ts` and `tests/harness/` provide AI self-iteration browser checks:
- `smoke.spec.ts` verifies core zh/en routes, published journal detail routes, and legacy documentation redirects.
- `ui-audit.spec.ts` verifies document language, landmarks, visible h1, image alt text, interactive accessible names, and link-name consistency.
- `visual.spec.ts` captures screenshots, checks text/layout substance, mobile/desktop overflow, runtime errors, and verifies the deconstruct page does not render the removed vehicle canvas.

See `docs/ai-iteration.md` for the recommended AI change loop.

**Content Collections (Astro 6):** Config file must be at `src/content.config.ts` (NOT `src/content/config.ts`). Import `z` from `astro/zod`, loaders from `astro/loaders`.

## Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — **no `tailwind.config` file**; all config in CSS via `@theme inline` in `theme.css`
- Design tokens as CSS custom properties in `theme.css` (`:root` light, `.dark` dark mode)
- `@theme inline { ... }` maps CSS vars to Tailwind tokens (`--color-*`, `--radius-*`)
- Animation: `tw-animate-css` (CSS) + `motion` (Framer Motion JS)
- **Color system** (60-30-10): Brand `brand` (#f3d230), surfaces `surface`/`surface-card`/`surface-dark`, neutrals `neutral-950`~`neutral-50`
- **Use `text-brand`, `bg-surface`, `text-neutral-700` etc. — avoid hardcoded hex or Tailwind gray-xxx**

## Gotchas

**CJS interop:** `react-slick` is CJS. Required workaround in `HomeContent.tsx`:
```typescript
import ReactSlick from 'react-slick';
const Slider = ('default' in ReactSlick ? (ReactSlick as any).default : ReactSlick) as typeof ReactSlick;
```

**Astro image imports in React Islands:** `import img from '@/assets/foo.png'` returns `{ src, width, height }` in Astro (not a string). In React components, extract `.src`:
```typescript
import logoImport from '@/assets/logo.png';
const logo = typeof logoImport === 'object' && logoImport !== null && 'src' in logoImport
  ? (logoImport as { src: string }).src : logoImport as string;
```

**改装手记 "查看全部":** Links to external Yuque page: `https://www.yuque.com/chaihuo-mcv/home`.

**Yuque journal sync:** `Sync Yuque Journals` GitHub Actions workflow syncs visible, publicly accessible Yuque `DOC` entries from `https://www.yuque.com/mouseart/mcv` once per day and via manual dispatch. It commits `src/data/yuque-journals.json` and `public/yuque-journals/*` changes back to `main`, which then triggers Jenkins deploy. DOC entries that appear in the Yuque TOC but return 401/403 are skipped until public access is restored.

**Production deployment debugging:** Production is served through Tengine/CDN and Jenkins, not Cloudflare Workers. For normal updates, ignore GitHub's Cloudflare Workers/Pages check; it is an unrelated external status check and is not the source of truth for `mcv.chaihuo.org`. If production is stale, check GitHub webhook deliveries for the Jenkins queue item, then inspect Jenkins job `chaihuo-chaihuo-mcv-site`. See `docs/deployment-yuque-sync.md`.

**Docker pnpm version:** Docker pins `pnpm@11.5.0`. Do not use `pnpm@latest` in Docker because pnpm lockfile validation can change across versions. If `pnpm-workspace.yaml` overrides change, regenerate and verify the lockfile with `corepack pnpm@11.5.0 install --lockfile-only --no-frozen-lockfile` and `corepack pnpm@11.5.0 install --frozen-lockfile --lockfile-only`.

## Conventions

- Content is in Simplified Chinese with English translations via i18n system
- Each Astro page wraps a React Island `*Content.tsx` component
- React components accept `locale` and `t` (dictionary) props for i18n
- Icons: Lucide React SVGs only — no emoji icons in UI
- Interactive elements must have `cursor-pointer` and `transition-colors duration-200`
- Navigation and Footer receive `locale` prop; internal links use `localePath()` helper
- `src/app/components/ui/` — shadcn/ui components — **do not modify manually**

## Current Status

### Active Branches

- `fix/yuque-first-image-cover` — Use each Yuque journal's first inline image as its card cover.

### Completed Features

- Home hero carousel has three background slides, including the snow mountain MCV image.
- Yuque journal sync includes the latest public DOC entries, runs every 10 minutes or by manual dispatch without dependency install, and skips inaccessible 401/403 docs.
- Production deployment runbook documents the Yuque sync, Jenkins webhook, and pnpm lockfile debugging path.
- Route map now extends through Lhasa, Golmud, Mangya, Ruoqiang, Korla, Aksu, and Shihezi, with completed route segments shown as solid lines and map pan/zoom gestures enabled.
- Route map now extends from Karamay to Urumqi, with Urumqi highlighted as the latest visited stop.
- Tracker Allen location updates can be checked through `pnpm update:city`; enabling hourly GitHub Actions requires a GitHub credential with `workflow` scope.
- Route map now extends from Urumqi to Hami, with Hami highlighted as the latest visited stop.

## Changelog

| Date | Branch | Description |
| --- | --- | --- |
| 2026-07-08 | fix/yuque-journal-sync | Restored Yuque journal sync by removing the failing dependency install, refreshed 3 public journal cards, skipped inaccessible 401/403 docs, and merged into main. |
| 2026-07-02 | feature/location-auto-update | Added the Tracker Allen location update script, added Hami as stop 27, updated route copy to 28 cities, and merged into main. |
| 2026-06-18 | dev | Extended the route map through Shihezi, added a hidden Korla return route point, and enabled map pan/zoom gestures before merging into main. |
| 2026-06-03 | main | Fixed Yuque journal sync deployment, aligned pnpm lockfile for Docker builds, and documented the production debugging runbook. |
| 2026-06-03 | dev | Synced the latest Yuque journal card, added coverage for unknown-city DOC sync, and merged into main. |
| 2026-06-02 | dev | Added the snow mountain MCV image as the third home hero carousel background and merged into main. |
| 2026-06-20 | fix/route-map-provinces | Updated route map visited provinces with full admin names, added Xizang/Qinghai/Xinjiang, adjusted fill color, and merged into main. |
| 2026-06-26 | feature/add-karamay | Added Karamay (克拉玛依) stop to route map (order 25, zh/en content), synced province fill colors in RoutePreview.tsx, and merged into main. |
| 2026-06-28 | dev | Added Urumqi (乌鲁木齐) stop to the route map after Karamay, updated route copy to 27 cities, and merged into main. |
