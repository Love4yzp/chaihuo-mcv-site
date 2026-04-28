import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, User } from 'lucide-react';

interface CrewAlumniProps {
  alumni: Array<{
    member: { id: string; name: string; name_en: string; image?: string };
    participation: {
      role: string;
      boardedAt: { date: string; location: string; location_en: string };
      disembarkedAt: { date: string; location: string; location_en: string };
    };
  }>;
  locale: 'zh' | 'en';
  t: Record<string, string>;
}

function formatDate(date: string): string {
  return date.replaceAll('-', '.');
}

function getDurationDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) return 0;

  return Math.floor(diff / 86_400_000) + 1;
}

export default function CrewAlumni({ alumni, locale, t }: CrewAlumniProps) {
  const [isOpen, setIsOpen] = useState(false);

  const title = useMemo(
    () => t['crew.alumni.count'].replace('{count}', String(alumni.length)),
    [alumni.length, t],
  );

  if (alumni.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 px-5 py-4 md:px-6 md:py-5 text-left hover:bg-neutral-50 transition-colors duration-200 cursor-pointer"
          aria-expanded={isOpen}
          aria-label={title}
        >
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-neutral-500 transition-transform duration-300 ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
            aria-hidden
          />
          <span className="text-lg font-semibold text-neutral-900">{title}</span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 md:px-6 md:pb-6 border-t border-neutral-200 bg-neutral-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
                  {alumni.map(({ member, participation }) => {
                    const displayName = locale === 'en' ? member.name_en : member.name;
                    const boardedLocation = locale === 'en'
                      ? participation.boardedAt.location_en
                      : participation.boardedAt.location;
                    const disembarkedLocation = locale === 'en'
                      ? participation.disembarkedAt.location_en
                      : participation.disembarkedAt.location;
                    const route = t['crew.duration.from_to']
                      .replace('{from}', `${formatDate(participation.boardedAt.date)} ${boardedLocation}`)
                      .replace('{to}', `${formatDate(participation.disembarkedAt.date)} ${disembarkedLocation}`);
                    const days = getDurationDays(
                      participation.boardedAt.date,
                      participation.disembarkedAt.date,
                    );

                    return (
                      <div
                        key={`${member.id}-${participation.boardedAt.date}-${participation.disembarkedAt.date}`}
                        className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                      >
                        <div
                          className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${
                            member.image
                              ? 'bg-neutral-100'
                              : 'bg-neutral-100 flex items-center justify-center'
                          }`}
                        >
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-neutral-400" aria-hidden />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div>
                            <p className="text-base font-semibold text-neutral-900">{displayName}</p>
                            <p className="text-sm text-neutral-500">{participation.role}</p>
                          </div>
                          <p className="text-sm text-neutral-600 leading-relaxed">{route}</p>
                          <p className="text-sm text-brand-dark font-medium">
                            {t['crew.duration.days'].replace('{days}', String(days))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
