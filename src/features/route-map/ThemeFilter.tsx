import { GraduationCap, Wrench, Factory, type LucideIcon } from 'lucide-react';
import type { ThemeType } from './theme';
import { THEME_ORDER } from './theme';

const THEME_ICON: Record<ThemeType, LucideIcon> = {
  science: GraduationCap,
  maker: Wrench,
  industry: Factory,
};

interface Props {
  counts: Record<ThemeType, number>;
  active: ThemeType | null;
  onSelect: (theme: ThemeType | null) => void;
  t: Record<string, string>;
}

const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors duration-200';
const ACTIVE_CLS = 'bg-brand text-brand-foreground border-brand';
const IDLE_CLS = 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900';

export default function ThemeFilter({ counts, active, onSelect, t }: Props) {
  return (
    <div
      role="group"
      aria-label={t['theme.ariaGroup'] ?? '按主题筛选地图'}
      data-theme-filter="true"
      className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
    >
      <button
        type="button"
        data-theme-chip="all"
        aria-pressed={active === null}
        onClick={() => onSelect(null)}
        className={`${CHIP_BASE} ${active === null ? ACTIVE_CLS : IDLE_CLS}`}
      >
        {t['theme.all'] ?? '全部'}
      </button>
      {THEME_ORDER.map((key) => {
        const Icon = THEME_ICON[key];
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            data-theme-chip={key}
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? null : key)}
            className={`${CHIP_BASE} ${isActive ? ACTIVE_CLS : IDLE_CLS}`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t[`theme.${key}`] ?? key}</span>
            <span className={isActive ? 'text-brand-foreground/80' : 'text-neutral-400'}>
              {counts[key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
