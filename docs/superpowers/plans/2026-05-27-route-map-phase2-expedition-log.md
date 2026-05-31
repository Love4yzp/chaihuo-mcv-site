# Route Map Phase 2 — Expedition Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn each city's click-panel into a four-facet "expedition log" (新世界 / 火种 / 越界 hook + 新文明 people + 剧照 photos), so the map reads as a voyage of bringing tech-fire to new worlds rather than a chronological log.

**Architecture:** Add an optional `expedition` object + reuse the `people`/`photos` fields on `RouteCity`. Render three small, data-driven, self-contained components (`ExpeditionLog`, `PeopleStrip`, `PhotoStrip`) at the top of `CityPanel`'s left column; every block renders only when its data exists, so stops without log data fall back to the current panel. Photos open in a shadcn `Dialog` lightbox.

**Tech Stack:** React 19, TypeScript, Tailwind v4, shadcn `dialog` (Radix), Playwright harness. pnpm only.

**Spec:** `docs/superpowers/specs/2026-05-27-route-map-phase2-expedition-log-design.md`

**Branch:** continue on `feature/route-map-semantic-zoom` (Phase 1 lives here; Phase 2 stacks on top). The spec and this plan are reference-only and are **NEVER committed** (`docs/superpowers/`). Code tasks DO commit.

**Pragmatic deviations from spec (this "先尝试" pass; refine later):**
- Story blocks are inserted at the **top of the existing left column**; the elevation chart is **left where it is** (not moved to the right column). Moving it is a later refinement.
- The 越界 hook lives inside `ExpeditionLog` (top of left column), not as a full-width band above both columns.
- People/photos for sample stops reuse **existing `/public` images as stand-ins**, clearly marked `SAMPLE` to swap for real material.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/data/route-cities.ts` | Remove unused `places`; rename `people.avatar`→`image`; add `expedition`; fill sample data for 柳州 + 毕节 | Modify |
| `src/features/route-map/ExpeditionLog.tsx` | 越界 hook + 🌐新世界 + 🔥火种 | Create |
| `src/features/route-map/PeopleStrip.tsx` | 👤新文明 — team-style people cards | Create |
| `src/features/route-map/PhotoStrip.tsx` | 📷剧照 — thumbnails + shadcn Dialog lightbox | Create |
| `src/features/route-map/CityPanel.tsx` | Insert the three blocks at top of left column (conditional) | Modify |
| `tests/harness/route-map-coordinates.spec.ts` | Render + fallback + lightbox tests | Modify |

---

## Task 1: Data model + sample content

**Files:**
- Modify: `src/data/route-cities.ts`

- [ ] **Step 1: Update the optional fields on the `RouteCity` interface**

Find the Phase-2 block in `export interface RouteCity` (the `photos?` / `people?` / `places?` lines) and replace those three lines with:

```ts
  // --- Phase 2 content hub (all optional; rendered when present) ---
  /** Four-facet expedition log: the hooks/one-liners are human-written (not derived). */
  expedition?: {
    world: string; world_en?: string;       // 新世界:闯进的场景/边疆
    fire: string; fire_en?: string;          // 火种:带去/点燃的能力·工具
    frontier: string; frontier_en?: string;  // 越界:跨过的那条线(碰撞,做钩子)
  };
  /** 新文明 — people met (image is a /public path string). */
  people?: { name: string; name_en?: string; role?: string; role_en?: string; image?: string; bio?: string; bio_en?: string }[];
  /** 剧照 — on-site photos (/public path strings). */
  photos?: { src: string; alt?: string; caption?: string; caption_en?: string }[];
```

(This drops the unused `places` field and renames `people.avatar`→`image` to match the `team` convention.)

- [ ] **Step 2: Add SAMPLE data to 柳州 (id `liuzhou`)**

In the `liuzhou` city object, after its `event: { ... }` block (before the closing `}` of the object), add:

```ts
    // SAMPLE content — replace people/photos with real material when available.
    expedition: {
      world: '桂中喀斯特盆地·三都镇的养殖与种植基地,泥泞起伏的农业一线。',
      world_en: 'A karst-basin aquaculture & farming base in Sandu Town — the muddy front line of agriculture.',
      fire: '车载边缘 AI 摄像头与六轴机械臂,把实验室级的检测能力带到鱼塘边。',
      fire_en: 'On-board edge-AI cameras and a 6-axis arm bring lab-grade detection to the pond’s edge.',
      frontier: '把六轴机械臂,开进了养鱼塘。',
      frontier_en: 'We drove a 6-axis robotic arm into a fish pond.',
    },
    people: [
      { name: '韦师傅', name_en: 'Mr. Wei', role: '三都新农人', role_en: 'New-gen farmer, Sandu', image: '/people/ray-pipi.jpg', bio: '在地养殖户,和团队探讨 AI 检测怎么用在水产养殖里。', bio_en: 'Local fish farmer exploring how AI detection fits aquaculture.' },
    ],
    photos: [
      { src: '/heroes/karst-guangxi.webp', caption: '桂中喀斯特地貌', caption_en: 'Karst landscape, central Guangxi' },
    ],
```

- [ ] **Step 3: Add SAMPLE data to 毕节 (id `bijie`) — people only, no photos (exercises the partial path)**

In the `bijie` city object, after its `event: { ... }` block, add:

```ts
    // SAMPLE content — replace with real material when available.
    expedition: {
      world: '乌蒙山腹地,无电网的高原峡谷。',
      world_en: 'Deep in the Wumeng Mountains — an off-grid highland valley.',
      fire: '普罗米修斯号的离线微电网与太阳能调度,在无电之地点亮创客的工作台。',
      fire_en: 'Prometheus’ off-grid micro-grid and solar dispatch light up a maker’s bench where there is no power.',
      frontier: '在没有电网的山里,我们自己发电做创客。',
      frontier_en: 'In mountains with no grid, we generate our own power and make.',
    },
    people: [
      { name: '创客 · 默', name_en: 'Maker Mo', role: '在地青年创客', role_en: 'Local young maker', image: '/people/haonan.jpg', bio: '深居乌蒙山区的青年创客,记录他的实践与生长故事。', bio_en: 'A young maker in the Wumeng mountains; documenting his practice and story.' },
    ],
```

- [ ] **Step 4: Type-check**

Run:
```bash
pnpm exec astro check 2>&1 | tail -5
```
Expected: 0 errors. (No code references `places` — the deconstruct/route pages don't use it. If astro check reports a `places` or `avatar` reference elsewhere, fix that reference, but there should be none.)

- [ ] **Step 5: Commit**

```bash
git add src/data/route-cities.ts
git commit -m "feat(route-map): add expedition log fields + sample data (柳州/毕节); drop unused places

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `PhotoStrip` component (thumbnails + lightbox)

**Files:**
- Create: `src/features/route-map/PhotoStrip.tsx`

- [ ] **Step 1: Confirm the dialog exports**

Run:
```bash
grep -nE "^  Dialog|export \{" src/app/components/ui/dialog.tsx | head
```
Expected: the export block includes `Dialog`, `DialogContent`, `DialogTrigger`, `DialogTitle`. (All shadcn dialogs export these. If `DialogTitle` is absent, it must still be importable from the file — Radix requires a title for a11y.)

- [ ] **Step 2: Create `src/features/route-map/PhotoStrip.tsx`**

```tsx
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/app/components/ui/dialog";
import type { Locale } from "@/i18n/index";

export interface RoutePhoto {
  src: string;
  alt?: string;
  caption?: string;
  caption_en?: string;
}

export default function PhotoStrip({ photos, locale }: { photos?: RoutePhoto[]; locale: Locale }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div data-photo-strip="true" className="flex flex-wrap gap-2">
      {photos.map((p, i) => {
        const caption = locale === "zh" ? p.caption : p.caption_en ?? p.caption;
        const label = p.alt ?? caption ?? "photo";
        return (
          <Dialog key={`${p.src}-${i}`}>
            <DialogTrigger asChild>
              <button
                type="button"
                data-photo-thumb="true"
                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#e5dfd3] cursor-pointer"
                aria-label={label}
              >
                <img
                  src={p.src}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-none bg-black/90 p-3">
              <DialogTitle className="sr-only">{label}</DialogTitle>
              <img src={p.src} alt={label} className="h-auto w-full rounded-lg" />
              {caption && <p className="mt-2 text-center text-xs text-neutral-300">{caption}</p>}
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

Run:
```bash
pnpm exec astro check 2>&1 | grep -iE "PhotoStrip|error" | head || echo "no PhotoStrip errors"
```
Expected: no errors.
```bash
git add src/features/route-map/PhotoStrip.tsx
git commit -m "feat(route-map): PhotoStrip — thumbnail strip with dialog lightbox

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `PeopleStrip` component (team-style cards)

**Files:**
- Create: `src/features/route-map/PeopleStrip.tsx`

- [ ] **Step 1: Create `src/features/route-map/PeopleStrip.tsx`**

```tsx
import type { Locale } from "@/i18n/index";

export interface RoutePerson {
  name: string;
  name_en?: string;
  role?: string;
  role_en?: string;
  image?: string;
  bio?: string;
  bio_en?: string;
}

export default function PeopleStrip({ people, locale }: { people?: RoutePerson[]; locale: Locale }) {
  if (!people || people.length === 0) return null;
  const pick = (zh?: string, en?: string) => (locale === "zh" ? zh : en ?? zh);

  return (
    <div data-people-strip="true" className="flex flex-col gap-2.5">
      {people.map((p, i) => {
        const name = pick(p.name, p.name_en) ?? p.name;
        const role = pick(p.role, p.role_en);
        const bio = pick(p.bio, p.bio_en);
        return (
          <div
            key={`${p.name}-${i}`}
            data-people-card="true"
            className="flex items-start gap-3 rounded-xl border border-[#e5dfd3]/50 bg-[#f5f2eb]/60 p-2.5"
          >
            {p.image && (
              <img
                src={p.image}
                alt={name}
                loading="lazy"
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-neutral-800">{name}</span>
                {role && <span className="text-[10px] font-medium text-amber-700">{role}</span>}
              </div>
              {bio && <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">{bio}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run:
```bash
pnpm exec astro check 2>&1 | grep -iE "PeopleStrip|error" | head || echo "no PeopleStrip errors"
```
Expected: no errors.
```bash
git add src/features/route-map/PeopleStrip.tsx
git commit -m "feat(route-map): PeopleStrip — team-style people cards

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `ExpeditionLog` component (hook + 新世界 + 火种)

**Files:**
- Create: `src/features/route-map/ExpeditionLog.tsx`

- [ ] **Step 1: Create `src/features/route-map/ExpeditionLog.tsx`**

```tsx
import { Globe, Flame, Zap } from "lucide-react";
import type { Locale } from "@/i18n/index";

export interface Expedition {
  world: string;
  world_en?: string;
  fire: string;
  fire_en?: string;
  frontier: string;
  frontier_en?: string;
}

export default function ExpeditionLog({ expedition, locale }: { expedition?: Expedition; locale: Locale }) {
  if (!expedition) return null;
  const pick = (zh: string, en?: string) => (locale === "zh" ? zh : en ?? zh);

  return (
    <div data-expedition-log="true" className="flex flex-col gap-3">
      {/* 越界:钩子 */}
      <div className="flex items-start gap-2 rounded-r-lg border-l-2 border-brand bg-brand/10 px-3 py-2">
        <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
        <p className="text-[15px] font-bold leading-snug text-neutral-900">
          {pick(expedition.frontier, expedition.frontier_en)}
        </p>
      </div>

      {/* 新世界 */}
      <div className="flex items-start gap-2">
        <Globe className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {locale === "zh" ? "新世界" : "NEW WORLD"}
          </h5>
          <p className="text-[12.5px] leading-snug text-neutral-700">{pick(expedition.world, expedition.world_en)}</p>
        </div>
      </div>

      {/* 火种 */}
      <div className="flex items-start gap-2">
        <Flame className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {locale === "zh" ? "火种" : "THE FIRE"}
          </h5>
          <p className="text-[12.5px] leading-snug text-neutral-700">{pick(expedition.fire, expedition.fire_en)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run:
```bash
pnpm exec astro check 2>&1 | grep -iE "ExpeditionLog|error" | head || echo "no ExpeditionLog errors"
```
Expected: no errors.
```bash
git add src/features/route-map/ExpeditionLog.tsx
git commit -m "feat(route-map): ExpeditionLog — 越界 hook + 新世界 + 火种

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Integrate the three blocks into `CityPanel`

**Files:**
- Modify: `src/features/route-map/CityPanel.tsx`

Read `CityPanel.tsx` first. The left column is the `<div className="flex-1 flex flex-col justify-between">` whose inner `<div>` starts with a `<header>` containing the city name. The blocks go **right after that `</header>`**, before the elevation-profile chart.

- [ ] **Step 1: Add imports**

At the top of `CityPanel.tsx`, with the other imports, add:

```tsx
import ExpeditionLog from "./ExpeditionLog";
import PeopleStrip from "./PeopleStrip";
import PhotoStrip from "./PhotoStrip";
import { Users as UsersIcon, Image as ImageIcon } from "lucide-react";
```

(If `Users` is already imported from `lucide-react` in this file, reuse it and only add `Image as ImageIcon`; do not import `Users` twice.)

- [ ] **Step 2: Insert the story blocks after the header**

Immediately after the `</header>` in the left column (and before the elevation-profile `<div className="mb-6 ...">`), insert:

```tsx
                {/* 航行日志:越界钩子 + 新世界 + 火种 */}
                {city.expedition && (
                  <div className="mb-6">
                    <ExpeditionLog expedition={city.expedition} locale={locale} />
                  </div>
                )}

                {/* 新文明 */}
                {city.people && city.people.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-brand" />
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#796f59]">
                        {locale === "zh" ? "新文明 · 遇见的人" : "NEW CIVILIZATIONS"}
                      </h5>
                    </div>
                    <PeopleStrip people={city.people} locale={locale} />
                  </div>
                )}

                {/* 剧照 */}
                {city.photos && city.photos.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-brand" />
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#796f59]">
                        {locale === "zh" ? "剧照" : "FROM THE FIELD"}
                      </h5>
                    </div>
                    <PhotoStrip photos={city.photos} locale={locale} />
                  </div>
                )}
```

These render only when the data exists, so stops without `expedition`/`people`/`photos` are unchanged (fallback to the existing elevation chart + `event.summary`).

- [ ] **Step 3: Build (types + content + SSR)**

Run:
```bash
pnpm run check
```
Expected: PASS (0 errors). Fix any duplicate-import or type errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/route-map/CityPanel.tsx
git commit -m "feat(route-map): render expedition log / people / photos in CityPanel (data-gated)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Playwright tests (render + fallback + lightbox)

**Files:**
- Modify: `tests/harness/route-map-coordinates.spec.ts`

City hit areas render in `order` sequence; `liuzhou` is order 5 (`nth(5)`), `shenzhen` is order 0 (`nth(0)`).

- [ ] **Step 1: Append the tests**

Add to the end of `tests/harness/route-map-coordinates.spec.ts`:

```ts
test('route page renders expedition log + people + photo for a stop with data', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 柳州 (order 5) by clicking its hit area.
  await page.locator('main svg circle[fill="transparent"]').nth(5).dispatchEvent('click');

  await expect(page.locator('[data-expedition-log="true"]')).toBeVisible();
  await expect(page.getByText('把六轴机械臂，开进了养鱼塘。')).toBeVisible();
  await expect(page.locator('[data-people-card="true"]').first()).toBeVisible();
  await expect(page.locator('[data-photo-thumb="true"]').first()).toBeVisible();
});

test('route page photo thumbnail opens a lightbox dialog', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });
  await page.locator('main svg circle[fill="transparent"]').nth(5).dispatchEvent('click');

  await page.locator('[data-photo-thumb="true"]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('img')).toBeVisible();
});

test('route page falls back gracefully for a stop without expedition data', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 深圳 (order 0) — it has no expedition data.
  await page.locator('main svg circle[fill="transparent"]').nth(0).dispatchEvent('click');

  await expect(page.locator('[data-expedition-log="true"]')).toHaveCount(0);
  // The panel still shows real content (the city heading remains).
  await expect(page.getByRole('heading', { name: '深圳' })).toBeVisible();
});
```

- [ ] **Step 2: Run the new tests (desktop, serial for stability)**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop --workers=1 -g "expedition|lightbox|falls back"
```
Expected: 3 passed. (First run builds the site — a few minutes.) If selecting 柳州 doesn't open its panel, confirm the hit-area index: the panel-driving click is `onSelect(city.label)`; `nth(5)` corresponds to `order` 5 = 柳州.

- [ ] **Step 3: Run the full route-map spec (no regression)**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop --workers=1
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add tests/harness/route-map-coordinates.spec.ts
git commit -m "test(route-map): expedition log render, lightbox, and graceful fallback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after all tasks)

- [ ] `pnpm dev` → `/route`, click 柳州: panel shows the bold 越界 hook, 🌐新世界 / 🔥火种 lines, a 新文明 person card, and a 剧照 thumbnail that opens a lightbox. Click 深圳: no log blocks, normal panel. Check `/en/route` 柳州 shows the English copy.

## Self-Review (author)

- **Spec coverage:** §2 data model → Task 1 (expedition + people(image) + photos; places removed). §3 layout (story blocks, 越界 hook, data-gated) → Tasks 4–5 (pragmatic: blocks at top of left column, elevation not moved — flagged). §4 components → Tasks 2–4 (`PhotoStrip`/`PeopleStrip`/`ExpeditionLog`, each self-contained, render-only-when-data). §5 lightbox + fallback → Task 2 (Dialog) + Task 5 (conditional render) + Task 6 (fallback test). §6 tests → Task 6. §7 sample material → Task 1 (柳州 full, 毕节 people-only, real /public images as SAMPLE). HERO/RoutePreview untouched (no task touches them).
- **Placeholder scan:** none — full component code, real image paths, exact commands. Sample copy is real strings, marked SAMPLE.
- **Type consistency:** `Expedition`/`RoutePerson`/`RoutePhoto` shapes match the `RouteCity` fields in Task 1; components consume `city.expedition`/`city.people`/`city.photos` with matching prop names; `data-expedition-log`/`data-people-card`/`data-photo-thumb`/`data-photo-strip`/`data-people-strip` hooks used consistently in Tasks 2–6.
- **Note:** harness is e2e-only (no React unit runner), so component behavior is verified via Playwright in Task 6 rather than per-component unit tests — appropriate for this codebase.
