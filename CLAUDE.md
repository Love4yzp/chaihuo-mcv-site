# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

柴火基地车官网 (Chaihuo MCV Site) — a bilingual (zh/en) marketing website for Chaihuo's mobile AI laboratory vehicle "普罗米修斯号". Astro SSR site with five pages and Content Collections for structured data.

## Commands

- `pnpm dev` — start Astro dev server
- `pnpm build` — production build (Node standalone)
- `pnpm preview` — preview production build locally
- `pnpm start` — run production server (`node ./dist/server/entry.mjs`)
- `./deploy.sh` — Docker build + deploy (one command)

**pnpm only.** Do not use `npm` or `yarn`. `.npmrc` sets `legacy-peer-deps=true` for React 19 compatibility.

No test framework or linter is configured.

## Architecture

**Stack:** Astro 6 + React 19 (Islands) + TypeScript + Tailwind CSS 4 + shadcn/ui (Radix) + Framer Motion

**Deployment:** Node.js standalone via `@astrojs/node` adapter. Docker (`Dockerfile` + `docker-compose.yml`). GitHub push triggers deploy.

**Routing:** Astro file-based routing in `src/pages/`. Chinese is default (no prefix), English under `/en/`:
- `/` `/en/` → Home (hero carousel, video modal, China route map SVG, mobile lab cards)
- `/deconstruct` `/en/deconstruct` → Deconstruct (modification logs, equipment list)
- `/documentation` `/en/documentation` → Documentation (timeline, category filters)
- `/guide` `/en/guide` → Guide (participation guide, FAQ accordion, team)
- `/about` `/en/about` → About (Chaihuo history timeline, GSAP scroll-driven)

**React Islands pattern:** Each Astro page renders a `*Content.tsx` React component with `client:load` or `client:visible`. Data is fetched in `.astro` frontmatter (via `getCollection()` or JSON import), localized, then passed as props.

**Path alias:** `@` maps to `src/` (in `astro.config.mjs`)

## i18n System

**Config:** `astro.config.mjs` has `i18n: { defaultLocale: 'zh', locales: ['zh', 'en'], routing: { prefixDefaultLocale: false } }`

**Translation dictionaries:** `src/i18n/` — one file per page + shared UI:
- `index.ts` — `Locale` type, `getLangFromUrl()`, `t()`, `localize()`, `localePath()`, `getAlternateUrl()`
- `ui.ts` — nav, footer, site-wide strings
- `home.ts`, `deconstruct.ts`, `documentation.ts`, `guide.ts`, `about.ts` — page-specific strings

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

- `src/content.config.ts` — Collection schemas (Zod). Collections: `notes`, `docs`, `equipment`, `team`, `faq`, `partners`, `heroes`
- `src/content/notes/*.md` — 改装手记 (modification logs)
- `src/content/docs/*.md` — 时间线文档 (documentation timeline)
- `src/data/*.json` — Structured data: equipment, team, faq, partners, heroes, timeline

Schema validation runs at build time — type errors will fail the build.

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

## Conventions

- Content is in Simplified Chinese with English translations via i18n system
- Each Astro page wraps a React Island `*Content.tsx` component
- React components accept `locale` and `t` (dictionary) props for i18n
- Icons: Lucide React SVGs only — no emoji icons in UI
- Interactive elements must have `cursor-pointer` and `transition-colors duration-200`
- Navigation and Footer receive `locale` prop; internal links use `localePath()` helper
- `src/app/components/ui/` — shadcn/ui components — **do not modify manually**
