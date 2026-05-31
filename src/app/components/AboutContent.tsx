import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import AntigravityCard from './AntigravityCard';
import { defaultViewport, fadeUp, springTransition, stagger } from './motion';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

interface YearEntry {
  year: string;
  events: { month: string; text: string; en?: string }[];
}

interface Phase {
  label: string;
  range: number[];
}

interface Partner {
  name: string;
  description?: string;
}

interface AboutContentProps {
  timelineData: YearEntry[];
  phases: Phase[];
  partners: Partner[];
  heroImage: string;
  locale?: Locale;
  t: Record<string, string>;
}

const HIGHLIGHT_YEARS = new Set(['2011', '2012', '2015', '2016', '2026']);

/* ── Enrich year entries with phase info ── */
interface EnrichedYear {
  year: string;
  events: { month: string; text: string; en?: string }[];
  phase: string;
  isPhaseStart: boolean;
  isHighlight: boolean;
}

function enrichYears(data: YearEntry[], phases: Phase[]): EnrichedYear[] {
  return data.map((entry, idx) => {
    const phase = phases.find((p) => idx >= p.range[0] && idx < p.range[1]);
    const isPhaseStart = phases.some((p) => p.range[0] === idx);
    return {
      ...entry,
      phase: phase?.label ?? '',
      isPhaseStart,
      isHighlight: HIGHLIGHT_YEARS.has(entry.year),
    };
  });
}

/* ── Year Spotlight Timeline ── */
// Premium milestone title mapping to immediately define focus for each milestone year
const MILESTONE_TITLES: Record<string, { zh: string; en: string }> = {
  '2011': { zh: '创客萌芽：柴火诞生', en: 'The Seed: Chaihuo Born' },
  '2012': { zh: '走向国际：引入 Maker Faire', en: 'Going Global: First Maker Faire' },
  '2015': { zh: '总理来访：荣誉会员登门', en: 'Historic Peak: Premier Li Keqiang Visits' },
  '2016': { zh: '全球焦点：拍摄硬件硅谷', en: 'Global Focus: WIRED Shenzhen Documentary' },
  '2026': { zh: '普罗米修斯：基地车正式启程', en: 'Prometheus: The Journey Begins' },
};

function YearSpotlight({
  items,
  locale = 'zh',
  t,
}: {
  items: EnrichedYear[];
  locale?: Locale;
  t: Record<string, string>;
}) {
  // Separate timeline into curated highlights (Milestones) and minor chronicles
  const milestones = useMemo(() => items.filter((item) => item.isHighlight), [items]);

  const [activeYear, setActiveYear] = useState(milestones[0]?.year);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers = milestones.map((item) => {
      const el = document.getElementById(`year-section-${item.year}`);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveYear(item.year);
          }
        },
        {
          rootMargin: '-25% 0px -50% 0px',
        },
      );
      observer.observe(el);
      return observer;
    });

    return () => {
      observers.forEach((obs) => {
        obs?.disconnect();
      });
    };
  }, [milestones]);

  const jumpToSection = (year: string) => {
    const el = document.getElementById(`year-section-${year}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-neutral-50/50 border-y border-neutral-200/60 py-20 px-6 md:px-[10%] lg:px-[12%] relative scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* Left column - Sticky Year Tracker (Desktop Only) */}
          <div className="hidden lg:block w-[28%] shrink-0">
            <div className="sticky top-32 h-[50vh] flex flex-col justify-center pl-6 border-l-2 border-neutral-200/80 relative">
              {/* Glowing Active Track Indicator */}
              <div
                className="absolute left-[-2px] w-[2px] bg-brand h-12 transition-all duration-300"
                style={{
                  top: `${(milestones.findIndex((item) => item.year === activeYear) / milestones.length) * 100}%`,
                  height: `${100 / milestones.length}%`,
                }}
              />

              <div className="space-y-5">
                {milestones.map((item) => {
                  const isActive = item.year === activeYear;
                  return (
                    <button
                      type="button"
                      key={item.year}
                      onClick={() => jumpToSection(item.year)}
                      className="w-full text-left focus:outline-none block cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isActive ? 'bg-brand scale-125' : 'bg-neutral-300 group-hover:bg-brand/50'}`}
                        />
                        <span
                          className={`font-black text-2xl transition-all duration-300 tracking-tight ${isActive ? 'text-brand scale-110 pl-2' : 'text-neutral-300 group-hover:text-neutral-500'}`}
                        >
                          {item.year}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column - Continuous Curated Milestones */}
          <div className="flex-1 space-y-16">
            {milestones.map((item) => {
              const mTitle = MILESTONE_TITLES[item.year]?.[locale === 'en' ? 'en' : 'zh'] || '';
              return (
                <div key={item.year} id={`year-section-${item.year}`} className="scroll-mt-36">
                  {/* Year Header (Mobile Sticky, Desktop Clean Title) */}
                  <div className="sticky lg:relative top-16 lg:top-0 bg-neutral-50/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none py-3.5 lg:py-0 mb-4 z-20 border-b border-neutral-200/50 lg:border-none flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="lg:hidden text-2xl font-black text-brand tracking-tight">
                        {item.year}
                      </span>
                      {item.isPhaseStart && (
                        <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-brand bg-brand-light border border-brand/20 px-2.5 py-0.5 rounded-full">
                          {item.phase}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-400 bg-neutral-200/60 px-2.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5 text-brand" />
                      {t['panorama.highlight'] || 'Milestone'}
                    </span>
                  </div>

                  {/* Curated Milestone Header */}
                  {mTitle && (
                    <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-6 tracking-tight flex items-center gap-2">
                      {mTitle}
                    </h3>
                  )}

                  {/* Event Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {item.events.map((ev, j) => {
                      const isLongText = ev.text.length > 80;
                      return (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, y: 15 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.15 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
                          className={`flex flex-col p-6 rounded-2xl border border-neutral-200/60 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-[0_15px_30px_rgba(243,210,48,0.05)] hover:border-brand/40 transition-all duration-300 ${
                            isLongText || item.events.length === 1 ? 'md:col-span-2' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                            <span className="text-xs font-mono font-bold text-brand-dark tracking-widest uppercase">
                              {ev.month}
                            </span>
                          </div>

                          <p className="text-sm md:text-base text-neutral-850 leading-relaxed font-semibold">
                            {locale === 'en' && ev.en ? ev.en : ev.text}
                          </p>

                          {locale === 'zh' && ev.en && (
                            <p className="text-xs text-neutral-400 font-normal mt-2 leading-relaxed">
                              {ev.en}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Chronicle Drawer for Minor Years */}
        <div className="mt-20 border-t border-neutral-200/60 pt-12 text-center">
          <button
            type="button"
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white border border-neutral-200 hover:border-brand hover:bg-brand-light text-neutral-800 font-bold transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer text-sm"
          >
            <span>
              {showFullHistory
                ? locale === 'en'
                  ? 'Hide Complete Chronicle'
                  : '收起完整历程'
                : locale === 'en'
                  ? 'Expand Full 15-Year Chronicle'
                  : '展开 15 年完整发展历程'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${showFullHistory ? 'rotate-180 text-brand' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showFullHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="overflow-hidden mt-8 max-w-2xl mx-auto"
              >
                <div className="relative pl-6 border-l border-neutral-250 space-y-6 text-left py-4">
                  {items.map((item) => (
                    <div key={item.year} className="relative group">
                      {/* Highlighted indicator for milestone years */}
                      <span
                        className={`absolute left-[-29px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                          item.isHighlight
                            ? 'bg-brand border-brand/50 scale-125 shadow-[0_0_8px_rgba(243,210,48,0.6)] animate-pulse'
                            : 'bg-neutral-300 border-white group-hover:bg-brand group-hover:scale-105'
                        }`}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                        <span
                          className={`text-base font-black shrink-0 select-none transition-colors duration-200 ${
                            item.isHighlight
                              ? 'text-brand font-extrabold'
                              : 'text-neutral-400 group-hover:text-brand'
                          }`}
                        >
                          {item.year}
                        </span>
                        <div className="space-y-1.5 flex-1">
                          {item.events.map((ev, idx) => (
                            <p
                              key={idx}
                              className={`text-xs leading-relaxed font-semibold ${item.isHighlight ? 'text-neutral-850 font-bold' : 'text-neutral-600 font-medium'}`}
                            >
                              <span className="text-brand-dark font-mono mr-1.5 uppercase font-bold">
                                {ev.month}
                              </span>
                              {locale === 'en' && ev.en ? ev.en : ev.text}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Stats Counter ── */
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          gsap.fromTo(
            el,
            { innerText: 0 },
            {
              innerText: value,
              duration: 1.5,
              ease: 'power2.out',
              snap: { innerText: 1 },
              onUpdate() {
                el.textContent = Math.round(Number(el.textContent || '0')) + suffix;
              },
            },
          );
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ── Main Component ── */
export default function AboutContent({
  timelineData,
  phases,
  partners,
  heroImage,
  locale = 'zh',
  t,
}: AboutContentProps) {
  const enrichedYears = enrichYears(timelineData, phases);

  const STATS = [
    { value: 15, suffix: locale === 'zh' ? '年' : 'yr', label: t['stats.years'] },
    { value: 30, suffix: '+', label: t['stats.events'] },
    { value: 3, suffix: '', label: t['stats.phases'] },
    { value: 6, suffix: '+', label: t['stats.partners'] },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — 左右分栏：信息 | 图片 */}
      <section className="relative min-h-[480px] md:min-h-[560px] flex flex-col md:flex-row">
        {/* Left — 信息区 */}
        <div className="flex-1 flex flex-col justify-center pt-28 md:pt-32 pb-10 md:pb-12 px-6 md:pl-[12%] md:pr-12">
          <motion.div variants={stagger(0.12)} initial="hidden" animate="visible">
            <motion.p
              className="text-xs tracking-[0.3em] text-neutral-400 uppercase mb-3"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.subtitle']}
            </motion.p>
            <motion.h1
              variants={fadeUp}
              transition={springTransition}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight"
            >
              {t['hero.title']}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={springTransition}
              className="text-sm md:text-base text-neutral-500 leading-relaxed mb-8 max-w-md"
            >
              {t['hero.body']}
            </motion.p>
          </motion.div>

          {/* 3D Glass Bento Grid stats dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-2xl">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ ...springTransition, delay: 0.3 + i * 0.08 }}
                className="w-full flex"
              >
                <AntigravityCard
                  className="p-5 flex flex-col justify-center items-start w-full bg-white/75 shadow-[0_15px_30px_rgba(0,0,0,0.02)]"
                  maxTilt={12}
                >
                  <div className="text-3xl font-black text-brand leading-none tracking-tight">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-2.5">
                    {stat.label}
                  </p>
                </AntigravityCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right — 图片区（桌面端右侧，移动端底部条形） */}
        <div className="h-48 md:h-auto md:w-[45%] relative">
          <img
            src={heroImage}
            alt={t['hero.image.alt']}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent w-24" />
        </div>
      </section>

      {/* 年份聚光灯时间轴 */}
      <YearSpotlight items={enrichedYears} locale={locale} t={t} />

      {/* Partners */}
      <section className="py-20 px-6 md:px-[12%] bg-neutral-50">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          transition={springTransition}
          className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-12 text-center"
        >
          {t['partners.label']}
        </motion.p>
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="flex flex-wrap justify-center gap-6"
        >
          {partners.map((partner) => (
            <motion.div
              key={partner.name}
              variants={fadeUp}
              transition={{ type: 'spring', damping: 16, stiffness: 220 }}
              whileHover={{ y: -6, scale: 1.04 }}
              className="flex flex-col items-center justify-center py-6 px-4 w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(16.666%-20px)] rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur-md hover:border-brand/40 shadow-sm hover:shadow-[0_15px_35px_rgba(243,210,48,0.06)] transition-all duration-300 relative overflow-hidden group cursor-pointer"
            >
              {/* Internal Holographic Light Aura on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <span className="text-lg font-bold text-neutral-400 group-hover:text-neutral-900 transition-colors duration-200 cursor-pointer">
                {partner.name}
              </span>
              {partner.description && (
                <span className="text-xs text-neutral-400 group-hover:text-neutral-500 mt-1.5 text-center transition-colors duration-200">
                  {partner.description}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 愿景收尾 */}
      <section className="py-20 px-6 md:px-[12%] bg-white">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          transition={springTransition}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-8 h-[2px] bg-brand mx-auto mb-8" />
          <p className="text-xl md:text-2xl text-neutral-700 leading-relaxed font-light italic">
            {t['vision.quote']}
          </p>
          <p className="mt-6 text-sm text-neutral-400">{t['vision.author']}</p>
        </motion.div>
      </section>

      {/* 底部 CTA */}
      <section className="py-16 px-6 md:px-[12%] bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-neutral-900 mb-3">{t['cta.title']}</h3>
          <p className="text-neutral-500 mb-6">{t['cta.body']}</p>
          <a
            href={localePath('/guide', locale)}
            className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-8 py-3 rounded-full hover:bg-brand-hover transition-colors duration-200 cursor-pointer font-medium"
          >
            {t['cta.button']}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
