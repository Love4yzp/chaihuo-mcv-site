# Route Map Semantic Zoom — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/route` map pan/zoomable so it shows the whole horse-shaped national route when zoomed out and readable cities when zoomed in, and fix the bug where dense southern labels detach from their dots.

**Architecture:** Keep the existing d3-geo + SVG + Framer Motion stack. Add `d3-zoom` driving a single `transform` on a *scaled* `<g>` that holds all geographic elements (provinces, horse, route, dots, elevation). Render city-name **labels in a separate unscaled overlay** at screen coordinates so font size stays constant and label collision is computed in screen space. Change `placeLabels` from "stack far away" to "place near the dot or hide it" — which both fixes the detachment bug and produces semantic-zoom behavior (crowded → hidden, spread out → shown). Remove the 3D tilt and the gsap vehicle indicator, which conflict with drag-to-pan.

**Tech Stack:** TypeScript, React 19, d3-geo (existing), **d3-zoom / d3-selection / d3-transition (new)**, Framer Motion (`motion/react`), Playwright (test harness). pnpm only.

**Spec:** `docs/superpowers/specs/2026-05-26-route-map-semantic-zoom-design.md`

**Branch:** `feature/route-map-semantic-zoom` (already created). The spec and this plan are working references and are **not** committed (per user). Code tasks below DO commit.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/features/route-map/label-layout.ts` | Collision-aware label placement; now culls labels that can't sit near their dot | Modify |
| `src/features/route-map/useMapZoom.ts` | d3-zoom wiring + pure transform helpers (`centerOn`, `IDENTITY`) | Create |
| `src/features/route-map/ChinaRouteMap.tsx` | Interactive map: two-layer render, zoom integration, recenter button; remove tilt + gsap/vehicle | Modify |
| `src/data/route-cities.ts` | `RouteCity` gains optional `photos`/`people`/`places` (type only this phase) | Modify |
| `tests/harness/route-map-coordinates.spec.ts` | Update label expectations for culling; add zoom behavior tests | Modify |
| `package.json` | Add d3-zoom/d3-selection/d3-transition + types | Modify (via pnpm) |

**Scope note (deviation from spec §5):** This phase adds only the *data type* fields for photos/people/places. Rendering them in `CityPanel` (the `PhotoStrip`/`PeopleList`/`PlaceList` blocks) is deferred to Phase 2 because there is no content or visual design yet (YAGNI). The type fields are added now so future data is type-safe.

---

## Task 1: Add d3-zoom dependencies

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install runtime + type packages**

```bash
pnpm add d3-zoom d3-selection d3-transition
pnpm add -D @types/d3-zoom @types/d3-selection @types/d3-transition
```

- [ ] **Step 2: Verify the imports resolve**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | head -20 || true
node -e "require('d3-zoom'); require('d3-selection'); console.log('d3 deps OK')"
```
Expected: `d3 deps OK` printed; no module-resolution errors for `d3-zoom`/`d3-selection`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add d3-zoom/d3-selection/d3-transition for route map zoom

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `placeLabels` — place near the dot or hide it

This is the core fix. Today, when a label cannot find a free nearby slot, `placeLabels` keeps climbing lanes until it finds a *far-away* collision-free spot (score 0) — that is the detachment bug. New rule: a label is only placed if it can sit **within `MAX_LABEL_DISTANCE` of its dot without overlapping another label**; otherwise it is culled (returns `null`). Origin/latest (priority ≥ 3) are always shown at their least-bad nearby slot.

**Files:**
- Modify: `src/features/route-map/label-layout.ts`
- Test: `tests/harness/route-map-coordinates.spec.ts` (unit test block at top — no page needed)

- [ ] **Step 1: Write failing unit tests**

Add these tests to `tests/harness/route-map-coordinates.spec.ts` right after the existing `'label placement is indexed by stable city id'` test (reuse the existing `makeProjectedCity` helper):

```ts
test('placeLabels hides a low-priority label that cannot sit near its dot', () => {
  // Three dots crammed together: only some labels can fit without overlap.
  const placements = placeLabels([
    makeProjectedCity({ id: 'a', label: '甲', cx: 100, cy: 100, order: 0, visited: true }),
    makeProjectedCity({ id: 'b', label: '乙', cx: 108, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'c', label: '丙', cx: 116, cy: 100, order: 2, visited: true }),
  ]);
  // At least one of the crammed labels is culled rather than flung far away.
  const culled = ['a', 'b', 'c'].filter((id) => placements.get(id) === null);
  expect(culled.length).toBeGreaterThan(0);
});

test('placeLabels always keeps the origin label even when crowded', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'origin', label: '深圳', cx: 100, cy: 100, order: 0, isOrigin: true, visited: true }),
    makeProjectedCity({ id: 'x', label: '甲', cx: 106, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'y', label: '乙', cx: 112, cy: 100, order: 2, visited: true }),
  ]);
  expect(placements.get('origin')).not.toBeNull();
});

test('placeLabels keeps a placed label within MAX_LABEL_DISTANCE of its dot', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'solo', label: '成都', cx: 300, cy: 300, order: 0, visited: true }),
  ]);
  const offset = placements.get('solo');
  expect(offset).not.toBeNull();
  // offset magnitude (dot -> label anchor) stays small/near
  const [dx, dy] = offset as [number, number];
  expect(Math.hypot(dx, dy)).toBeLessThan(40);
});

test('placeLabels shows all labels once dots are spread far apart', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'a', label: '甲', cx: 100, cy: 100, order: 0, visited: true }),
    makeProjectedCity({ id: 'b', label: '乙', cx: 300, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'c', label: '丙', cx: 500, cy: 100, order: 2, visited: true }),
  ]);
  expect(placements.get('a')).not.toBeNull();
  expect(placements.get('b')).not.toBeNull();
  expect(placements.get('c')).not.toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "placeLabels" --project=chromium-desktop
```
Expected: FAIL — current `placeLabels` never returns `null`, so the "hides a low-priority label" test fails (`culled.length` is 0).

- [ ] **Step 3: Rewrite the placement core in `label-layout.ts`**

Add the distance constant and helper near the top constants (after `RECT_PADDING`):

```ts
const MAX_LABEL_DISTANCE = 30; // px — a label must sit this close to its dot, or it is hidden

// Distance from the dot to the CENTER of the label box for a given offset.
function offsetDistance(c: ProjectedCity, dx: number, dy: number): number {
  const { w, h } = labelDims(c);
  const lcx = dx + w / 2;        // label box center relative to dot
  const lcy = dy - h * 0.85 + h / 2;
  return Math.hypot(lcx, lcy);
}

function overlapsAnyLabel(bb: Rect, placed: Rect[]): boolean {
  return placed.some((r) => rectsOverlap(r, bb));
}

function dotOverlapCount(bb: Rect, dotBoxes: Array<{ id: string; rect: Rect }>, cityId: string): number {
  let n = 0;
  for (const dot of dotBoxes) {
    if (dot.id !== cityId && rectsOverlap(dot.rect, bb)) n += 1;
  }
  return n;
}
```

Replace the entire `placeLabels` function body (the `for (const city of ordered)` loop and what follows) with:

```ts
  for (const city of ordered) {
    const candidates = candidateOffsets(city, mode);
    const alwaysShow = priority(city) >= 3; // origin or latest are never hidden

    let chosen: LabelOffset | null = null;
    let chosenBox: Rect | null = null;
    let chosenCost = Infinity;

    // Best-effort fallback for must-show cities (ignores distance + overlap).
    let mustShow: { offset: LabelOffset; rect: Rect; cost: number } | null = null;

    for (const [dx, dy] of candidates) {
      const dist = offsetDistance(city, dx, dy);
      const rect = padded(bboxAt(city, dx, dy));
      const labelHit = overlapsAnyLabel(rect, placed);

      if (alwaysShow) {
        const fb = (labelHit ? 1000 : 0) + dotOverlapCount(rect, dotBoxes, city.id) * 100 + dist;
        if (!mustShow || fb < mustShow.cost) mustShow = { offset: [dx, dy], rect, cost: fb };
      }

      if (dist > MAX_LABEL_DISTANCE) continue; // too far from its dot
      if (labelHit) continue;                  // would overlap another label

      const cost = dotOverlapCount(rect, dotBoxes, city.id) * 100 + dist;
      if (cost < chosenCost) {
        chosen = [dx, dy];
        chosenBox = rect;
        chosenCost = cost;
      }
    }

    if (!chosen && alwaysShow && mustShow) {
      chosen = mustShow.offset;
      chosenBox = mustShow.rect;
    }

    if (chosen && chosenBox) {
      placed.push(chosenBox);
      result.set(city.id, chosen);
    } else {
      result.set(city.id, null); // culled — no readable spot near its dot
    }
  }

  return result;
}
```

(The `collisionScore` helper is now unused — delete it to avoid dead code.)

- [ ] **Step 4: Run the unit tests to verify they pass**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "placeLabels|indexed by stable" --project=chromium-desktop
```
Expected: PASS (all `placeLabels` tests + the existing id-indexing test).

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/label-layout.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "fix(route-map): hide labels that can't sit near their dot instead of flinging them away

Replaces the lane-stacking fallback with a proximity rule: a label is placed
only if it fits within MAX_LABEL_DISTANCE of its dot without overlapping another
label; otherwise it is culled (origin/latest always shown). Fixes the detached
southern-cluster labels and yields semantic-zoom behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `useMapZoom` hook + pure transform helpers

**Files:**
- Create: `src/features/route-map/useMapZoom.ts`
- Test: `tests/harness/route-map-coordinates.spec.ts` (unit block — pure helpers)

- [ ] **Step 1: Write failing unit tests for the pure helpers**

Add to `tests/harness/route-map-coordinates.spec.ts` (top section, with the other unit tests). Add this import at the top of the file with the other imports:

```ts
import { centerOn, IDENTITY } from '../../src/features/route-map/useMapZoom';
```

Tests:

```ts
test('centerOn places the target point at the canvas center', () => {
  const t = centerOn([200, 150], 3, 900, 600);
  expect(t.k).toBe(3);
  // screen position of the point = t.x + k*px , t.y + k*py  → should be canvas center
  expect(t.x + t.k * 200).toBeCloseTo(450, 5);
  expect(t.y + t.k * 150).toBeCloseTo(300, 5);
});

test('IDENTITY is the no-op transform', () => {
  expect(IDENTITY).toEqual({ x: 0, y: 0, k: 1 });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "centerOn|IDENTITY" --project=chromium-desktop
```
Expected: FAIL — `useMapZoom` module does not exist yet.

- [ ] **Step 3: Create `src/features/route-map/useMapZoom.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
import "d3-transition"; // augments d3-selection with .transition()

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export const IDENTITY: Transform = { x: 0, y: 0, k: 1 };

/** Transform that centers `point` (in unscaled map coords) on the canvas at scale `k`. */
export function centerOn(
  point: [number, number],
  k: number,
  width: number,
  height: number,
): Transform {
  return { x: width / 2 - k * point[0], y: height / 2 - k * point[1], k };
}

interface UseMapZoomOptions {
  minScale?: number;
  maxScale?: number;
}

/**
 * Wires d3-zoom onto an <svg>. The returned `transform` should be applied as
 * `translate(x,y) scale(k)` to the scaled <g>. Geographic elements live inside
 * that group; labels are positioned manually in screen space (see ChinaRouteMap).
 */
export function useMapZoom(width: number, height: number, opts: UseMapZoomOptions = {}) {
  const minScale = opts.minScale ?? 1;
  const maxScale = opts.maxScale ?? 8;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([minScale, maxScale])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform;
        setTransform({ x: t.x, y: t.y, k: t.k });
      });

    zoomRef.current = behavior;
    const selection = select(svg);
    selection.call(behavior);

    return () => {
      selection.on(".zoom", null);
    };
  }, [width, height, minScale, maxScale]);

  const applyTransform = useCallback((t: Transform, animate = true) => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    const target = zoomIdentity.translate(t.x, t.y).scale(t.k);
    const selection = select(svg);
    if (animate) {
      selection.transition().duration(600).call(behavior.transform, target);
    } else {
      selection.call(behavior.transform, target);
    }
  }, []);

  const reset = useCallback(() => applyTransform(IDENTITY), [applyTransform]);

  const zoomToCity = useCallback(
    (point: [number, number], k = 3.2) => {
      applyTransform(centerOn(point, k, width, height));
    },
    [applyTransform, width, height],
  );

  return { svgRef, transform, reset, zoomToCity };
}
```

- [ ] **Step 4: Run to verify the pure-helper tests pass**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "centerOn|IDENTITY" --project=chromium-desktop
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/useMapZoom.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "feat(route-map): add useMapZoom hook with centerOn/reset/zoomToCity

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Integrate zoom into `ChinaRouteMap` — two-layer render, remove tilt + gsap/vehicle

This is the largest task. Work in sub-steps and run the build between structural edits.

**Files:**
- Modify: `src/features/route-map/ChinaRouteMap.tsx`

- [ ] **Step 1: Remove gsap + vehicle indicator + 3D tilt**

In `src/features/route-map/ChinaRouteMap.tsx`:

1. Delete the import `import gsap from "gsap";` (line 4). **Do not touch `package.json`** — `gsap` stays for `AboutContent.tsx`.
2. Delete the vehicle block: state `vehiclePos`, `vehicleAngle`, refs `vehicleTweenRef`, `prevOrderRef`, and the entire `useEffect` that runs the gsap tween (currently lines ~46–120).
3. Delete the vehicle render block (the `{vehiclePos && ( ... )}` group, currently lines ~550–568).
4. Remove the 3D tilt: delete `const [rotate, setRotate] = useState({ x: 20, y: -8 });`. In `handleMouseMove` remove the `setRotate({...})` call (keep the `setGlarePos` call). In `handleMouseLeave` remove the `setRotate({...})` call (keep `setIsHovered(false)`). On the `motion.div` (currently lines ~176–187) remove the `perspective(...) rotateX rotateY` transform, `transformStyle`, the `animate={{ rotateX, rotateY }}` and its `transition`. Replace the `motion.div` with a plain `<div className="w-full h-full relative">`.

- [ ] **Step 2: Build to confirm the file still compiles after removals**

Run:
```bash
pnpm exec astro check 2>&1 | grep -iE "ChinaRouteMap|error" | head -30 || echo "no ChinaRouteMap errors"
```
Expected: no errors referencing `ChinaRouteMap.tsx` (any remaining errors should be about now-unused vars you must also remove).

- [ ] **Step 3: Wire `useMapZoom` and split rendering into scaled group + label overlay**

Update imports at top of `ChinaRouteMap.tsx`:

```ts
import { Fragment, useState, useMemo, useRef, type ReactElement } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { MapPin, Maximize2 } from "lucide-react";
import type { RouteCity } from "@/data/route-cities";
import type { ProjectedCity } from "./types";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  geoData,
  pathGenerator,
  projectCities,
  placeLabels,
  buildCityLines,
  horseRouteD,
} from "./projection";
import { useMapZoom } from "./useMapZoom";
```

Inside the component, after `const segments = ...`, add the zoom hook and a screen-space label computation. **Replace** the existing `labelPositions`/`projected`/`routeProjected` memo wiring with:

```ts
  const projected = useMemo(() => projectCities(cities), [cities]);
  const segments = useMemo(() => buildCityLines(projected), [projected]);
  const current = useMemo(
    () => [...projected].reverse().find((c) => c.visited),
    [projected],
  );

  const { svgRef, transform, reset, zoomToCity } = useMapZoom(MAP_WIDTH, MAP_HEIGHT);
  const groupTransform = `translate(${transform.x},${transform.y}) scale(${transform.k})`;

  // Labels live in an UNSCALED overlay. Compute their screen positions by
  // applying the zoom transform to each marker (cy already minus elevation),
  // then run placeLabels in screen space so font size stays constant and
  // collisions are resolved at the current zoom level.
  const screenLabelCities = useMemo<ProjectedCity[]>(
    () =>
      projected.map((c) => ({
        ...c,
        cx: transform.x + transform.k * c.cx,
        cy: transform.y + transform.k * (c.cy - c.elevationOffset),
      })),
    [projected, transform],
  );
  const labelOffsets = useMemo(() => placeLabels(screenLabelCities, 'above'), [screenLabelCities]);
```

- [ ] **Step 4: Restructure the SVG body — scaled group + overlay**

Replace the `<svg ...>` opening tag so it carries the ref and a grab cursor:

```tsx
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full drop-shadow-[0_12px_35px_rgba(0,0,0,0.04)] cursor-grab active:cursor-grabbing touch-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
```

Wrap **all geographic layers** (the grid `<g>`, radar `<g>`, provinces `<g>`, the horse `motion.path`, the `segments.map(...)` block, and the `projected.map(...)` block that draws elevation/dots/hit-areas — **but excluding the label `<motion.text>`**) inside one scaled group:

```tsx
          <g transform={groupTransform}>
            {/* ...grid, radar, provinces, horse, segments, city dots/elevation/hit-areas... */}
          </g>
```

Inside the `projected.map((city) => ...)` block, **remove** the `{showLabel && (<motion.text ...>...)}` element entirely (labels move to the overlay below). Keep the dots, elevation lines, pulse, origin ring, selected ring, and the transparent hit-area circle. Change the hit-area `onClick` to also zoom to the city:

```tsx
                <circle
                  cx={markerX}
                  cy={markerY}
                  r={city.visited ? 18 : 12}
                  fill="transparent"
                  className={city.visited ? 'cursor-pointer' : 'cursor-help'}
                  onClick={
                    city.visited
                      ? () => {
                          onSelect(city.label);
                          zoomToCity([markerX, markerY]);
                        }
                      : undefined
                  }
                  onMouseEnter={() => setHoveredCity(city)}
                  onMouseLeave={() => setHoveredCity(null)}
                />
```

After the closing `</g>` of the scaled group (and after the hover tooltip group, which can stay as-is but must use screen coords — see Step 6), add the **label overlay** (NOT inside the scaled group):

```tsx
          {/* 标注层（不缩放）：城市名在屏幕空间，字号恒定 */}
          {projected.map((city) => {
            const offset = labelOffsets.get(city.id);
            if (!city.showLabel || !offset) return null;
            const sx = transform.x + transform.k * city.cx;
            const sy = transform.y + transform.k * (city.cy - city.elevationOffset);
            const isLatest = city.isLatest;
            return (
              <motion.text
                key={`label-${city.id}`}
                data-route-city-label="true"
                data-city-id={city.id}
                x={sx + offset[0]}
                y={sy + offset[1]}
                fill={isLatest ? '#1a1408' : city.visited ? '#3a3328' : '#6b6149'}
                fontSize={city.fontSize}
                fontWeight={isLatest ? 700 : city.visited ? 600 : 400}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  paintOrder: 'stroke',
                  stroke: '#f2ede4',
                  strokeWidth: 3.5,
                  strokeLinejoin: 'round',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {city.label}
              </motion.text>
            );
          })}
```

- [ ] **Step 5: Add the "back to full view" (recenter) button**

After the existing legend/badge `<div>`s (inside the outer container `<div ref={mapRef}>`, after the `</motion.div>`/`</div>` that wraps the svg), add:

```tsx
      {/* 回到全马视图 */}
      <button
        type="button"
        onClick={() => reset()}
        aria-label={t['map.recenter'] ?? '回到全图'}
        className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md p-2.5 rounded-xl text-neutral-600 hover:text-brand shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60 cursor-pointer transition-colors duration-200"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
```

- [ ] **Step 6: Fix the hover tooltip to use screen coords**

The hover tooltip `<motion.g>` currently uses `transform={`translate(${hoveredCity.cx}, ${hoveredCity.cy - hoveredCity.elevationOffset - 10})`}`. Since it sits outside the scaled group now, convert to screen coords:

```tsx
                transform={`translate(${transform.x + transform.k * hoveredCity.cx}, ${transform.y + transform.k * (hoveredCity.cy - hoveredCity.elevationOffset) - 10})`}
```

- [ ] **Step 7: Build the whole site to confirm types + SSR**

Run:
```bash
pnpm run check
```
Expected: PASS (content + astro check). Fix any unused-import/var errors (e.g., a leftover `routeProjected`).

- [ ] **Step 8: Commit**

```bash
git add src/features/route-map/ChinaRouteMap.tsx
git commit -m "feat(route-map): pan/zoom map with screen-space labels; remove 3D tilt + gsap vehicle

Geographic layers render inside a d3-zoom-driven scaled <g>; labels render in an
unscaled overlay at screen coords (constant font, zoom-aware collision). Click a
city to zoom-to-center; a recenter button returns to the full view. Removes the
mouse-tilt 3D effect and the gsap vehicle tracer (gsap dependency kept for the
About page).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add optional photo/people/place fields to `RouteCity`

**Files:**
- Modify: `src/data/route-cities.ts`

- [ ] **Step 1: Add the optional fields to the `RouteCity` interface**

In `src/data/route-cities.ts`, inside `export interface RouteCity { ... }`, after the existing `event?: RouteCityEvent;` line, add:

```ts
  // --- Phase 2 content hub (all optional; rendered when present) ---
  /** Photo paths under /public (string paths avoid the Astro image-import object gotcha). */
  photos?: { src: string; alt?: string; caption?: string; caption_en?: string }[];
  /** Representative people met at this stop. */
  people?: { name: string; name_en?: string; role?: string; avatar?: string; bio?: string; bio_en?: string }[];
  /** Representative places/venues at this stop. */
  places?: { name: string; name_en?: string; image?: string; desc?: string; desc_en?: string }[];
```

- [ ] **Step 2: Verify types compile (no data changes required)**

Run:
```bash
pnpm exec astro check 2>&1 | grep -iE "route-cities|error" | head -20 || echo "no route-cities errors"
```
Expected: no errors — fields are optional and unused, existing data is still valid.

- [ ] **Step 3: Commit**

```bash
git add src/data/route-cities.ts
git commit -m "feat(route-map): add optional photos/people/places fields to RouteCity (Phase 2 groundwork)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Update + add Playwright behavior tests

The `cx/cy`, `x1/y1` **attribute** assertions still pass because the zoom transform is on the parent `<g>` and the default transform is identity. Two tests assumed *every* anchor/visited label is visible — that is no longer true (crowded labels are culled). Update those and add zoom-behavior coverage.

**Files:**
- Modify: `tests/harness/route-map-coordinates.spec.ts`

- [ ] **Step 1: Relax the "all labels visible" assertions to "subset incl. origin + latest"**

Replace the body of `test('route page keeps dense city labels visible without origin helper text', ...)` with:

```ts
test('route page shows key labels and never the origin helper text', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const visible = await getVisibleLabelIds(page);
  // Origin (shenzhen) + latest (chengdu) are always shown.
  expect(visible).toContain('shenzhen');
  expect(visible).toContain('chengdu');
  // Visible labels are a subset of the eligible set (crowded ones may be culled).
  for (const id of visible) {
    expect(expectedLabelIds).toContain(id);
  }
  await expect(page.locator('main svg text').filter({ hasText: '出发点' })).toHaveCount(0);
});
```

Replace the body of `test('home preview renders labels from route city data', ...)` with:

```ts
test('home preview shows key labels from route city data', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const visible = await getVisibleLabelIds(page, 'svg[role="img"] [data-route-city-label="true"]');
  expect(visible).toContain('shenzhen');
  expect(visible.length).toBeGreaterThan(0);
  for (const id of visible) {
    expect(expectedLabelIds).toContain(id);
  }
});
```

- [ ] **Step 2: Replace the "labels above endpoint" test with a render-position proximity test**

The old test compared label `x`/`y` *attributes* to base endpoints. Labels now live in the overlay; assert instead (via rendered geometry) that each visible label is near *some* city dot and that visible labels don't overlap. Replace `test('route page labels sit above projection endpoint markers', ...)` with:

```ts
test('route page visible labels render near a city dot', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const labelBoxes = await page.locator('[data-route-city-label="true"]').evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getClientRects().length > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { id: n.getAttribute('data-city-id'), cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
      }),
  );
  const dotCenters = await page.locator('main svg circle[fill="transparent"]').evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getBoundingClientRect().height > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
      }),
  );

  expect(labelBoxes.length).toBeGreaterThan(0);
  for (const label of labelBoxes) {
    const nearest = Math.min(...dotCenters.map((d) => Math.hypot(d.cx - label.cx, d.cy - label.cy)));
    expect(nearest, `label ${label.id} should sit near a dot`).toBeLessThan(70);
  }
});
```

- [ ] **Step 3: Add a zoom-behavior test (recenter button + zoom reveals more labels)**

Append:

```ts
test('route page exposes a recenter control and zooms in on city click', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const recenter = page.getByRole('button', { name: /回到|recenter|full/i });
  await expect(recenter).toBeVisible();

  const labelsAtOverview = (await getVisibleLabelIds(page)).length;

  // Click a crowded southern city's hit area to zoom in.
  const guangzhouHit = page.locator('main svg circle[fill="transparent"]').nth(1); // order 1 = 广州
  await guangzhouHit.click({ force: true });

  // After zoom-in, dots spread apart → at least as many labels are visible.
  await expect
    .poll(async () => (await getVisibleLabelIds(page)).length)
    .toBeGreaterThanOrEqual(labelsAtOverview);

  // Recenter returns to overview without error.
  await recenter.click();
  await expect(recenter).toBeVisible();
});
```

- [ ] **Step 4: Run the full route-map spec on both projects**

Run:
```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts
```
Expected: PASS on `chromium-desktop` and `chromium-mobile`. (First run builds the site via the configured webServer; allow time.)

- [ ] **Step 5: Run the broader harness to catch regressions**

Run:
```bash
pnpm exec playwright test tests/harness/smoke.spec.ts tests/harness/route-map-coordinates.spec.ts
```
Expected: PASS — no runtime/console errors on `/` and `/route`.

- [ ] **Step 6: Commit**

```bash
git add tests/harness/route-map-coordinates.spec.ts
git commit -m "test(route-map): cover label culling + zoom behavior; relax 'all labels visible' assumptions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after all tasks)

- [ ] `pnpm dev`, open `/route`: map shows whole China + horse; southern cluster shows only 深圳/成都 (+ any that fit). Scroll-zoom into the southwest → 广州/阳江/玉林/南宁/柳州 fade in and spread, each name beside its dot. Drag to pan. Click a city → panel updates and map eases to center it. Click recenter → returns to full view. No 3D tilt; no vehicle arrow.
- [ ] Mobile (devtools device / Pixel 7): pinch-zoom and one-finger drag work; page still scrolls when starting a drag outside the map.
- [ ] `/about` still animates (gsap intact).

---

## Self-Review (completed by author)

- **Spec coverage:** §1–2 problem/goals → Tasks 2,4,6. §3 principles: semantic zoom → Task 2 (cull) + Task 4 (screen labels); progressive disclosure → existing CityPanel (unchanged); focus+context → Task 4 (zoomToCity + recenter, horse always in scaled group); screen-space labels → Task 4 overlay; direct manipulation → Task 3 d3-zoom. §4 tech selection → Tasks 1,3,4 (add d3-zoom; remove tilt + gsap usage, keep gsap dep). §5 data model → Task 5 (type fields only; panel rendering explicitly deferred to Phase 2 — noted). §6 → Task 5. §7 zoom/label details → Tasks 2,3,4. §8 testing → Task 6 (coordinate/elevation attribute tests untouched since transform is on the group + identity default). §9 phasing → this plan is Phase 1. §10 risks → recenter (Task 4), scroll handling (`touch-none` + manual mobile check), gsap-not-removed (Task 4 Step 1 note), horse alignment (inside scaled group).
- **Placeholder scan:** none — every code step has full code; commands have expected output.
- **Type consistency:** `Transform {x,y,k}`, `centerOn`, `IDENTITY`, `useMapZoom → {svgRef, transform, reset, zoomToCity}` used consistently across Tasks 3–4. `placeLabels` signature unchanged (still `(cities, preferredSide?)` → `Map<id, [dx,dy]|null>`); `MAX_LABEL_DISTANCE`/`offsetDistance`/`overlapsAnyLabel`/`dotOverlapCount` all defined in Task 2. Label `data-city-id`/`data-route-city-label` attributes preserved for tests.
