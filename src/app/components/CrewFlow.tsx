import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { fadeUp, stagger, springTransition, defaultViewport } from './motion';
import CrewMemberCard from './CrewMemberCard';
import CrewAlumni from './CrewAlumni';

interface CrewMember {
  id: string;
  name: string;
  name_en: string;
  image?: string;
  isRobot?: boolean;
}

interface BoardingPoint {
  date: string;
  location: string;
  location_en: string;
}

interface Boarding {
  id: string;
  crewId: string;
  role: string;
  boardedAt: BoardingPoint;
  disembarkedAt?: BoardingPoint | null;
}

interface CrewFlowProps {
  team: CrewMember[];
  boardings: Boarding[];
  locale: 'zh' | 'en';
  t: Record<string, string>;
}

const roleOrder = ['领队', '技术担当', '媒体担当'];
const roleIndexMap = new Map(roleOrder.map((role, index) => [role, index] as const));

function groupByRole(items: Boarding[]): Map<string, Boarding[]> {
  const groups = new Map<string, Boarding[]>();
  for (const item of items) {
    if (!groups.has(item.role)) groups.set(item.role, []);
    groups.get(item.role)?.push(item);
  }
  return groups;
}

function sortRoles([roleA]: [string, Boarding[]], [roleB]: [string, Boarding[]]) {
  const indexA = roleIndexMap.get(roleA) ?? Number.MAX_SAFE_INTEGER;
  const indexB = roleIndexMap.get(roleB) ?? Number.MAX_SAFE_INTEGER;
  if (indexA !== indexB) return indexA - indexB;
  return roleA.localeCompare(roleB, 'zh-Hans-CN');
}

function sortBoardingsByDate(items: Boarding[]): Boarding[] {
  return [...items].sort((a, b) => a.boardedAt.date.localeCompare(b.boardedAt.date));
}

export type { CrewFlowProps };

export default function CrewFlow({ team, boardings, locale, t }: CrewFlowProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const memberMap = useMemo(() => new Map(team.map((member) => [member.id, member] as const)), [team]);

  // Active boardings with member data
  const activeItems = useMemo(() => {
    const activeBoardings = boardings.filter((boarding) => !boarding.disembarkedAt);
    return sortBoardingsByDate(activeBoardings)
      .map((participation) => {
        const member = memberMap.get(participation.crewId);
        if (!member) return null;
        return { member, participation };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [boardings, memberMap]);

  // Group active by role for tabs
  const activeByRole = useMemo(() => {
    const grouped = groupByRole(boardings.filter((b) => !b.disembarkedAt));
    const sorted = [...grouped.entries()].sort(sortRoles);
    return sorted.map(([role, items]) => ({
      role,
      items: sortBoardingsByDate(items)
        .map((participation) => {
          const member = memberMap.get(participation.crewId);
          if (!member) return null;
          return { member, participation };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    })).filter(({ items }) => items.length > 0);
  }, [boardings, memberMap]);

  // Filtered items based on tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return activeItems;
    const group = activeByRole.find((g) => g.role === activeTab);
    return group?.items ?? [];
  }, [activeTab, activeItems, activeByRole]);

  // Alumni
  const alumni = useMemo(
    () => boardings
      .filter((boarding): boarding is Boarding & { disembarkedAt: BoardingPoint } => Boolean(boarding.disembarkedAt))
      .map((boarding) => {
        const member = memberMap.get(boarding.crewId);
        if (!member) return null;
        return {
          member,
          participation: {
            role: boarding.role,
            boardedAt: boarding.boardedAt,
            disembarkedAt: boarding.disembarkedAt,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    [boardings, memberMap],
  );

  const tabs = [
    { key: 'all', label: t['crew.all'] || (locale === 'en' ? 'All' : '全部') },
    ...activeByRole.map(({ role }) => ({ key: role, label: role })),
  ];

  return (
    <section className="bg-white px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={stagger(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="mb-12 md:mb-16 text-center"
        >
          <motion.p
            variants={fadeUp}
            transition={springTransition}
            className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-neutral-500"
          >
            {t['crew.eyebrow']}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={springTransition}
            className="text-4xl font-bold text-neutral-900 md:text-5xl mb-4"
          >
            {t['crew.title']}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={springTransition}
            className="text-lg text-neutral-500 max-w-xl mx-auto"
          >
            {t['crew.subtitle']}
          </motion.p>
        </motion.div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Photo Grid */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {filteredItems.map(({ member, participation }) => (
            <motion.div key={participation.id} variants={fadeUp} transition={springTransition}>
              <CrewMemberCard
                member={member}
                participation={participation}
                locale={locale}
                variant="active"
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
            className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 text-sm text-neutral-500 text-center"
          >
            {locale === 'en'
              ? 'No crew members in this category.'
              : '该分类暂无同行者。'}
          </motion.div>
        )}

        {/* Alumni */}
        {alumni.length > 0 && (
          <div className="mt-20 md:mt-28">
            <CrewAlumni alumni={alumni} locale={locale} t={t} />
          </div>
        )}
      </div>
    </section>
  );
}
