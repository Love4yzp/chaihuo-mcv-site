import { motion } from 'motion/react';
import { MapPin, CalendarDays, Route } from 'lucide-react';
import { springTransition } from './motion';
import { cn } from './ui/utils';

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

function getInitial(member: CrewMemberCardProps['member'], locale: 'zh' | 'en'): string {
  const displayName = getDisplayName(member, locale).trim();

  if (!displayName) return '?';

  return locale === 'en'
    ? displayName.charAt(0).toUpperCase()
    : displayName.charAt(0);
}

export type { CrewMemberCardProps };

export default function CrewMemberCard({
  member,
  participation,
  locale,
  variant,
}: CrewMemberCardProps) {
  const displayName = getDisplayName(member, locale);
  const boardedLabel = formatDate(participation.boardedAt.date, locale);
  const boardedLocation = getLocation(participation.boardedAt, locale);
  const disembarked = participation.disembarkedAt;
  const disembarkedLabel = disembarked ? formatDate(disembarked.date, locale) : null;
  const disembarkedLocation = disembarked ? getLocation(disembarked, locale) : null;
  const daysTogether = calcDays(participation.boardedAt.date, disembarked?.date ?? null);
  const isActive = variant === 'active';

  return (
    <motion.article
      whileHover={isActive ? { scale: 1.02, y: -2 } : { y: -2 }}
      transition={springTransition}
      className={cn(
        'w-full rounded-2xl p-5 md:p-6 transition-shadow duration-200',
        isActive
          ? 'border-2 border-brand bg-surface-card shadow-sm hover:shadow-md'
          : 'border border-neutral-200 bg-neutral-50 shadow-sm hover:shadow-sm',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold',
            member.image ? 'bg-neutral-100' : 'bg-neutral-200 text-neutral-700',
          )}
        >
          {member.image ? (
            <img
              src={member.image}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span aria-hidden>{getInitial(member, locale)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    'text-lg font-semibold',
                    isActive ? 'text-neutral-900' : 'text-neutral-700',
                  )}
                >
                  {displayName}
                </h3>
                <span
                  className={cn(
                    'inline-flex h-2.5 w-2.5 rounded-full',
                    isActive ? 'bg-green-500' : 'bg-neutral-300',
                  )}
                  aria-hidden
                />
              </div>
              <p
                className={cn(
                  'text-sm font-medium tracking-[0.16em] uppercase',
                  isActive ? 'text-brand-dark' : 'text-neutral-500',
                )}
              >
                {participation.role}
              </p>
            </div>

            {isActive ? (
              <span className="inline-flex items-center rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
                {locale === 'en' ? 'Present' : '至今'}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-500">
                {locale === 'en' ? `${daysTogether} days` : `同行 ${daysTogether} 天`}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className={cn('flex items-start gap-2 text-sm', isActive ? 'text-neutral-700' : 'text-neutral-500')}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{boardedLocation}</p>
                <p>{boardedLabel}</p>
              </div>
            </div>

            {isActive ? (
              <div className="flex items-start gap-2 text-sm text-neutral-500">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>{locale === 'en' ? `On board for ${daysTogether} days` : `已在途 ${daysTogether} 天`}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 text-sm text-neutral-500">
                  <Route className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p>{boardedLocation}</p>
                    <p>
                      {locale === 'en' ? 'to' : '→'} {disembarkedLocation}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-neutral-500">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    {boardedLabel} → {disembarkedLabel}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
