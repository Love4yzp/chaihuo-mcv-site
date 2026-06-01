import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { horseRouteGeoJson } from './horse-geo';
import { buildMapStyle, buildRouteSource, CHINA_BOUNDS, MAP_BG } from './map-style';
import type { ThemeType } from './theme';
import type { RouteCity } from './types';

interface MapLibreCanvasProps {
  cities: RouteCity[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  t: Record<string, string>;
  activeTheme?: ThemeType | null;
}

// Leave room on the right for the floating CityPanel card so the route/horse
// stay centered in the visible (uncovered) area.
const FIT_PADDING = { top: 40, bottom: 40, left: 40, right: 420 };

export default function MapLibreCanvas({
  cities,
  selectedKey,
  onSelect,
  t,
  activeTheme = null,
}: MapLibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
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
        fitBoundsOptions: { padding: FIT_PADDING },
        maxBounds: CHINA_BOUNDS,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;
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
        padding: FIT_PADDING,
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
      <div ref={containerRef} data-maplibre-canvas="true" className="absolute inset-0" />
    </div>
  );
}
