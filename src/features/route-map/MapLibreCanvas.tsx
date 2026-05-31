import { useEffect, useRef } from 'react';
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

export default function MapLibreCanvas({ cities, selectedKey, onSelect, t }: MapLibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest onSelect without re-initializing the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    // biome-ignore lint/suspicious/noExplicitAny: maplibre map/marker types resolved at runtime via dynamic import
    let map: any;
    // biome-ignore lint/suspicious/noExplicitAny: marker instances cleaned up on unmount
    const markers: any[] = [];

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      const style = buildMapStyle(buildRouteSource(cities).data, horseRouteGeoJson());
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        bounds: CHINA_BOUNDS,
        fitBoundsOptions: { padding: 40 },
        maxBounds: CHINA_BOUNDS,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });

      map.on('load', () => {
        if (cancelled) return;
        for (const city of cities) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = city.visited ? 'mlc-marker mlc-marker--visited' : 'mlc-marker';
          el.setAttribute('aria-label', city.label);
          el.dataset.cityLabel = city.label;
          const dot = document.createElement('span');
          dot.className = 'mlc-dot';
          const labelSpan = document.createElement('span');
          labelSpan.className = 'mlc-label';
          labelSpan.textContent = city.label;
          el.appendChild(dot);
          el.appendChild(labelSpan);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectRef.current(city.label);
            map.flyTo({ center: [city.lng, city.lat], zoom: 5.2, essential: true });
          });
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([city.lng, city.lat])
            .addTo(map);
          markers.push(marker);
        }
      });
    })();

    return () => {
      cancelled = true;
      for (const m of markers) m.remove();
      if (map) map.remove();
    };
    // Re-init only when the city set changes (stable for a given page).
  }, [cities]);

  // selectedKey and activeTheme are accepted for interface parity with ChinaRouteMap;
  // full selection highlight and theme dim are Phase 2.
  void selectedKey;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-neutral-300/40">
      {/* SSR / pre-WebGL placeholder skeleton */}
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
