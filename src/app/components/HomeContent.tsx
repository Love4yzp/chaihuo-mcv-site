import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import ReactSlick from 'react-slick';

// Vite 8 CJS interop: default export is nested
const Slider = (
  'default' in ReactSlick ? (ReactSlick as { default: typeof ReactSlick }).default : ReactSlick
) as typeof ReactSlick;
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MAP_BG } from '@/features/route-map/map-style';
import RoutePreview from '@/features/route-map/RoutePreview';
import type { Stop as RouteCity } from '@/features/route-map/stops-loader';
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import {
  buttonPress,
  defaultViewport,
  fadeLeft,
  fadeUp,
  springTransition,
  stagger,
} from '../components/motion';
import RoleTimeline from './RoleTimeline';

// ─── Types ───

interface HeroImage {
  image: string;
  alt?: string;
}

interface TimelineSegment {
  id: string;
  role: string;
  crewId: string;
  name: string;
  image: string;
  startDate: string;
  endDate: string | null;
  handoffName: string | null;
  startLocation: string;
  endLocation: string | null;
}

interface TimelineData {
  roles: Array<{ key: string; label: string }>;
  segments: TimelineSegment[];
  monthMarkers: Array<{ label: string; pct: number }>;
  projectStart: string;
  projectEnd: string;
}

interface Props {
  cities: RouteCity[];
  heroImages: HeroImage[];
  timeline: TimelineData;
  locale?: Locale;
  t: Record<string, string>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEPARTURE_DATE = Date.UTC(2026, 3, 22);
const labCards = [
  [
    'lab.aiTitle',
    'lab.aiDesc',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
  ],
  [
    'lab.fabTitle',
    'lab.fabDesc',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
  ],
  [
    'lab.spaceTitle',
    'lab.spaceDesc',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
  ],
] as const;

function getDepartureDays(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - DEPARTURE_DATE) / MS_PER_DAY));
}

export default function HomeContent({ cities, heroImages, timeline, locale = 'zh', t }: Props) {
  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.order - b.order), [cities]);
  const lastVisited = useMemo(
    () => [...sortedCities].reverse().find((c) => c.visited) ?? null,
    [sortedCities],
  );
  const visitedCount = useMemo(() => cities.filter((city) => city.visited).length, [cities]);
  const departureDays = getDepartureDays();

  // Respect prefers-reduced-motion: pause carousel autoplay for those users.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const SliderPrevArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label={t['carousel.prevAria'] ?? (locale === 'en' ? 'Previous slide' : '上一张')}
    >
      <ChevronLeft size={20} />
    </button>
  );

  const SliderNextArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label={t['carousel.nextAria'] ?? (locale === 'en' ? 'Next slide' : '下一张')}
    >
      <ChevronRight size={20} />
    </button>
  );

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: !prefersReducedMotion,
    autoplaySpeed: 5000,
    fade: true,
    arrows: true,
    pauseOnHover: true,
    prevArrow: <SliderPrevArrow />,
    nextArrow: <SliderNextArrow />,
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-screen min-h-[600px] bg-black text-white">
        <Slider {...sliderSettings} className="h-full">
          {heroImages.map((image) => (
            <div key={image.image} className="h-screen min-h-[600px] relative">
              <div
                className="h-screen min-h-[600px] bg-cover bg-center"
                style={{ backgroundImage: `url(${image.image})` }}
                role="img"
                aria-label={image.alt ?? t['hero.title']}
              >
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </div>
          ))}
        </Slider>

        {/* Hero 内容 */}
        <div className="absolute inset-0 flex flex-col justify-center pointer-events-none px-6 md:px-[12%] lg:px-[16%]">
          <motion.div
            className="max-w-2xl pointer-events-auto"
            variants={stagger(0.2)}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              className="font-display text-5xl md:text-7xl lg:text-8xl mb-4 leading-tight"
              variants={fadeLeft}
              transition={springTransition}
            >
              <span className="block text-white font-bold">{t['hero.title']}</span>
              <span className="block text-brand font-bold text-4xl md:text-6xl mt-2">
                {t['hero.slogan']}
              </span>
            </motion.h1>
            <motion.p
              className="text-base md:text-lg text-neutral-300 mb-6 leading-relaxed max-w-lg"
              variants={fadeLeft}
              transition={springTransition}
            >
              {t['hero.subtitle']}
            </motion.p>
            <motion.p
              className="text-base md:text-lg text-neutral-300 mb-10 max-w-lg leading-relaxed"
              variants={fadeLeft}
              transition={springTransition}
            >
              {t['hero.body']}
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
              transition={{ y: springTransition, opacity: { duration: 0.12, ease: 'easeOut' } }}
              className="flex flex-wrap gap-4"
            >
              {/* 了解我们 (About Us) */}
              <motion.a
                href={localePath('/about', locale)}
                className="pointer-events-auto border border-white/20 bg-surface-card/5 backdrop-blur-sm text-white px-8 py-4 rounded-full flex items-center gap-2 cursor-pointer group"
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <span>{t['hero.aboutAction']}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </motion.a>

              {/* 加入行动 (Join Action) */}
              <motion.a
                href={localePath('/guide', locale)}
                className="pointer-events-auto border border-brand/35 bg-brand/10 backdrop-blur-md text-brand px-8 py-4 rounded-full flex items-center gap-2 cursor-pointer font-semibold group shadow-md"
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  backgroundColor: 'rgba(243, 210, 48, 0.2)',
                  borderColor: 'rgba(243, 210, 48, 0.55)',
                  boxShadow: '0 15px 35px rgba(243, 210, 48, 0.25)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <span>{t['hero.joinAction']}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce motion-reduce:animate-none text-white/60">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* 实时任务状态条 — hero 图片之后,独立一条,居中 */}
      <div className="bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
          <span className="text-white/70">
            {(t['status.days'] ?? '已出发 {days} 天').replace('{days}', String(departureDays))}
          </span>
          <span className="text-white/25">·</span>
          <span className="flex items-center gap-2 font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse motion-reduce:animate-none" />
            {(t['status.current'] ?? '位于 {city}').replace('{city}', lastVisited?.label ?? '')}
          </span>
          <span className="text-white/25">·</span>
          <span className="text-white/70">
            {(t['status.cities'] ?? '已抵达 {count} 城').replace('{count}', String(visitedCount))}
          </span>
        </div>
      </div>

      <section className="bg-neutral-50 text-black py-16 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* 左侧栏: 极境测控指令台 (Col-span 5) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              variants={stagger(0.12)}
              className="lg:col-span-5 flex flex-col justify-between gap-6"
            >
              <div>
                <motion.span
                  variants={fadeUp}
                  className="text-xs font-mono uppercase tracking-[0.25em] text-neutral-500 font-bold mb-3 block"
                >
                  EXPEDITION RADAR / 极境测控
                </motion.span>
                <motion.h2
                  variants={fadeUp}
                  transition={springTransition}
                  className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-neutral-900 tracking-tight"
                >
                  {t['route.title1']}
                  <span className="text-brand-dark block mt-1">{t['route.title2']}</span>
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  transition={springTransition}
                  className="text-neutral-500 leading-relaxed text-sm md:text-base mt-4"
                >
                  {t['route.body']}
                </motion.p>
              </div>

              {/* 实时数据看板 (Telemetry Grid) */}
              <motion.div
                variants={fadeUp}
                transition={springTransition}
                className="grid grid-cols-2 gap-3"
              >
                <div className="bg-surface-card/60 backdrop-blur-md border border-white/80 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {t['telemetry.arrivedStops']}
                  </div>
                  <div className="text-xl font-bold font-mono text-neutral-900 mt-1 flex items-baseline gap-1">
                    <span>{visitedCount}</span>
                    <span className="text-xs text-neutral-500 font-normal">
                      / {cities.length} stops
                    </span>
                  </div>
                </div>

                <div className="bg-surface-card/60 backdrop-blur-md border border-white/80 p-3.5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {t['telemetry.days']}
                  </div>
                  <div className="text-xl font-bold font-mono text-neutral-900 mt-1 flex items-center gap-2">
                    <span>{departureDays}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 motion-reduce:animate-none"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                    </span>
                  </div>
                </div>

                <div className="bg-surface-card/60 backdrop-blur-md border border-white/80 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {t['telemetry.current']}
                  </div>
                  <div className="text-base font-bold text-neutral-900 mt-1 truncate">
                    {lastVisited?.label ?? '-'}
                  </div>
                </div>

                <div className="bg-surface-card/60 backdrop-blur-md border border-white/80 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {t['telemetry.planProvinces']}
                  </div>
                  <div className="text-base font-bold text-neutral-900 mt-1">21 省 29 城</div>
                </div>
              </motion.div>

              {/* 车载环境信息实时流 (Live Environment Log) */}
              {lastVisited && (
                <motion.div
                  variants={fadeUp}
                  transition={springTransition}
                  className="bg-neutral-900/95 text-white p-4.5 rounded-xl border border-white/10 shadow-lg font-mono relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent bg-[length:100%_4px] pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse motion-reduce:animate-none" />
                      {/* TODO: 信息呈现待重新构思 — 旧排版残留,先不显示 */}
                    </span>
                    <span>live feed</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500">ALT / 海拔</span>
                      <span className="text-brand font-bold">{lastVisited.altitude} m</span>
                    </div>
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-neutral-500 shrink-0">GEO / 地貌</span>
                      <span
                        className="text-neutral-100 text-right truncate max-w-[200px]"
                        title={lastVisited.terrain}
                      >
                        {lastVisited.terrain}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-neutral-500 shrink-0">CLM / 气候</span>
                      <span
                        className="text-neutral-100 text-right truncate max-w-[200px]"
                        title={lastVisited.climate}
                      >
                        {lastVisited.climate}
                      </span>
                    </div>
                    <div className="border-t border-neutral-900/60 pt-2 mt-2 flex flex-col gap-1">
                      <span className="text-[10px] text-brand/75 uppercase tracking-wider font-semibold">
                        Current Tech Challenge / 实时技术挑战:
                      </span>
                      <span className="text-neutral-300 leading-relaxed text-[11px] font-sans mt-0.5">
                        {lastVisited.challenge}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 路线查看 CTA 按钮 */}
              <motion.div variants={fadeUp} className="pt-2">
                <motion.a
                  href={localePath('/route', locale)}
                  className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-brand text-white hover:text-brand-foreground px-6 py-3.5 rounded-xl transition-[background-color,color,box-shadow] duration-300 cursor-pointer text-sm font-bold shadow-lg hover:shadow-brand/20 group w-full justify-center lg:w-auto"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{t['routePreview.cta']}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.a>
              </motion.div>
            </motion.div>

            {/* 右侧栏: 测控地图玻璃卡框 (Col-span 7) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <motion.div
                className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-neutral-300/40"
                style={{ aspectRatio: '4/3', backgroundColor: MAP_BG }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="absolute inset-0">
                  <RoutePreview cities={cities} ariaLabel={t['routePreview.aria']} />
                </div>

                {/* 当前活动城市标签 */}
                {lastVisited && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="absolute top-4 left-4 bg-neutral-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 border border-white/10"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 motion-reduce:animate-none"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                    </span>
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold block leading-none">
                        {t['telemetry.current']}
                      </span>
                      <span className="text-sm font-bold text-white leading-tight mt-0.5 block">
                        {lastVisited.label}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 地图图例标注 */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <div className="bg-surface-card/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs text-neutral-700 flex items-center gap-3.5 shadow-md border border-white/60">
                    <span className="flex items-center gap-1.5 font-medium select-none">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                      {t['map.visited'] ?? '已到达'}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium select-none">
                      <span className="w-2.5 h-2.5 rounded-full bg-surface-card border border-neutral-500" />
                      {t['map.planned'] ?? '计划中'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 在路上的人 - 三角色时间轴 */}
      <RoleTimeline
        roles={timeline.roles}
        segments={timeline.segments}
        monthMarkers={timeline.monthMarkers}
        projectStart={timeline.projectStart}
        projectEnd={timeline.projectEnd}
        locale={locale}
        t={t}
      />

      {/* 基地车概况 - 流动的基础设施 */}
      <section className="py-20 px-6 bg-surface-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-black">
            {t['lab.title']}
          </h2>
          <p className="text-center text-neutral-500 mb-16 max-w-2xl mx-auto">
            {t['lab.subtitle']}
          </p>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            {labCards.map(([title, desc, image]) => (
              <motion.div
                key={title}
                className="bg-surface-card rounded-lg overflow-hidden shadow-sm border border-neutral-300 hover:shadow-md transition-shadow duration-200"
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={springTransition}
              >
                <div
                  className="h-64 bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
                <div className="p-6">
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">{t[title]}</h3>
                  <p className="text-neutral-500 mb-4">{t[desc]}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 旅途日记 CTA */}
      <section className="py-16 px-6 border-t border-neutral-300">
        <motion.div
          className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={stagger(0.15)}
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-2">
              {t['cta.label']}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
              {t['cta.title']}
            </h2>
            <p className="text-neutral-500 text-sm max-w-lg">{t['cta.body']}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <motion.a
              href={localePath('/journals', locale)}
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-sm hover:bg-brand hover:text-brand-foreground transition-colors duration-200 cursor-pointer text-sm font-medium whitespace-nowrap"
              {...buttonPress}
            >
              {t['cta.explore']}
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </motion.a>
            <motion.a
              href={localePath('/guide', locale)}
              className="inline-flex items-center gap-2 border border-neutral-300 text-neutral-700 px-6 py-3 rounded-sm hover:border-brand hover:text-brand transition-colors duration-200 cursor-pointer text-sm font-medium whitespace-nowrap"
              {...buttonPress}
            >
              {t['cta.join']}
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </motion.a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
