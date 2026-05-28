import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { ChevronLeft, MapPin } from "lucide-react";
import { ChinaRouteMap, CityPanel, ThemeFilter, localizeCity, countThemes } from "@/features/route-map";
import { routeCities, type ThemeType } from "@/data/route-cities";
import type { Locale } from "@/i18n/index";

interface SerializedJournal {
  slug: string;
  title: string;
  date: string;
  status: string;
  city: string;
}

interface Props {
  journals: SerializedJournal[];
  locale?: Locale;
  t: Record<string, string>;
}

export default function RouteContent({ journals, locale = 'zh', t }: Props) {
  // Localize and sort cities
  const localizedCities = useMemo(
    () => routeCities.map(c => localizeCity(c, locale)),
    [locale],
  );
  
  const sortedCities = useMemo(
    () => [...localizedCities].sort((a, b) => a.order - b.order),
    [localizedCities],
  );

  // Default to the latest visited city (visited === true and largest order)
  const lastVisited = useMemo(
    () => [...sortedCities].reverse().find(c => c.visited) ?? null,
    [sortedCities],
  );

  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(
    lastVisited?.label ?? null,
  );

  const [activeTheme, setActiveTheme] = useState<ThemeType | null>(null);
  const themeCounts = useMemo(() => countThemes(localizedCities), [localizedCities]);

  const selectedCity = useMemo(
    () => localizedCities.find(c => c.label === selectedCityKey) ?? null,
    [localizedCities, selectedCityKey],
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
    peek: { y: "calc(100% - 120px)" },
    expanded: { y: 0 }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        {/* Premium Header */}
        <div className="w-full border-b border-neutral-350/20 pb-5 mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {getT('route.pageTitle', '行程路线')}
              </h1>
              <p className="text-sm text-neutral-500 mt-1 font-medium">
                {getT('route.pageDesc', '跟随柴火基地车，穿越中国 21 省 26 城。')}
              </p>
            </div>
            <a
              href={locale === 'zh' ? '/' : '/en'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{getT('route.action.backHome', '返回首页')}</span>
            </a>
          </div>
          <div className="mt-4">
            <ThemeFilter counts={themeCounts} active={activeTheme} onSelect={setActiveTheme} t={t} />
          </div>
        </div>

        {/* Responsive Grid Layout */}
        {/* Desktop Split Screen Layout: Left 65% map, Right 35% panel */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-stretch h-[calc(100vh-200px)]">
          <div className="lg:col-span-8 h-full min-h-[550px]">
            <ChinaRouteMap
              cities={localizedCities}
              selectedKey={selectedCityKey}
              onSelect={handleCitySelect}
              activeTheme={activeTheme}
              t={t}
            />
          </div>
          <div className="lg:col-span-4 h-full overflow-y-auto pr-1">
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
        </div>

        {/* Mobile Layout: Top Map (45vh), Bottom Custom Drawer */}
        <div className="lg:hidden flex flex-col gap-4">
          <div className="w-full h-[45vh] min-h-[300px]">
            <ChinaRouteMap
              cities={localizedCities}
              selectedKey={selectedCityKey}
              onSelect={handleCitySelect}
              activeTheme={activeTheme}
              t={t}
            />
          </div>

          {/* Quick status chips row on mobile above drawer (optional fallback helper) */}
          {sortedCities.filter(c => c.visited).length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 py-2 overflow-x-auto pb-4 max-w-full no-scrollbar">
              {sortedCities
                .filter(c => c.visited)
                .map(c => {
                  const active = selectedCityKey === c.label;
                  return (
                    <button
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
        </div>

        {/* Custom Bottom Drawer for Mobile Devices */}
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
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
          >
            {/* Drawer Drag Handle bar (120px Peek height including padding) */}
            <div 
              className="w-full flex flex-col justify-between py-3 px-6 border-b border-[#e5dfd3]/40 cursor-pointer flex-shrink-0"
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
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
    </div>
  );
}
