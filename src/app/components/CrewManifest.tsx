import { useMemo } from 'react';
import { motion } from 'motion/react';
import { fadeUp, stagger, springTransition, defaultViewport } from './motion';
import { ArrowUp, ArrowDown, User } from 'lucide-react';

interface Role {
  name: string;
}

interface CrewMember {
  id: string;
  name: string;
  image?: string;
}

interface BoardingPoint {
  date: string;
  location: string;
  location_en?: string;
}

interface Boarding {
  id: string;
  crewId: string;
  role: string;
  boardedAt: BoardingPoint;
  disembarkedAt: BoardingPoint | null;
}

interface Props {
  roles: Role[];
  crew: CrewMember[];
  boardings: Boarding[];
  t: Record<string, string>;
}

interface EventItem {
  kind: 'up' | 'down';
  crewId: string;
  role: string;
}

interface EventNode {
  date: string;
  where: string;
  items: EventItem[];
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}.${m}.${d}`;
}

function buildEvents(boardings: Boarding[], roles: Role[]): EventNode[] {
  const flat: { date: string; where: string; kind: 'up' | 'down'; crewId: string; role: string }[] = [];
  for (const b of boardings) {
    flat.push({
      date: b.boardedAt.date,
      where: b.boardedAt.location,
      kind: 'up',
      crewId: b.crewId,
      role: b.role,
    });
    if (b.disembarkedAt) {
      flat.push({
        date: b.disembarkedAt.date,
        where: b.disembarkedAt.location,
        kind: 'down',
        crewId: b.crewId,
        role: b.role,
      });
    }
  }

  const map = new Map<string, EventNode>();
  for (const e of flat) {
    const key = `${e.date}|${e.where}`;
    if (!map.has(key)) {
      map.set(key, { date: e.date, where: e.where, items: [] });
    }
    map.get(key)!.items.push({ kind: e.kind, crewId: e.crewId, role: e.role });
  }

  const roleIdx = new Map(roles.map((r, i) => [r.name, i] as const));
  for (const node of map.values()) {
    node.items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'down' ? -1 : 1;
      return (roleIdx.get(a.role) ?? 999) - (roleIdx.get(b.role) ?? 999);
    });
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildCurrentCrew(boardings: Boarding[], roles: Role[]): Boarding[] {
  const active = boardings.filter((b) => !b.disembarkedAt);
  const roleIdx = new Map(roles.map((r, i) => [r.name, i] as const));
  return [...active].sort(
    (a, b) => (roleIdx.get(a.role) ?? 999) - (roleIdx.get(b.role) ?? 999),
  );
}

export default function CrewManifest({ roles, crew, boardings, t }: Props) {
  const events = useMemo(() => buildEvents(boardings, roles), [boardings, roles]);
  const currentCrew = useMemo(() => buildCurrentCrew(boardings, roles), [boardings, roles]);
  const crewMap = useMemo(
    () => new Map(crew.map((c) => [c.id, c] as const)),
    [crew],
  );

  return (
    <section className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* 标题区 */}
        <motion.div
          variants={stagger(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="mb-12 md:mb-16"
        >
          <motion.p
            variants={fadeUp}
            transition={springTransition}
            className="text-xs tracking-[0.4em] uppercase text-neutral-500 mb-4 font-mono"
          >
            {t['manifest.eyebrow']}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={springTransition}
            className="text-4xl md:text-5xl font-bold text-neutral-900"
          >
            {t['manifest.title']}
          </motion.h2>
        </motion.div>

        {/* 时间轴 */}
        <motion.ol
          variants={stagger(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="relative pl-6 border-l border-neutral-300 space-y-12"
        >
          {events.map((node) => (
            <motion.li
              key={`${node.date}-${node.where}`}
              variants={fadeUp}
              transition={springTransition}
              className="relative"
            >
              <span
                className="absolute -left-[29px] top-2 w-2 h-2 rounded-full bg-neutral-900"
                aria-hidden
              />
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <time className="text-sm font-mono text-neutral-700">
                  {fmtDate(node.date)}
                </time>
                <span className="text-neutral-300" aria-hidden>·</span>
                <span className="text-base font-semibold text-neutral-900">
                  {node.where}
                </span>
              </div>
              <ul className="space-y-1.5">
                {node.items.map((item, i) => {
                  const c = crewMap.get(item.crewId);
                  const Icon = item.kind === 'up' ? ArrowUp : ArrowDown;
                  const colorCls =
                    item.kind === 'up' ? 'text-brand-dark' : 'text-neutral-500';
                  return (
                    <li
                      key={`${node.date}-${node.where}-${item.kind}-${item.crewId}-${item.role}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${colorCls}`} aria-hidden />
                      <span className="font-medium text-neutral-900">
                        {c?.name ?? item.crewId}
                      </span>
                      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500">
                        {item.role}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.li>
          ))}
        </motion.ol>

        <hr className="my-16 border-neutral-200" />

        {/* 当前在途 */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
        >
          <motion.h3
            variants={fadeUp}
            transition={springTransition}
            className="text-xs tracking-[0.4em] uppercase text-neutral-500 mb-8 font-mono"
          >
            {t['manifest.current']}
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {currentCrew.map((b) => {
              const c = crewMap.get(b.crewId);
              return (
                <motion.div
                  key={b.crewId}
                  variants={fadeUp}
                  transition={springTransition}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className={`relative w-16 h-16 rounded-full overflow-hidden mb-3 ${
                      c?.image
                        ? 'ring-2 ring-brand'
                        : 'bg-neutral-100 ring-2 ring-neutral-200 flex items-center justify-center'
                    }`}
                  >
                    {c?.image ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-neutral-400" aria-hidden />
                    )}
                  </motion.div>
                  <div className="text-base font-semibold text-neutral-900">
                    {c?.name ?? b.crewId}
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 mt-1">
                    {b.role}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
