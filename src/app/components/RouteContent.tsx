import { ChevronLeft, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';
import { CityPanel, countThemes, MapLibreCanvas, ThemeFilter } from '@/features/route-map';
import type { ThemeType } from '@/features/route-map/theme';
import type { RouteCity } from '@/features/route-map/types';
import type { Locale } from '@/i18n/index';

interface SerializedJournal {
  slug: string;
  title: string;
  date: string;
  status: string;
  city: string;
}

interface Props {
  cities: RouteCity[];
  journals: SerializedJournal[];
  locale?: Locale;
  t: Record<string, string>;
}

// Desktop: full-viewport map. Keep the route/horse clear of the top bar (nav +
// title/chips ≈ 150) and the right CityPanel card (380 + margin ≈ 420).
const DESKTOP_FIT_PADDING = { top: 150, bottom: 48, left: 48, right: 420 };

export default function RouteContent({ cities, journals, locale = 'zh', t }: Props) {
  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.order - b.order), [cities]);

  // Default to the latest visited city (visited === true and largest order)
  const lastVisited = useMemo(
    () => [...sortedCities].reverse().find((c) => c.visited) ?? null,
    [sortedCities],
  );

  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(lastVisited?.label ?? null);

  const [activeTheme, setActiveTheme] = useState<ThemeType | null>(null);
  const themeCounts = useMemo(() => countThemes(cities), [cities]);

  const selectedCity = useMemo(
    () => cities.find((c) => c.label === selectedCityKey) ?? null,
    [cities, selectedCityKey],
  );

  // Mobile Drawer expanded state
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const handleCitySelect = useCallback((key: string) => {
    setSelectedCityKey(key);
    // Auto expand drawer on mobile when clicking a city
    setIsDrawerExpanded(true);
  }, []);

  const getT = (key: string, fallback: string) => {
    return t[key] ?? fallback;
  };

  // Drawer Animation Variants
  const drawerVariants = {
    peek: { y: 'calc(100% - 120px)' },
    expanded: { y: 0 },
  };

  const pageTitle = getT('route.pageTitle', '行程路线');
  const pageDesc = getT('route.pageDesc', '跟随柴火基地车，穿越中国 21 省 26 城。');
  const backHref = locale === 'zh' ? '/' : '/en';

  return (
    <div className="relative bg-neutral-50 min-h-screen lg:h-screen lg:min-h-0 lg:overflow-hidden">
      {/* ── Header control panel: a glass card grouping title + back + theme chips.
          Mobile: in-flow card at top. Desktop (lg): floats top-left over the map. ── */}
      <header className="relative z-20 mt-20 mx-4 mb-2 rounded-2xl border border-neutral-200/70 bg-surface-card/85 backdrop-blur-md shadow-lg p-4 sm:mx-6 lg:absolute lg:top-24 lg:left-6 lg:mx-0 lg:mt-0 lg:mb-0 lg:w-[360px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-medium leading-relaxed">{pageDesc}</p>
          </div>
          <a
            href={backHref}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 px-3 py-1.5 rounded-full transition-colors duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{getT('route.action.backHome', '返回首页')}</span>
          </a>
        </div>
        <div className="mt-3">
          <ThemeFilter counts={themeCounts} active={activeTheme} onSelect={setActiveTheme} t={t} />
        </div>
      </header>

      {/* ── Map: mobile = in-flow 45vh below header; desktop = full-viewport behind header ── */}
      <div className="w-full h-[45vh] min-h-[300px] mt-4 lg:mt-0 lg:absolute lg:inset-0 lg:h-auto lg:min-h-0 lg:z-0">
        <MapLibreCanvas
          cities={cities}
          selectedKey={selectedCityKey}
          onSelect={handleCitySelect}
          activeTheme={activeTheme}
          fitPadding={DESKTOP_FIT_PADDING}
          t={t}
        />
      </div>

      {/* ── Desktop: floating CityPanel card (mobile uses the bottom drawer below) ── */}
      <div className="hidden lg:block lg:absolute lg:top-36 lg:right-6 lg:bottom-6 lg:z-20 lg:w-[380px] lg:overflow-y-auto lg:rounded-2xl lg:bg-surface-card lg:shadow-xl">
        <CityPanel
          city={selectedCity}
          cities={sortedCities}
          totalLegs={sortedCities.length - 1}
          isLatest={selectedCity?.label === lastVisited?.label}
          t={t}
          locale={locale}
          hero={false}
          onSelectCity={handleCitySelect}
          journals={journals}
        />
      </div>

      {/* ── Mobile: visited-city chip row above the drawer ── */}
      {sortedCities.filter((c) => c.visited).length > 1 && (
        <div className="lg:hidden flex flex-wrap items-center gap-1.5 px-4 sm:px-6 py-2 overflow-x-auto pb-4 max-w-full no-scrollbar">
          {sortedCities
            .filter((c) => c.visited)
            .map((c) => {
              const active = selectedCityKey === c.label;
              return (
                <button
                  type="button"
                  key={`${c.id}-${c.order}`}
                  onClick={() => handleCitySelect(c.label)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
        </div>
      )}

      {/* ── Mobile: bottom drawer (desktop uses the floating card above) ── */}
      {selectedCity && (
        <motion.div
          className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[#fcfbf9]/95 backdrop-blur-md border-t border-[#e5dfd3] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '75vh' }}
          variants={drawerVariants}
          animate={isDrawerExpanded ? 'expanded' : 'peek'}
          drag="y"
          dragConstraints={{ top: -500, bottom: 500 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            // Expand if dragged upwards significantly, collapse if dragged down
            if (info.offset.y < -50) {
              setIsDrawerExpanded(true);
            } else if (info.offset.y > 50) {
              setIsDrawerExpanded(false);
            }
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        >
          {/* Drawer Drag Handle bar (120px Peek height including padding) */}
          {/* biome-ignore lint/a11y/useSemanticElements: 把手内含 h4/图标等块级内容,原生 <button> 不能容纳;role="button" + tabIndex + onKeyDown 是恰当的可访问模式 */}
          <div
            role="button"
            tabIndex={0}
            aria-expanded={isDrawerExpanded}
            className="w-full flex flex-col justify-between py-3 px-6 border-b border-[#e5dfd3]/40 cursor-pointer flex-shrink-0"
            onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsDrawerExpanded(!isDrawerExpanded);
              }
            }}
          >
            {/* Central pill handle */}
            <div className="w-12 h-1.5 bg-neutral-350/80 rounded-full mx-auto mb-3" />

            {/* Peek Content Bar */}
            <div className="flex items-center justify-between w-full h-[60px]">
              <div className="text-left">
                <h4 className="text-xl font-bold text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand" />
                  <span>{selectedCity.label}</span>
                </h4>
                <p className="text-xs text-neutral-500 font-mono font-medium mt-0.5">
                  {getT('route.telemetry.altitude', 'ALTITUDE')}: {selectedCity.altitude}m
                </p>
              </div>

              {/* Status indicator chip */}
              <div>
                {selectedCity.isOrigin ? (
                  <span className="inline-flex text-[10px] tracking-wider text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded font-semibold border border-neutral-250/20">
                    {getT('route.status.origin', '出发点')}
                  </span>
                ) : selectedCity.label === lastVisited?.label ? (
                  <span className="inline-flex items-center gap-1 text-[10px] tracking-wider text-brand-foreground bg-brand px-2.5 py-1 rounded font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-foreground animate-pulse" />
                    {getT('route.status.latest', '最新')}
                  </span>
                ) : selectedCity.visited ? (
                  <span className="inline-flex text-[10px] tracking-wider text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded font-semibold border border-neutral-250/20">
                    {getT('route.status.visited', '已抵达')}
                  </span>
                ) : (
                  <span className="inline-flex text-[10px] tracking-wider text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded font-semibold border border-neutral-100">
                    {getT('route.status.planned', '计划中')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Expanded Details */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-12">
            <CityPanel
              city={selectedCity}
              cities={sortedCities}
              totalLegs={sortedCities.length - 1}
              isLatest={selectedCity.label === lastVisited?.label}
              t={t}
              locale={locale}
              hero={false}
              onSelectCity={handleCitySelect}
              journals={journals}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
