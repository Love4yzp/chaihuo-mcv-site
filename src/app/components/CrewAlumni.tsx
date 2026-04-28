import { useMemo } from 'react';
import { motion } from 'motion/react';
import { MapPin, Route, CalendarDays } from 'lucide-react';
import { fadeUp, stagger, springTransition, defaultViewport } from './motion';

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
  const title = useMemo(
    () => t['crew.alumni.count'].replace('{count}', String(alumni.length)),
    [alumni.length, t],
  );

  if (alumni.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <motion.div
        variants={stagger(0.15)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="mb-10 md:mb-12"
      >
        <motion.p
          variants={fadeUp}
          transition={springTransition}
          className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-neutral-500"
        >
          {t['crew.alumni']}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          transition={springTransition}
          className="text-3xl font-bold text-neutral-900 md:text-4xl"
        >
          {title}
        </motion.h2>
      </motion.div>

      {/* Journey Cards */}
      <motion.div
        variants={stagger(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {alumni.map(({ member, participation }) => {
          const displayName = locale === 'en' ? member.name_en : member.name;
          const boardedLocation = locale === 'en'
            ? participation.boardedAt.location_en
            : participation.boardedAt.location;
          const disembarkedLocation = locale === 'en'
            ? participation.disembarkedAt.location_en
            : participation.disembarkedAt.location;
          const days = getDurationDays(
            participation.boardedAt.date,
            participation.disembarkedAt.date,
          );

          return (
            <motion.div
              key={`${member.id}-${participation.boardedAt.date}`}
              variants={fadeUp}
              transition={springTransition}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white hover:shadow-lg transition-all duration-300"
            >
              {/* Top: Photo + Basic Info */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={displayName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                    <span className="text-3xl font-bold text-neutral-600">
                      {displayName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white">{displayName}</h3>
                  <p className="text-sm text-brand font-medium">{participation.role}</p>
                </div>
              </div>

              {/* Bottom: Journey Details */}
              <div className="p-5 space-y-3">
                {/* Route */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <Route className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {locale === 'en' ? 'Route' : '路线'}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {boardedLocation} → {disembarkedLocation}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {locale === 'en' ? 'Time' : '时间'}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(participation.boardedAt.date)} → {formatDate(participation.disembarkedAt.date)}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {locale === 'en' ? 'Duration' : '同行'}
                    </p>
                    <p className="text-sm text-brand font-medium">
                      {t['crew.duration.days'].replace('{days}', String(days))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
