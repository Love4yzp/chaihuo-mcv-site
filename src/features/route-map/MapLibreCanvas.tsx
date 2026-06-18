import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { horseRouteGeoJson } from './horse-geo';
import { buildMapStyle, buildRouteSource, CHINA_BOUNDS, MAP_BG } from './map-style';
import type { ThemeType } from './theme';
import type { RouteCity } from './types';

interface FitPadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MapLibreCanvasProps {
  cities: RouteCity[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  t: Record<string, string>;
  activeTheme?: ThemeType | null;
  // Inset for fitBounds/easeTo so the route/horse stay clear of floating
  // overlays (top bar + right CityPanel card on desktop). Defaults to a modest
  // all-round inset (suitable for the small mobile map with no overlays).
  fitPadding?: FitPadding;
}

const DEFAULT_FIT_PADDING: FitPadding = { top: 40, bottom: 40, left: 40, right: 40 };
const INTERACTION_BOUNDS: [[number, number], [number, number]] = [
  [66, 13],
  [142, 58],
];
const MIN_ZOOM = 2;
const MAX_ZOOM = 7;

export default function MapLibreCanvas({
  cities,
  selectedKey,
  onSelect,
  t,
  activeTheme = null,
  fitPadding = DEFAULT_FIT_PADDING,
}: MapLibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Read latest fitPadding without re-initializing the map / churning effect deps.
  const fitPaddingRef = useRef(fitPadding);
  fitPaddingRef.current = fitPadding;
  // biome-ignore lint/suspicious/noExplicitAny: maplibre map instance resolved at runtime via dynamic import
  const mapRef = useRef<any>(null);
  const markerElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [ready, setReady] = useState(false);

  // Init the map once per city set. Markers are created on 'load'; `ready`
  // flips true afterwards so the theme/selection effects below run only once
  // markers exist (and re-run on prop changes, reading current props directly).
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setReady(false);
    // biome-ignore lint/suspicious/noExplicitAny: maplibre map instance
    let map: any;
    // biome-ignore lint/suspicious/noExplicitAny: marker instances for cleanup
    const markers: any[] = [];
    const els = new Map<string, HTMLButtonElement>();

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;
      const style = buildMapStyle(buildRouteSource(cities).data, horseRouteGeoJson());
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        bounds: CHINA_BOUNDS,
        fitBoundsOptions: { padding: fitPaddingRef.current },
        maxBounds: INTERACTION_BOUNDS,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        attributionControl: false,
        scrollZoom: true,
        dragPan: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
        keyboard: true,
        cooperativeGestures: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;
      map.scrollZoom.enable();
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      map.touchZoomRotate.disableRotation();
      map.getCanvas().style.touchAction = 'none';
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

      map.on('load', () => {
        if (cancelled) return;
        for (const city of cities) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = city.visited ? 'mlc-marker mlc-marker--visited' : 'mlc-marker';
          el.dataset.routeCity = 'true';
          el.dataset.cityId = city.id;
          el.dataset.cityLabel = city.label;
          el.setAttribute('aria-label', city.label);
          const dot = document.createElement('span');
          dot.className = 'mlc-dot';
          const label = document.createElement('span');
          label.className = 'mlc-label';
          label.textContent = city.label;
          el.appendChild(dot);
          el.appendChild(label);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectRef.current(city.label);
          });
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([city.lng, city.lat])
            .addTo(map);
          markers.push(el);
          els.set(city.label, el);
        }
        markerElsRef.current = els;
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      setReady(false);
      for (const m of markers) m.remove?.();
      if (map) map.remove();
      mapRef.current = null;
      markerElsRef.current = new Map();
    };
  }, [cities]);

  // Theme lens: matched pop, non-matched non-origin dim, origin exempt; route fades.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    for (const city of cities) {
      const el = markerElsRef.current.get(city.label);
      if (!el) continue;
      const matched = !!activeTheme && !city.isOrigin && city.themes.includes(activeTheme);
      const dimmed = !!activeTheme && !city.isOrigin && !city.themes.includes(activeTheme);
      el.classList.toggle('mlc-marker--match', matched);
      el.classList.toggle('mlc-marker--dimmed', dimmed);
      if (dimmed) el.dataset.dimmed = 'true';
      else delete el.dataset.dimmed;
      if (matched) el.dataset.themeMatch = 'true';
      else delete el.dataset.themeMatch;
    }
    if (map?.getLayer('route')) {
      map.setPaintProperty('route', 'line-opacity', activeTheme ? 0.2 : 1);
    }
  }, [activeTheme, ready, cities]);

  // Selection: highlight the selected marker + ease the map to it.
  useEffect(() => {
    if (!ready) return;
    for (const [label, el] of markerElsRef.current) {
      el.classList.toggle('mlc-marker--selected', label === selectedKey);
    }
    const city = selectedKey ? cities.find((c) => c.label === selectedKey) : null;
    if (city && mapRef.current) {
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      mapRef.current.easeTo({
        center: [city.lng, city.lat],
        padding: fitPaddingRef.current,
        duration: reduce ? 0 : 500,
        essential: true,
      });
    }
  }, [selectedKey, ready, cities]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-neutral-300/40">
      <div
        aria-hidden="true"
        style={{ backgroundColor: MAP_BG }}
        className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm pointer-events-none"
      >
        {t['route.map.loading'] ?? '地图加载中…'}
      </div>
      {/* relative + h-full, NOT absolute inset-0: MapLibre adds .maplibregl-map which
          forces position:relative, collapsing an absolute-inset-0 box to height 0. */}
      <div ref={containerRef} data-maplibre-canvas="true" className="relative w-full h-full" />
      {/* Paper-grain + warm vignette over the map (click-through). Texture only. */}
      <div className="mlc-texture" aria-hidden="true" />
    </div>
  );
}
