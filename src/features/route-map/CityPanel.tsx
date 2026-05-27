import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Compass, Cpu, Users, MapPin, ArrowUpRight, Image as ImageIcon } from "lucide-react";
import type { RouteCity } from "@/data/route-cities";
import type { Locale } from "@/i18n/index";
import { localePath } from "@/i18n/index";
import AntigravityCard from "@/app/components/AntigravityCard";
import ExpeditionLog from "./ExpeditionLog";
import PeopleStrip from "./PeopleStrip";
import PhotoStrip from "./PhotoStrip";

interface SerializedJournal {
  slug: string;
  title: string;
  date: string;
  status: string;
  city: string;
}

export default function CityPanel({
  city,
  cities,
  totalLegs,
  isLatest,
  t,
  locale = 'zh',
  hero = false,
  onSelectCity,
  journals,
}: {
  city: RouteCity | null;
  cities: RouteCity[];
  totalLegs: number;
  isLatest: boolean;
  t: Record<string, string>;
  locale?: Locale;
  hero?: boolean;
  onSelectCity?: (label: string) => void;
  journals?: SerializedJournal[];
}) {
  const getT = (key: string, fallback: string) => {
    return t[key] ?? fallback;
  };

  if (!city) {
    return (
      <AntigravityCard className={`flex flex-col items-center justify-center text-center px-6 py-12 ${hero ? 'min-h-[200px]' : 'min-h-[320px] h-full'}`}>
        <MapPin className="w-6 h-6 text-neutral-300 mb-3" />
        <p className="text-sm text-neutral-500 max-w-[36ch] leading-relaxed">
          {getT('journal.empty', getT('route.journals.empty', '点击地图上的城市，查看那一程的现场记录。'))}
        </p>
      </AntigravityCard>
    );
  }

  const legCounter = city.isOrigin
    ? null
    : (t['journal.legCounter'] ?? '{n} / {total}')
        .replace('{n}', String(city.order))
        .replace('{total}', String(totalLegs));

  // 1. 过滤并计算海拔高程数据点，展示基准的横向行程断面
  const elevationCities = useMemo(() => {
    return cities.filter(c => c.altitude != null);
  }, [cities]);

  // 最大海拔刻度 1510m (毕节)
  const maxAlt = 1510;
  
  // SVG 高度图尺寸与内边距
  const svgW = 460;
  const svgH = 85;
  const paddingLeft = 25;
  const paddingRight = 20;
  const paddingTop = 12;
  const paddingBottom = 22;
  const plotW = svgW - paddingLeft - paddingRight;
  const plotH = svgH - paddingTop - paddingBottom;

  // 映射高程坐标点
  const points = useMemo(() => {
    if (elevationCities.length === 0) return [];
    return elevationCities.map((c, i) => {
      const x = elevationCities.length > 1
        ? paddingLeft + (i * plotW) / (elevationCities.length - 1)
        : paddingLeft + plotW / 2;
      const alt = parseFloat(c.altitude) || 0;
      const y = svgH - paddingBottom - (alt / maxAlt) * plotH;
      return {
        x,
        y,
        city: c,
        alt
      };
    });
  }, [elevationCities, plotW, plotH, svgH, paddingBottom]);

  // 生成剖面线与区域填充路径
  const lineD = useMemo(() => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    return `${lineD} L ${points[points.length - 1].x} ${svgH - paddingBottom} L ${points[0].x} ${svgH - paddingBottom} Z`;
  }, [points, lineD, svgH, paddingBottom]);

  // 海拔网格基准线
  const gridLines = useMemo(() => {
    const alts = [500, 1000, 1500];
    return alts.map(alt => {
      const y = svgH - paddingBottom - (alt / maxAlt) * plotH;
      return { alt, y };
    });
  }, [plotH, svgH, paddingBottom]);

  // Filter journals for this city
  const cityJournals = useMemo(() => {
    if (!journals) return [];
    return journals.filter(j => j.city === city.id);
  }, [journals, city.id]);

  return (
    <AnimatePresence mode="wait">
      <div key={city.label} className="w-full">
        <AntigravityCard className={`w-full ${hero ? 'p-6 md:p-8' : 'p-6 md:p-7'}`}>
          <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full bg-transparent flex flex-col gap-8 items-stretch ${hero ? 'lg:flex-row lg:gap-10' : ''}`}
          >
            {/* 左侧栏：行程日志 + 海拔高度断面图 */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <header className="mb-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {legCounter && (
                      <span className="inline-flex items-center text-[10px] uppercase tracking-[0.18em] text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-sm">
                        {legCounter}
                      </span>
                    )}
                    {isLatest && !city.isOrigin && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-brand-foreground bg-brand px-2 py-0.5 rounded-sm font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-foreground animate-pulse" />
                        {getT('journal.latest', getT('route.status.latest', '最新'))}
                      </span>
                    )}
                    {city.isOrigin && (
                      <span className="inline-flex items-center text-[10px] uppercase tracking-[0.18em] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-sm font-semibold">
                        {getT('journal.origin', getT('route.status.origin', '出发点'))}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className={`font-bold text-neutral-900 leading-tight ${hero ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
                      {city.label}
                    </h3>
                    {city.event?.date && (
                      <p className="font-mono text-xs text-neutral-500 tracking-wider">
                        {city.event.date}
                      </p>
                    )}
                  </div>
                </header>

                {/* 航行日志:越界钩子 + 新世界 + 火种 */}
                {city.expedition && (
                  <div className="mb-6">
                    <ExpeditionLog expedition={city.expedition} locale={locale} />
                  </div>
                )}

                {/* 新文明 */}
                {city.people && city.people.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand" />
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#796f59]">
                        {locale === "zh" ? "新文明 · 遇见的人" : "NEW CIVILIZATIONS"}
                      </h5>
                    </div>
                    <PeopleStrip people={city.people} locale={locale} />
                  </div>
                )}

                {/* 剧照 */}
                {city.photos && city.photos.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-brand" />
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#796f59]">
                        {locale === "zh" ? "剧照" : "FROM THE FIELD"}
                      </h5>
                    </div>
                    <PhotoStrip photos={city.photos} locale={locale} />
                  </div>
                )}

                {/* 1. 行程海拔剖面图（横向高度断面，反映地理阶梯的攀爬过程） */}
                <div className="mb-6 bg-[#fcfbf9]/60 border border-[#e5dfd3]/60 rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold flex items-center gap-1 font-mono">
                      <Activity className="w-3 h-3 text-brand" />
                      {getT('route.telemetry.elevationProfile', locale === 'zh' ? '海拔高度纵断面' : 'EXPEDITION ELEVATION PROFILE')}
                    </h4>
                    <span className="text-[10px] text-amber-700 font-mono font-bold">
                      {getT('route.telemetry.currentElevation', locale === 'zh' ? '当前海拔' : 'Elev')}: {city.altitude}m
                    </span>
                  </div>

                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible select-none">
                    {/* 阶梯基准线 */}
                    {gridLines.map((g, idx) => (
                      <g key={idx} opacity={0.25}>
                        <line
                          x1={paddingLeft}
                          y1={g.y}
                          x2={svgW - paddingRight}
                          y2={g.y}
                          stroke="#a16207"
                          strokeWidth={0.5}
                          strokeDasharray="2 3"
                        />
                        <text
                          x={paddingLeft - 4}
                          y={g.y + 2}
                          fontSize={6.5}
                          fill="#78350f"
                          textAnchor="end"
                          className="font-mono font-medium"
                        >
                          {g.alt}m
                        </text>
                      </g>
                    ))}

                    {/* 海拔渐变阴影填充，反映山岳厚重感 */}
                    <path
                      d={areaD}
                      fill="url(#elevation-grad)"
                      opacity={0.12}
                    />

                    {/* 背景总航线路线虚线 */}
                    <path
                      d={lineD}
                      fill="none"
                      stroke="#d8b4fe"
                      strokeWidth={1.2}
                      opacity={0.35}
                      strokeDasharray="1.5 2"
                    />

                    {/* 已驶过航线实线（展示行车进度） */}
                    <path
                      d={(() => {
                        const visitedPts = points.filter(p => p.city.visited || p.city.label === city.label);
                        if (visitedPts.length === 0) return "";
                        return visitedPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      })()}
                      fill="none"
                      stroke="#eab308"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />

                    {/* 城市海拔锚定点 */}
                    {points.map((p, idx) => {
                      const isActive = p.city.label === city.label;
                      const isVisited = p.city.visited;
                      
                      return (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onClick={() => onSelectCity?.(p.city.label)}
                        >
                          {/* 活跃点雷达呼吸圈 */}
                          {isActive && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={7}
                              fill="#f3d230"
                              opacity={0.25}
                              className="animate-ping"
                            />
                          )}
                          
                          {/* 海拔点 */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isActive ? 4.5 : isVisited ? 3 : 2.5}
                            fill={isActive ? '#eab308' : isVisited ? '#f3d230' : '#d1d5db'}
                            stroke={isActive ? 'white' : 'transparent'}
                            strokeWidth={isActive ? 1.2 : 0}
                            className="transition-all duration-200 group-hover:scale-130"
                          />

                          <title>{`${p.city.label}: ${p.alt}m`}</title>
                          
                          {/* 底部城市标签 */}
                          <text
                            x={p.x}
                            y={svgH - 4}
                            textAnchor="middle"
                            fontSize={7.5}
                            fill={isActive ? '#1a1408' : '#78716c'}
                            fontWeight={isActive ? 800 : 500}
                          >
                            {locale === 'zh' ? p.city.label : p.city.label_en || p.city.label}
                          </text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="elevation-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* 行程日志主要陈述 */}
                <div className="mt-2 text-left">
                  {city.event ? (
                    <p className="text-neutral-700 leading-relaxed text-sm md:text-[14.5px]">
                      {locale === 'zh' ? city.event.summary : city.event.summary_en || city.event.summary}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <span className="inline-flex w-fit items-center text-[10px] uppercase tracking-[0.18em] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-sm font-semibold">
                        {getT('journal.upcoming', getT('route.status.upcoming', '即将抵达'))}
                      </span>
                      <p className="text-sm text-neutral-500 leading-relaxed">
                        {getT('journal.upcomingDesc', getT('route.status.upcomingDesc', '此城正在计划中，更多细节将在抵达前公开'))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 日志外部链接 CTA 按钮区 */}
              {city.event && (
                <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap gap-4 items-center">
                  {/* localSlug pointed at the deprecated /documentation collection.
                      Related journals are now surfaced by city.id in the journals
                      panel above, so no inline link is needed here. */}
                  {city.event.link && (
                    <a
                      href={city.event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold border-b border-neutral-900 pb-0.5 text-neutral-900 hover:text-brand hover:border-brand transition-colors duration-200 cursor-pointer"
                    >
                      {locale === 'zh' ? (city.event.linkLabel ?? '查看现场连线') : (city.event.linkLabel_en ?? 'Read field log')}
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 右侧栏：地质地貌与运行测控 HUD 面板 */}
            <div className={`w-full flex-shrink-0 flex flex-col bg-[#fcfbf9]/60 backdrop-blur-md border border-[#e5dfd3] rounded-2xl p-5 md:p-6 justify-between ${hero ? 'lg:w-[50%]' : ''}`}>
              <div>
                {/* HUD 头部 */}
                <div className="flex items-center justify-between pb-3 border-b border-[#e5dfd3]/60 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                    <span className="font-semibold text-[11px] tracking-wider text-[#796f59] uppercase font-mono">
                      {getT('route.telemetry.hud', locale === 'zh' ? '极境测控台' : 'Telemetry HUD')}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold tracking-wider">
                    {getT('route.telemetry.sensorsOnline', 'SENSORS ONLINE')}
                  </span>
                </div>

                {/* 2x2 Telemetry Grid - 地学与工程核心数据 */}
                <div className={`grid grid-cols-1 gap-4 text-left ${hero ? 'md:grid-cols-2' : ''}`}>
                  {/* Grid 1: 海拔高度与三级阶梯 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center flex-shrink-0 text-brand">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        {getT('route.telemetry.altitude', 'ALTITUDE')} / {getT('route.telemetry.terrainStep', 'TERRAIN STEP')}
                      </h5>
                      <p className="text-lg font-bold font-mono text-neutral-800 leading-tight mt-0.5">
                        {city.altitude} <span className="text-[10px] font-sans font-semibold text-neutral-500">m</span>
                      </p>
                      <p className="text-[11px] text-neutral-600 font-semibold mt-1">
                        {locale === 'zh' ? city.terrainStep : city.terrainStepEn}
                      </p>
                    </div>
                  </div>

                  {/* Grid 2: 局部气候与地质地貌 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center flex-shrink-0 text-brand">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        {getT('route.telemetry.climate', 'MICROCLIMATE')} / {getT('route.telemetry.terrain', 'TERRAIN')}
                      </h5>
                      <p className="text-xs font-bold text-neutral-800 leading-tight mt-1 truncate max-w-[170px]" title={locale === 'zh' ? city.climate : city.climateEn}>
                        {locale === 'zh' ? city.climate : city.climateEn}
                      </p>
                      <p className="text-[10.5px] text-neutral-500 font-medium mt-1 leading-snug line-clamp-2" title={locale === 'zh' ? city.terrain : city.terrainEn}>
                        {locale === 'zh' ? city.terrain : city.terrainEn}
                      </p>
                    </div>
                  </div>

                  {/* Grid 3: 在地共创实绩 */}
                  <div className={`pt-3.5 border-t border-[#e5dfd3]/40 ${hero ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-brand" />
                      <h5 className="text-[10px] text-[#796f59] font-bold uppercase tracking-wider">
                        {getT('route.telemetry.coCreation', locale === 'zh' ? '在地共创与科普实绩' : 'LOCAL CO-CREATION')}
                      </h5>
                    </div>
                    
                    <div className={`grid grid-cols-1 gap-2 ${hero ? 'md:grid-cols-3' : ''}`}>
                      {(locale === 'zh' ? city.relationStats : city.relationStatsEn)?.map((stat, idx) => (
                        <div key={idx} className="bg-[#f5f2eb]/60 rounded-lg px-2.5 py-1.5 border border-[#e5dfd3]/50 text-left">
                          <span className="block text-[11px] font-semibold text-neutral-700 leading-tight">
                            {stat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 4: 车载测控与极境挑战 */}
              <div className="mt-5 bg-[#fbf5e6]/60 border border-[#e8d5b5]/50 rounded-xl p-3 text-xs text-neutral-700 leading-relaxed shadow-[inset_0_1px_2px_rgba(232,213,181,0.05)] text-left">
                <div className="font-semibold text-amber-800 mb-1 flex items-center gap-1.5 font-mono text-[10.5px]">
                  <Cpu className="w-3.5 h-3.5 text-brand animate-pulse" />
                  <span>{getT('route.telemetry.challenge', locale === 'zh' ? '车载测控与极境行车挑战' : 'CHALLENGE')}</span>
                </div>
                <p className="text-[11.5px] font-medium text-neutral-600 leading-relaxed">
                  {locale === 'zh' ? city.challenge : city.challengeEn}
                </p>
              </div>

              {/* 关联日记列表 */}
              {journals && cityJournals.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#e5dfd3]/40 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Activity className="w-3.5 h-3.5 text-brand" />
                    <h5 className="text-[10px] text-[#796f59] font-bold uppercase tracking-wider">
                      {getT('route.journals.title', 'RELATED JOURNALS')}
                    </h5>
                  </div>
                  <div className="space-y-2">
                    {cityJournals.map((j) => {
                      const isPublished = j.status === 'published';
                      return (
                        <div
                          key={j.slug}
                          className="flex items-center justify-between bg-[#f5f2eb]/60 rounded-xl p-2.5 border border-[#e5dfd3]/50 hover:border-brand/30 transition-colors duration-200"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <span className="block text-[12px] font-semibold text-neutral-800 truncate">
                              {j.title}
                            </span>
                            <span className="block text-[9px] font-mono text-neutral-400 mt-0.5">
                              {j.date}
                            </span>
                          </div>
                          {isPublished ? (
                            <a
                              href={localePath(`/journals/${j.slug}`, locale)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-brand/10 hover:bg-brand/20 px-2.5 py-1 rounded-full transition-colors duration-200"
                            >
                              <span>{getT('route.action.readLocal', '阅读')}</span>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-semibold text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
                              {getT('route.journals.organizing', '整理中')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.article>
        </AntigravityCard>
      </div>
    </AnimatePresence>
  );
}
