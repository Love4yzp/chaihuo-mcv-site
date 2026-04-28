import { useMemo } from 'react';
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
  const memberMap = useMemo(() => new Map(team.map((member) => [member.id, member] as const)), [team]);

  const activeSections = useMemo(() => {
    const activeBoardings = boardings.filter((boarding) => !boarding.disembarkedAt);
    const grouped = groupByRole(activeBoardings);

    return [...grouped.entries()]
      .sort(sortRoles)
      .map(([role, items]) => ({
        role,
        items: sortBoardingsByDate(items)
          .map((participation) => {
            const member = memberMap.get(participation.crewId);

            if (!member) return null;

            return { member, participation };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
      }))
      .filter(({ items }) => items.length > 0);
  }, [boardings, memberMap]);

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

  const emptyCopy = locale === 'en'
    ? 'No crew members are currently on board.'
    : '当前暂无人在途。';

  return (
    <section className="bg-white px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
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
            className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-neutral-500"
          >
            {t['crew.eyebrow']}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={springTransition}
            className="text-4xl font-bold text-neutral-900 md:text-5xl"
          >
            {t['crew.title']}
          </motion.h2>
        </motion.div>

        <div className="space-y-10 md:space-y-12">
          {activeSections.length > 0 ? (
            activeSections.map(({ role, items }) => (
              <motion.section
                key={role}
                variants={stagger(0.12)}
                initial="hidden"
                whileInView="visible"
                viewport={defaultViewport}
              >
                <motion.h3
                  variants={fadeUp}
                  transition={springTransition}
                  className="mb-4 text-xl font-semibold text-neutral-900"
                >
                  {role}
                </motion.h3>

                <motion.div
                  variants={stagger(0.12)}
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                  {items.map(({ member, participation }) => {
                    return (
                      <motion.div key={participation.id} variants={fadeUp} transition={springTransition}>
                        <CrewMemberCard
                          member={member}
                          participation={participation}
                          locale={locale}
                          variant="active"
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.section>
            ))
          ) : (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              transition={springTransition}
              className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 text-sm text-neutral-500"
            >
              {emptyCopy}
            </motion.div>
          )}

          <CrewAlumni alumni={alumni} locale={locale} t={t} />
        </div>
      </div>
    </section>
  );
}
