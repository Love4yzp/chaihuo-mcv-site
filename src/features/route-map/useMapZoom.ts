import { select } from 'd3-selection';
import { type D3ZoomEvent, type ZoomBehavior, zoom, zoomIdentity } from 'd3-zoom';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'd3-transition'; // augments d3-selection with .transition()

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
 * that group; labels are positioned manually in screen space.
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
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform;
        setTransform({ x: t.x, y: t.y, k: t.k });
      });

    zoomRef.current = behavior;
    const selection = select(svg);
    selection.call(behavior);

    return () => {
      selection.on('.zoom', null);
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
