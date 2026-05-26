import type { ProjectedCity, Rect } from "./types";

type LabelMode = 'map' | 'projection';
type LabelOffset = [number, number];

const LABEL_GAP = 7;
const RECT_PADDING = 2;
const MAX_LABEL_DISTANCE = 14; // px — a label must sit this close to its dot (dot-to-label-center), or it is hidden

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

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
}

function padded(rect: Rect, padding = RECT_PADDING): Rect {
  return [
    rect[0] - padding,
    rect[1] - padding,
    rect[2] + padding,
    rect[3] + padding,
  ];
}

export function labelDims(c: ProjectedCity): { w: number; h: number } {
  return {
    w: c.label.length * c.fontSize * 1.05 + 6,
    h: c.fontSize * 1.25,
  };
}

export function bboxAt(c: ProjectedCity, dx: number, dy: number): Rect {
  const { w, h } = labelDims(c);
  const x0 = c.cx + dx;
  const y0 = c.cy + dy - h * 0.85;
  return [x0, y0, x0 + w, y0 + h];
}

function dotBox(c: ProjectedCity): Rect {
  const r = c.isLatest || c.isOrigin ? 7 : c.visited ? 5 : 4;
  return [c.cx - r, c.cy - r, c.cx + r, c.cy + r];
}

function priority(c: ProjectedCity) {
  return c.isLatest ? 4 : c.isOrigin ? 3 : c.visited ? 2 : c.anchor ? 1 : 0;
}

function horizontalSlots(w: number) {
  return [
    -w / 2,
    LABEL_GAP,
    -(w + LABEL_GAP),
    -w / 2 + 18,
    -w / 2 - 18,
    LABEL_GAP + 18,
    -(w + LABEL_GAP + 18),
    -w / 2 + 36,
    -w / 2 - 36,
  ];
}

function projectionCandidates(c: ProjectedCity): LabelOffset[] {
  const { w, h } = labelDims(c);
  const pad = c.isOrigin ? 17 : LABEL_GAP;
  const slots = horizontalSlots(w);
  const candidates: LabelOffset[] = [];

  for (let lane = 0; lane < 7; lane++) {
    const dy = -pad - h * 0.15 - lane * (h + 5);
    for (const dx of slots) {
      candidates.push([dx, dy]);
    }
  }

  return candidates;
}

function mapCandidates(c: ProjectedCity): LabelOffset[] {
  const { w, h } = labelDims(c);
  const pad = c.isOrigin ? 17 : LABEL_GAP;
  const half = pad * 0.5;
  const base: LabelOffset[] = [
    [-w / 2, pad + h * 0.85],
    [-w / 2, -pad - h * 0.15],
    [pad, h * 0.35],
    [-(w + pad), h * 0.35],
    [half, pad * 0.7 + h * 0.85],
    [-(w + half), pad * 0.7 + h * 0.85],
    [half, -pad * 0.7 - h * 0.15],
    [-(w + half), -pad * 0.7 - h * 0.15],
  ];

  const extended: LabelOffset[] = [];
  for (let lane = 2; lane <= 5; lane++) {
    const y = lane * (h + 4);
    extended.push([-w / 2, y], [-w / 2, -y], [pad + lane * 8, h * 0.35], [-(w + pad + lane * 8), h * 0.35]);
  }

  return [...base, ...extended];
}

function candidateOffsets(c: ProjectedCity, mode: LabelMode): LabelOffset[] {
  return mode === 'projection' ? projectionCandidates(c) : mapCandidates(c);
}

export function placeLabels(
  cities: ProjectedCity[],
  preferredSide: 'below' | 'above' = 'below',
): Map<string, LabelOffset | null> {
  const mode: LabelMode = preferredSide === 'above' ? 'projection' : 'map';
  const ordered = cities
    .filter((c) => c.showLabel)
    .sort((a, b) => priority(b) - priority(a) || a.order - b.order);
  const dotBoxes = cities.map((c) => ({ id: c.id, rect: padded(dotBox(c), 1) }));
  const placed: Rect[] = [];
  const result = new Map<string, LabelOffset | null>();

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
