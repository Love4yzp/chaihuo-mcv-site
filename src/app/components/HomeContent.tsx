import { Fragment, useState, useCallback, useRef, useEffect, useMemo, type ReactElement } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import ReactSlick from "react-slick";
// Vite 8 CJS interop: default export is nested
const Slider = (
  "default" in ReactSlick ? (ReactSlick as any).default : ReactSlick
) as typeof ReactSlick;
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { routeCities } from "@/data/route-cities";
import { ChinaRouteMap, CityPanel, localizeCity } from "@/features/route-map";
import {
  fadeUp,
  fadeLeft,
  fadeRight,
  fadeIn,
  stagger,
  springTransition,
  defaultViewport,
  buttonPress,
} from "../components/motion";
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import RoleTimeline from './RoleTimeline';
import AntigravityCard from './AntigravityCard';

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
  heroImages: HeroImage[];
  timeline: TimelineData;
  locale?: Locale;
  t: Record<string, string>;
}

// ─── CountUp Component ───

function CountUp({ end, label }: { end: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const numericPart = parseFloat(end.replace(/[^0-9.]/g, ""));
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => {
    if (end.includes("W")) return v.toFixed(1) + "W";
    if (end.includes("+")) return Math.round(v) + "+";
    return Math.round(v).toString();
  });

  useEffect(() => {
    if (isInView) {
      animate(motionVal, numericPart, { duration: 1.5, ease: "easeOut" });
    }
  }, [isInView]);

  return (
    <div ref={ref}>
      <motion.div className="font-bold mb-2 text-[40px] text-brand">
        {display}
      </motion.div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}





export default function HomeContent({ heroImages, timeline, locale = 'zh', t }: Props) {
  // Localized cities for current locale
  const localizedCities = useMemo(
    () => routeCities.map(c => localizeCity(c, locale)),
    [locale],
  );
  const sortedCities = useMemo(
    () => [...localizedCities].sort((a, b) => a.order - b.order),
    [localizedCities],
  );
  const lastVisited = useMemo(
    () => [...sortedCities].reverse().find(c => c.visited) ?? null,
    [sortedCities],
  );

  // Selected city for journal panel — defaults to most recent visited
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(
    lastVisited?.label ?? null,
  );
  const selectedCity = useMemo(
    () => localizedCities.find(c => c.label === selectedCityKey) ?? null,
    [localizedCities, selectedCityKey],
  );

  // Journal panel ref — scroll into view on mobile when a city is tapped
  const journalRef = useRef<HTMLDivElement>(null);
  const handleCitySelect = useCallback((key: string) => {
    setSelectedCityKey(key);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches &&
      journalRef.current
    ) {
      journalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const SliderPrevArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label="上一张"
    >
      <ChevronLeft size={20} />
    </button>
  );

  const SliderNextArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label="下一张"
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
    autoplay: true,
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
              className="text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight"
              variants={fadeLeft}
              transition={springTransition}
            >
              <div className="text-white font-bold">{t['hero.title']}</div>
              <div className="text-brand font-bold text-4xl md:text-6xl mt-2">
                {t['hero.slogan']}
              </div>
              <div className="text-base md:text-lg text-neutral-300 mt-3 font-normal">{t['hero.subtitle']}</div>
            </motion.h1>
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
                className="pointer-events-auto border border-white/20 bg-white/5 backdrop-blur-sm text-white px-8 py-4 rounded-full flex items-center gap-2 cursor-pointer group"
                whileHover={{ 
                  y: -4, 
                  scale: 1.02, 
                  backgroundColor: "rgba(255, 255, 255, 0.15)", 
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)" 
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <span>{t['hero.aboutAction']}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </motion.a>

              {/* 加入行动 (Join Action) */}
              <motion.a
                href={localePath('/guide', locale)}
                className="pointer-events-auto border border-brand/35 bg-brand/10 backdrop-blur-md text-brand px-8 py-4 rounded-full flex items-center gap-2 cursor-pointer font-semibold group shadow-[0_4px_20px_rgba(243,210,48,0.08)]"
                whileHover={{ 
                  y: -4, 
                  scale: 1.02, 
                  backgroundColor: "rgba(243, 210, 48, 0.2)", 
                  borderColor: "rgba(243, 210, 48, 0.55)",
                  boxShadow: "0 15px 35px rgba(243, 210, 48, 0.25)" 
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <span>{t['hero.joinAction']}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce text-white/60">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>


      {/* Hero → Stats 过渡 */}

      {/* 实时状态条 */}
      <div className="bg-neutral-900 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            {t['status.current'].replace('{city}', lastVisited?.label ?? '')}
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">{t['status.departure']}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">{t['status.route']}</span>
        </div>
      </div>

      {/* 项目核心展示 - 路线规划 */}
      <motion.section
        className="bg-neutral-50 text-black py-20 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        variants={stagger(0.2)}
      >
        <div className="max-w-6xl mx-auto">
          {/* 标题 + 统计数据 — 移动端在地图上方 */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-8 md:mb-0">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {t['route.title1']}
                <br />
                <span>{t['route.title2']}</span>
              </h2>
              <p className="text-neutral-500 leading-relaxed max-w-xl">
                {t['route.body']}
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-3 gap-8 md:gap-12"
            >
              <CountUp end="21" label={t['route.provinces']} />
              <CountUp end="1.9W" label={t['route.distance']} />
              <CountUp end="200+" label={t['route.days']} />
            </motion.div>
          </div>

          {/* 地图全宽 — 主视觉。容器比例匹配 viewBox 4:3，避免横向留白裁掉地图 */}
          <motion.div
            className="w-full aspect-[4/3] md:aspect-[3/2] lg:aspect-[3/2] mt-10"
            variants={fadeIn}
          >
            <ChinaRouteMap
              cities={localizedCities}
              selectedKey={selectedCityKey}
              onSelect={handleCitySelect}
              t={t}
            />
          </motion.div>

            <CityPanel
              city={selectedCity}
              cities={sortedCities}
              totalLegs={sortedCities.length - 1}
              isLatest={selectedCity?.label === lastVisited?.label}
              t={t}
              locale={locale}
              hero={true}
              onSelectCity={handleCitySelect}
            />

          {/* 已访问城市快速切换 — 缩略 chip 行 */}
          {sortedCities.filter(c => c.visited).length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 mr-1">
                {t['map.visited']}
              </span>
              {sortedCities
                .filter(c => c.visited)
                .map(c => {
                  const active = selectedCityKey === c.label;
                  return (
                    <button
                      key={c.label}
                      onClick={() => handleCitySelect(c.label)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors duration-200 cursor-pointer ${
                        active
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900'
                      }`}
                    >
                      {c.label}
                      {c.event?.date && (
                        <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-neutral-400' : 'text-neutral-400'}`}>
                          {c.event.date.slice(5)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </motion.section>

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
      <section className="py-20 px-6 bg-white">
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
            {/* 边缘算力 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.aiTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.aiDesc']}
                </p>
              </div>
            </motion.div>

            {/* 结构加工 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.fabTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.fabDesc']}
                </p>
              </div>
            </motion.div>

            {/* 实验场景 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.spaceTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.spaceDesc']}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 旅途日记 CTA */}
      <section className="py-16 px-6 border-t border-neutral-200">
        <motion.div
          className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={stagger(0.15)}
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-2">
              {t['cta.label']}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
              {t['cta.title']}
            </h2>
            <p className="text-neutral-500 text-sm max-w-lg">
              {t['cta.body']}
            </p>
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
