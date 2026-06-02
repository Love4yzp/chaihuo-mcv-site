import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  Compass,
  MapPin,
  Mountain,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import type { RouteCity } from '@/features/route-map/types';
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import type { LocalizedJournal } from '@/lib/journals';
import { fadeUp, springTransition, stagger } from './motion';

interface Props {
  cities: RouteCity[];
  journals: LocalizedJournal[];
  yuqueJournals?: YuqueJournalCard[];
  locale?: Locale;
  t: Record<string, string>;
}

interface YuqueJournalCard {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  city: string;
  href: string;
  updatedAt: string | null;
  coverImage: string | null;
}

export default function JournalsContent({
  cities,
  journals,
  yuqueJournals = [],
  locale = 'zh',
  t,
}: Props) {
  // Read search parameters for initial filters
  const [activeCity, setActiveCity] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Stable across renders (only uses stable state setters), so the effects below
  // still run once on mount — behaviour identical to empty deps.
  const syncFiltersFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setActiveCity(params.get('city') ?? 'all');
    setActiveStatus(params.get('status') ?? 'all');
  }, []);

  // Sync state with URL Search Params on mount
  useEffect(() => {
    syncFiltersFromUrl();
  }, [syncFiltersFromUrl]);

  // Keep filters in sync with browser history navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', syncFiltersFromUrl);
    return () => window.removeEventListener('popstate', syncFiltersFromUrl);
  }, [syncFiltersFromUrl]);

  // Update URL Search Params when filters change
  const handleCityChange = (cityId: string) => {
    setActiveCity(cityId);
    updateQueryParams(cityId, activeStatus);
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    updateQueryParams(activeCity, status);
  };

  const updateQueryParams = (city: string, status: string) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (city === 'all') {
        params.delete('city');
      } else {
        params.set('city', city);
      }
      if (status === 'all') {
        params.delete('status');
      } else {
        params.set('status', status);
      }
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
      window.history.pushState(null, '', newUrl);
    }
  };

  // Filter journals in-memory
  const filteredJournals = journals.filter((j) => {
    const cityMatch = activeCity === 'all' || j.city === activeCity;
    const statusMatch = activeStatus === 'all' || j.status === activeStatus;
    return cityMatch && statusMatch;
  });
  const hasYuqueJournals = yuqueJournals.length > 0;
  const filteredYuqueJournals = yuqueJournals.filter((j) => {
    const cityMatch = activeCity === 'all' || j.city === activeCity;
    const statusMatch = activeStatus === 'all' || activeStatus === 'published';
    return cityMatch && statusMatch;
  });
  const totalCount = hasYuqueJournals ? yuqueJournals.length : journals.length;
  const publishedCount = hasYuqueJournals
    ? yuqueJournals.length
    : journals.filter((j) => j.status === 'published').length;
  const placeholderCount = hasYuqueJournals
    ? 0
    : journals.filter((j) => j.status === 'placeholder').length;

  // Unique cities referenced in the cities prop
  const citiesList = Array.from(new Map(cities.map((city) => [city.id, city.label]))).map(
    ([id, label]) => ({ id, label }),
  );

  // Helper to retrieve city details for a given city ID
  const getCityTelemetry = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (!city) return null;
    return {
      altitude: city.altitude,
      terrain: city.terrain,
      challenge: city.challenge,
    };
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* 顶部 Hero */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={stagger(0.1)} initial="hidden" animate="visible">
            <motion.p
              className="text-xs font-semibold tracking-[0.3em] text-neutral-500 uppercase mb-3"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.subtitle']}
            </motion.p>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4 tracking-tight"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.title']}
            </motion.h1>
            <motion.p
              className="text-base text-neutral-500 max-w-xl leading-relaxed"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.body']}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {!hasYuqueJournals && (
        <section className="py-6 px-6 bg-surface-card border-b border-neutral-300 sticky top-[64px] z-40 shadow-xs">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex items-center bg-neutral-100 hover:bg-neutral-300 border border-neutral-300 rounded-lg px-3 py-1.5 transition-colors duration-200 group cursor-pointer focus-within:ring-2 focus-within:ring-brand focus-within:border-brand">
                <MapPin className="w-4 h-4 text-neutral-500 mr-2" />
                <select
                  value={activeCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  aria-label={
                    t['filter.cityAria'] ??
                    (locale === 'en' ? 'Filter journals by city' : '按城市筛选日志')
                  }
                  className="appearance-none bg-transparent pr-8 py-0.5 text-sm font-medium text-neutral-700 focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">{t['filter.all']}</option>
                  {citiesList.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-300">
                {[
                  { key: 'all', label: t['filter.all'] },
                  { key: 'published', label: t['filter.published'] },
                  { key: 'placeholder', label: t['filter.placeholder'] },
                ].map((status) => (
                  <button
                    type="button"
                    key={status.key}
                    onClick={() => handleStatusChange(status.key)}
                    className={`px-4 py-1 rounded-md text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                      activeStatus === status.key
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-700 hover:text-neutral-900'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-neutral-500 font-semibold self-start md:self-auto flex items-center gap-2">
              <span>
                {locale === 'en' ? 'All' : '全部'} {totalCount}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-brand-dark">
                {locale === 'en' ? 'Published' : '已发布'} {publishedCount}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-500">
                {locale === 'en' ? 'In progress' : '整理中'} {placeholderCount}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Cards Grid */}
      <section className={`${hasYuqueJournals ? 'pt-8 pb-16' : 'py-16'} px-6`}>
        <div className="max-w-5xl mx-auto">
          {hasYuqueJournals ? (
            filteredYuqueJournals.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={stagger(0.08)}
                initial="hidden"
                animate="visible"
              >
                {filteredYuqueJournals.map((entry) => (
                  <motion.div key={entry.id} variants={fadeUp} className="group">
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-surface-card rounded-lg overflow-hidden shadow-xs hover:shadow-lg hover:border-neutral-400 border border-neutral-300 transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5"
                    >
                      <div className="aspect-[16/9] bg-neutral-100 overflow-hidden border-b border-neutral-300">
                        {entry.coverImage ? (
                          <img
                            src={entry.coverImage}
                            alt={entry.title}
                            className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-end bg-neutral-200 p-5">
                            <span className="text-xs font-semibold text-neutral-500">
                              {entry.date ?? entry.slug}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-4">
                        <h3 className="text-base font-bold text-neutral-900 line-clamp-1 leading-snug">
                          {formatYuqueCardTitle(entry.title)}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-3">
                          {formatYuqueJournalDate(entry.date, locale)}
                        </p>
                      </div>
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-24 bg-surface-card border border-neutral-300 rounded-2xl shadow-xs">
                <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-4 animate-spin [animation-duration:10s] motion-reduce:animate-none" />
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{t['empty.title']}</h3>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto">{t['empty.subtitle']}</p>
              </div>
            )
          ) : filteredJournals.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={stagger(0.08)}
              initial="hidden"
              animate="visible"
            >
              {filteredJournals.map((entry) => {
                const isPublished = entry.status === 'published';

                if (isPublished) {
                  // Published Card
                  return (
                    <motion.div key={entry.slug} variants={fadeUp} className="group">
                      <a
                        href={localePath(`/journals/${entry.slug}`, locale)}
                        className="block bg-surface-card rounded-xl overflow-hidden shadow-xs hover:shadow-lg hover:border-brand/80 border border-neutral-300 transition-[box-shadow,border-color] duration-300"
                      >
                        {/* Cover Image */}
                        <div className="aspect-[16/10] bg-neutral-100 overflow-hidden relative border-b border-neutral-300">
                          {entry.coverImage ? (
                            <img
                              src={entry.coverImage}
                              alt={entry.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col justify-between bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 text-white">
                              <span className="text-[11px] tracking-[0.25em] font-semibold text-neutral-500 uppercase font-mono">
                                {entry.date}
                              </span>
                              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none">
                                {entry.cityLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="p-5 flex flex-col min-h-44 justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-neutral-500">
                              <span className="font-mono">{entry.date}</span>
                              <span>•</span>
                              <span className="text-neutral-700">{entry.cityLabel}</span>
                            </div>
                            <h3 className="text-base font-bold text-neutral-900 group-hover:text-brand-dark transition-colors line-clamp-2 leading-snug mb-2">
                              {entry.title}
                            </h3>
                            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                              {entry.excerpt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors duration-200 mt-3">
                            <span>{t['card.read']}</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </a>
                    </motion.div>
                  );
                } else {
                  // Placeholder Card
                  const telemetry = getCityTelemetry(entry.city);

                  return (
                    <motion.div
                      key={entry.slug}
                      variants={fadeUp}
                      className="relative group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      tabIndex={0}
                      aria-label={
                        locale === 'en'
                          ? `${entry.cityLabel} expedition telemetry`
                          : `${entry.cityLabel} 探险数据`
                      }
                      onMouseEnter={() => setHoveredCardId(entry.slug)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      onFocus={() => setHoveredCardId(entry.slug)}
                      onBlur={() => setHoveredCardId(null)}
                    >
                      <div className="block bg-surface text-neutral-700 rounded-xl border border-dashed border-neutral-300 p-5 shadow-none min-h-44 flex flex-col justify-between overflow-hidden">
                        {/* Top: date / city / status chip */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-neutral-500">
                            <span>{entry.date}</span>
                            <span>•</span>
                            <span className="text-neutral-700">{entry.cityLabel}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-base font-semibold text-neutral-900 line-clamp-1 leading-snug">
                              {entry.title}
                            </h3>
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-300">
                              <Clock className="w-3 h-3" />
                              {t['card.placeholder.label']}
                            </span>
                          </div>
                          {/* Author-written excerpt is the right preview here.
                              Telemetry stays in the hover popover only. */}
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {entry.excerpt}
                          </p>
                        </div>
                      </div>

                      {/* Popover showing geographical telemetry data */}
                      <AnimatePresence>
                        {hoveredCardId === entry.slug && telemetry && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-3 w-80 max-w-[calc(100vw-2rem)] bg-neutral-950/95 backdrop-blur-md border border-neutral-900 rounded-xl p-4 shadow-2xl pointer-events-none text-white"
                          >
                            <h4 className="text-xs font-black tracking-widest text-brand mb-3 uppercase flex items-center gap-1.5 border-b border-neutral-900 pb-2">
                              <Compass className="w-3.5 h-3.5 text-brand" />
                              {entry.cityLabel} • {locale === 'en' ? 'TELEMETRY' : '探险数据'}
                            </h4>

                            <div className="space-y-3">
                              {/* Altitude */}
                              <div className="flex items-start gap-2.5">
                                <Mountain className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase leading-none">
                                    {locale === 'en' ? 'ALTITUDE' : '海拔高度'}
                                  </p>
                                  <p className="text-xs font-semibold text-neutral-100 mt-1 font-mono">
                                    {telemetry.altitude} m
                                  </p>
                                </div>
                              </div>

                              {/* Terrain */}
                              <div className="flex items-start gap-2.5">
                                <Compass className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase leading-none">
                                    {locale === 'en' ? 'TERRAIN' : '地形阶梯'}
                                  </p>
                                  <p className="text-xs font-semibold text-neutral-100 mt-1">
                                    {telemetry.terrain}
                                  </p>
                                </div>
                              </div>

                              {/* Challenge */}
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold text-brand tracking-wider uppercase leading-none">
                                    {locale === 'en' ? 'EXPEDITION CHALLENGE' : '旅途技术挑战'}
                                  </p>
                                  <p className="text-xs font-medium text-neutral-100 mt-1 leading-relaxed">
                                    {telemetry.challenge}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Little down arrow for popover bubble */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-neutral-950/95" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }
              })}
            </motion.div>
          ) : (
            <div className="text-center py-24 bg-surface-card border border-neutral-300 rounded-2xl shadow-xs">
              <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-4 animate-spin [animation-duration:10s] motion-reduce:animate-none" />
              <h3 className="text-xl font-bold text-neutral-900 mb-2">{t['empty.title']}</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto">{t['empty.subtitle']}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatYuqueCardTitle(title: string) {
  const parts = title
    .split(/[|｜]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 3 ? parts.slice(2).join(' | ') : title;
}

function formatYuqueJournalDate(value: string | null, locale: Locale) {
  if (!value) return locale === 'en' ? 'No date' : '暂无日期';

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  return `${match[1]}.${match[2]}.${match[3]}`;
}
