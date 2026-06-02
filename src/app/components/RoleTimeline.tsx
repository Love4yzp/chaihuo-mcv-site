import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultViewport, fadeUp, springTransition, stagger } from './motion';

interface Segment {
  id: string;
  role: string;
  crewId: string;
  name: string;
  image: string;
  bio?: string;
  startDate: string;
  endDate: string | null; // null = ongoing
  handoffName: string | null;
  startLocation: string;
  endLocation: string | null;
}

interface RoleLane {
  key: string; // canonical zh role string used as join key
  label: string; // localized label
}

interface MonthMarker {
  label: string; // 'APR', 'MAY' ...
  pct: number; // 0-100
}

interface RoleTimelineProps {
  roles: RoleLane[];
  segments: Segment[];
  monthMarkers: MonthMarker[];
  projectStart: string;
  projectEnd: string;
  locale: 'zh' | 'en';
  t: Record<string, string>;
}

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((end - start) / DAY_MS);
}

function pctOf(date: string, start: string, totalDays: number): number {
  const d = daysBetween(start, date);
  return (d / totalDays) * 100;
}

function formatShortDate(iso: string, locale: 'zh' | 'en'): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (locale === 'en') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return `${d.getUTCMonth() + 1}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function RoleTimeline({
  roles,
  segments,
  monthMarkers,
  projectStart,
  projectEnd,
  locale,
  t,
}: RoleTimelineProps) {
  const totalDays = useMemo(
    () => daysBetween(projectStart, projectEnd),
    [projectStart, projectEnd],
  );

  // Today position. Computed on client to stay accurate; SSR uses projectStart as a placeholder.
  const [todayPct, setTodayPct] = useState<number | null>(null);
  const [todayIso, setTodayIso] = useState<string>(projectStart);

  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const pct = Math.max(0, Math.min(100, pctOf(todayStr, projectStart, totalDays)));
    setTodayPct(pct);
    setTodayIso(todayStr);
  }, [projectStart, totalDays]);

  // Mobile horizontal scroll: auto-scroll to today on mount
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (todayPct === null || !scrollerRef.current) return;
    const el = scrollerRef.current;
    const target = (el.scrollWidth * todayPct) / 100 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [todayPct]);

  // Group segments by role for lane rendering
  const segmentsByRole = useMemo(() => {
    const map = new Map<string, Segment[]>();
    for (const role of roles) map.set(role.key, []);
    for (const seg of segments) {
      const list = map.get(seg.role);
      if (list) list.push(seg);
    }
    return map;
  }, [roles, segments]);

  // Role key → localized label lookup
  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) map.set(r.key, r.label);
    return map;
  }, [roles]);

  // Active members (currently aboard), ordered by role then boarding date
  const activeSegments = useMemo(() => {
    const roleIndex = new Map(roles.map((r, i) => [r.key, i] as const));
    return segments
      .filter((s) => s.endDate === null)
      .sort((a, b) => {
        const ai = roleIndex.get(a.role) ?? 99;
        const bi = roleIndex.get(b.role) ?? 99;
        if (ai !== bi) return ai - bi;
        return a.startDate.localeCompare(b.startDate);
      });
  }, [segments, roles]);

  return (
    <section className="relative bg-gradient-to-b from-neutral-50 via-white to-white py-24 md:py-36 px-6 border-t border-neutral-100/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          variants={stagger(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="mb-12 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <motion.p
              variants={fadeUp}
              transition={springTransition}
              className="text-xs uppercase tracking-[0.3em] text-neutral-400 mb-3"
            >
              {t['timeline.eyebrow']}
            </motion.p>
            <motion.h2
              variants={fadeUp}
              transition={springTransition}
              className="text-3xl md:text-4xl font-bold text-neutral-900 leading-tight"
            >
              {t['timeline.title']}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={springTransition}
              className="text-neutral-500 mt-3 max-w-md"
            >
              {t['timeline.body']}
            </motion.p>
          </div>
          <motion.div
            variants={fadeUp}
            transition={springTransition}
            className="text-xs font-mono tabular-nums text-neutral-400 flex md:flex-col md:items-end gap-3 md:gap-1"
          >
            <span className="uppercase tracking-[0.2em]">
              {formatShortDate(projectStart, locale)} → {formatShortDate(projectEnd, locale)}
            </span>
            <span className="text-neutral-300">·</span>
            <span>{t['timeline.totalDays'].replace('{days}', String(totalDays))}</span>
          </motion.div>
        </motion.div>

        {/* Timeline scroller — horizontal scroll on mobile, full width on desktop */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          transition={springTransition}
          className="relative"
        >
          <div
            ref={scrollerRef}
            className="overflow-x-auto md:overflow-visible -mx-6 md:mx-0 px-6 md:px-0 pb-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="relative min-w-[800px] md:min-w-0">
              {/* Month scale */}
              <div className="relative h-7 mb-3 border-b border-neutral-200">
                {monthMarkers.map((m) => (
                  <div
                    key={m.label}
                    className="absolute top-0 bottom-0 flex items-end pl-1.5"
                    style={{ left: `${m.pct}%` }}
                  >
                    <span className="absolute left-0 top-0 h-full w-px bg-neutral-200" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-400 pb-1">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lanes */}
              <div className="relative">
                {/* Today vertical line — spans all lanes */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-brand z-20 pointer-events-none"
                    style={{ left: `${todayPct}%` }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand" />
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.15em] text-brand-dark bg-white px-1.5">
                      {t['timeline.today']} · {formatShortDate(todayIso, locale)}
                    </div>
                  </div>
                )}

                {roles.map((role) => {
                  const laneSegments = segmentsByRole.get(role.key) ?? [];
                  return (
                    <div
                      key={role.key}
                      className="relative h-20 flex items-center border-b border-neutral-100 last:border-b-0"
                    >
                      {/* Role label — absolute top-left of the lane */}
                      <span className="absolute left-0 top-2 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 z-10 bg-white pr-2">
                        {role.label}
                      </span>

                      {/* Segments */}
                      <div className="relative w-full h-full">
                        {laneSegments.map((seg) => {
                          const startPct = pctOf(seg.startDate, projectStart, totalDays);
                          const endPctRaw = seg.endDate
                            ? pctOf(seg.endDate, projectStart, totalDays)
                            : (todayPct ?? startPct + 0.5);
                          const endPct = Math.max(endPctRaw, startPct + 0.5);
                          const widthPct = endPct - startPct;
                          const isOngoing = !seg.endDate;
                          const futureFadeWidthPct =
                            isOngoing && todayPct !== null && widthPct > 0
                              ? (Math.max(0, 100 - endPct) / widthPct) * 100
                              : 0;

                          return (
                            <div
                              key={seg.id}
                              className="absolute top-1/2 -translate-y-1/2 h-7 group"
                              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                            >
                              {/* Bar */}
                              <div
                                className={`absolute inset-y-2 left-0 right-0 rounded-full ${
                                  isOngoing
                                    ? 'bg-gradient-to-r from-brand to-brand/70'
                                    : 'bg-neutral-300'
                                }`}
                              />

                              {/* Future fade for ongoing segments — extends past today */}
                              {isOngoing && todayPct !== null && (
                                <div
                                  className="absolute inset-y-2 left-full rounded-r-full"
                                  style={{
                                    width: `${futureFadeWidthPct}%`,
                                    background:
                                      'linear-gradient(to right, rgb(243 210 48 / 0.5), rgb(243 210 48 / 0))',
                                  }}
                                />
                              )}

                              {/* Avatar at segment start */}
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full overflow-hidden ring-2 ring-white bg-neutral-100 z-10">
                                <img
                                  src={seg.image}
                                  alt={seg.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Name label — muted for alumni segments */}
                              <div
                                className={`absolute top-full left-0 mt-1 text-[11px] whitespace-nowrap pl-1 ${
                                  isOngoing ? 'font-medium text-neutral-700' : 'text-neutral-400'
                                }`}
                              >
                                {seg.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile scroll hint */}
          <p className="md:hidden mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            {t['timeline.scrollHint']}
          </p>
        </motion.div>

        {/* Currently aboard — bio detail list */}
        {activeSegments.length > 0 && (
          <motion.div
            variants={stagger(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="mt-16 md:mt-20 pt-10 border-t border-neutral-200"
          >
            <motion.h3
              variants={fadeUp}
              transition={springTransition}
              className="text-xs uppercase tracking-[0.3em] text-neutral-400 mb-8"
            >
              {t['timeline.currentlyAboard']}
            </motion.h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {activeSegments.map((seg) => (
                <motion.div
                  key={seg.id}
                  variants={fadeUp}
                  transition={springTransition}
                  className="group"
                >
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-neutral-100 ring-1 ring-neutral-200 mb-4">
                    <img
                      src={seg.image}
                      alt={seg.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-brand-dark font-semibold mb-1.5 text-center">
                    {roleLabel.get(seg.role) ?? seg.role}
                  </p>
                  <h4 className="text-lg font-bold text-neutral-900 leading-tight mb-2 text-center">
                    {seg.name}
                  </h4>
                  {seg.bio && <p className="text-sm text-neutral-600 leading-relaxed">{seg.bio}</p>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
