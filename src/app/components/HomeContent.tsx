import { useMemo } from "react";
import { motion } from "motion/react";
import ReactSlick from "react-slick";
// Vite 8 CJS interop: default export is nested
const Slider = (
  "default" in ReactSlick ? (ReactSlick as any).default : ReactSlick
) as typeof ReactSlick;
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Flag, MapPin, Route, type LucideIcon } from "lucide-react";
import { routeCities } from "@/data/route-cities";
import RoutePreview from "@/features/route-map/RoutePreview";
import { localizeCity } from "@/features/route-map/projection";
import {
  fadeUp,
  fadeLeft,
  fadeIn,
  stagger,
  springTransition,
  defaultViewport,
  buttonPress,
} from "../components/motion";
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
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
  heroImages: HeroImage[];
  timeline: TimelineData;
  locale?: Locale;
  t: Record<string, string>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEPARTURE_DATE = Date.UTC(2026, 3, 22);
const labCards = [
  ['lab.aiTitle', 'lab.aiDesc', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80'],
  ['lab.fabTitle', 'lab.fabDesc', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80'],
  ['lab.spaceTitle', 'lab.spaceDesc', 'https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80'],
] as const;

function getDepartureDays(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - DEPARTURE_DATE) / MS_PER_DAY));
}

function TelemetryItem({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0">
        <div className="truncate font-mono text-lg font-semibold leading-tight text-neutral-900">
          {value}
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
          {label}
        </div>
      </div>
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
  const visitedCount = useMemo(
    () => routeCities.filter((city) => city.visited).length,
    [],
  );
  const departureDays = getDepartureDays();
  const telemetryItems = [
    {
      icon: Flag,
      value: `${visitedCount}/${routeCities.length}`,
      label: t['telemetry.arrivedStops'],
    },
    { icon: Route, value: '21', label: t['telemetry.planProvinces'] },
    { icon: CalendarDays, value: String(departureDays), label: t['telemetry.days'] },
    { icon: MapPin, value: lastVisited?.label ?? '-', label: t['telemetry.current'] },
  ];

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


      <motion.section
        className="bg-neutral-50 text-black py-20 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        variants={stagger(0.16)}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                {t['route.title1']}
                <br />
                <span>{t['route.title2']}</span>
              </h2>
              <p className="mt-4 text-neutral-500 leading-relaxed max-w-xl">
                {t['route.body']}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-5 border-y border-neutral-200 py-5 md:grid-cols-4 lg:grid-cols-2">
                {telemetryItems.map((item) => (
                  <TelemetryItem key={item.label} {...item} />
                ))}
              </div>
              <motion.a
                href={localePath('/route', locale)}
                className="mt-8 inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-sm hover:bg-brand hover:text-brand-foreground transition-colors duration-200 cursor-pointer text-sm font-medium"
                {...buttonPress}
              >
                {t['routePreview.cta']}
                <ChevronRight className="w-4 h-4" />
              </motion.a>
            </motion.div>
            <motion.div
              className="aspect-[3/2] overflow-hidden rounded-lg border border-neutral-200 bg-[#f7f4ed] shadow-sm"
              variants={fadeIn}
            >
              <RoutePreview cities={localizedCities} ariaLabel={t['routePreview.aria']} />
            </motion.div>
          </div>
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
            {labCards.map(([title, desc, image]) => (
              <motion.div
                key={title}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={springTransition}
              >
                <div
                  className="h-64 bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
                <div className="p-6">
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                    {t[title]}
                  </h3>
                  <p className="text-neutral-500 mb-4">{t[desc]}</p>
                </div>
              </motion.div>
            ))}
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
