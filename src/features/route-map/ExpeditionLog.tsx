import { Flame, Globe, Zap } from 'lucide-react';
import type { Locale } from '@/i18n/index';

export interface Expedition {
  world: string;
  world_en?: string;
  fire: string;
  fire_en?: string;
  frontier: string;
  frontier_en?: string;
}

export default function ExpeditionLog({
  expedition,
  locale,
}: {
  expedition?: Expedition;
  locale: Locale;
}) {
  if (!expedition) return null;

  return (
    <div data-expedition-log="true" className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-r-lg border-l-2 border-brand bg-brand/10 px-3 py-2">
        <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
        <p className="text-[15px] font-bold leading-snug text-neutral-900">{expedition.frontier}</p>
      </div>

      <div className="flex items-start gap-2">
        <Globe className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {locale === 'zh' ? '新世界' : 'NEW WORLD'}
          </h5>
          <p className="text-[12.5px] leading-snug text-neutral-700">{expedition.world}</p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Flame className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {locale === 'zh' ? '火种' : 'THE FIRE'}
          </h5>
          <p className="text-[12.5px] leading-snug text-neutral-700">{expedition.fire}</p>
        </div>
      </div>
    </div>
  );
}
