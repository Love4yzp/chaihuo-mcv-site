import { motion } from 'motion/react';
import { MapPin, CalendarDays, Route } from 'lucide-react';
import { springTransition } from './motion';

interface CrewMemberCardProps {
  member: {
    id: string;
    name: string;
    name_en: string;
    image?: string;
  };
  participation: {
    role: string;
    boardedAt: { date: string; location: string; location_en: string };
    disembarkedAt?: { date: string; location: string; location_en: string } | null;
  };
  locale: 'zh' | 'en';
  variant: 'active' | 'alumni';
}

function formatDate(date: string, locale: 'zh' | 'en'): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

function calcDays(boarded: string, disembarked?: string | null): number {
  const start = new Date(boarded);
  const end = disembarked ? new Date(disembarked) : new Date();
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getDisplayName(member: CrewMemberCardProps['member'], locale: 'zh' | 'en'): string {
  return locale === 'en' ? member.name_en || member.name : member.name;
}

function getLocation(
  point: CrewMemberCardProps['participation']['boardedAt'],
  locale: 'zh' | 'en',
): string {
  return locale === 'en' ? point.location_en : point.location;
}

export type { CrewMemberCardProps };

export default function CrewMemberCard({
  member,
  participation,
  locale,
  variant,
}: CrewMemberCardProps) {
  const displayName = getDisplayName(member, locale);
  const boardedLocation = getLocation(participation.boardedAt, locale);
  const disembarked = participation.disembarkedAt;
  const disembarkedLocation = disembarked ? getLocation(disembarked, locale) : null;
  const daysTogether = calcDays(participation.boardedAt.date, disembarked?.date ?? null);
  const isActive = variant === 'active';

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={springTransition}
      className="group relative overflow-hidden rounded-2xl bg-neutral-900 aspect-[3/4] cursor-pointer"
    >
      {/* Photo */}
      {member.image ? (
        <img
          src={member.image}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <span className="text-4xl font-bold text-neutral-600">
            {displayName.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Status tag */}
      <div className="absolute top-4 right-4">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
            isActive
              ? 'bg-green-500/90 text-white'
              : 'bg-white/90 text-neutral-700'
          }`}
        >
          {isActive
            ? locale === 'en' ? 'On the Road' : '在路上'
            : `${daysTogether} ${locale === 'en' ? 'days' : '天'}`}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-xl font-bold text-white mb-1">{displayName}</h3>
        <p className="text-sm text-brand font-medium tracking-wide uppercase mb-3">
          {participation.role}
        </p>

        {/* Hover reveal details */}
        <div className="overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 pt-2 border-t border-white/20"
          >
            <div className="flex items-center gap-2 text-sm text-white/80">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{boardedLocation}</span>
            </div>
            {disembarkedLocation && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Route className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {boardedLocation} → {disembarkedLocation}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-white/80">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>
                {formatDate(participation.boardedAt.date, locale)}
                {disembarked
                  ? ` → ${formatDate(disembarked.date, locale)}`
                  : locale === 'en'
                    ? ' → Present'
                    : ' → 至今'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}
