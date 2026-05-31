import type { ReactNode } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import type { Locale } from '@/i18n/index';

interface ElementsContentProps {
  locale?: Locale;
  t: Record<string, string>;
}

const SWATCHES: { name: string; className: string; text: string }[] = [
  { name: 'brand', className: 'bg-brand', text: 'text-brand-foreground' },
  { name: 'brand-dark', className: 'bg-brand-dark', text: 'text-neutral-900' },
  { name: 'brand-hover', className: 'bg-brand-hover', text: 'text-brand-foreground' },
  { name: 'brand-light', className: 'bg-brand-light', text: 'text-neutral-900' },
  { name: 'surface', className: 'bg-surface', text: 'text-neutral-900' },
  { name: 'surface-card', className: 'bg-surface-card', text: 'text-neutral-900' },
  { name: 'surface-dark', className: 'bg-surface-dark', text: 'text-white' },
  { name: 'neutral-900', className: 'bg-neutral-900', text: 'text-white' },
  { name: 'neutral-700', className: 'bg-neutral-700', text: 'text-white' },
  { name: 'neutral-500', className: 'bg-neutral-500', text: 'text-white' },
  { name: 'neutral-300', className: 'bg-neutral-300', text: 'text-neutral-900' },
  { name: 'neutral-100', className: 'bg-neutral-100', text: 'text-neutral-900' },
];

const TYPE_SCALE: { tag: string; sample: string; cls: string }[] = [
  {
    tag: 'h1 / text-3xl 700',
    sample: '普罗米修斯号 · Prometheus',
    cls: 'text-3xl font-bold text-neutral-900',
  },
  {
    tag: 'h2 / text-2xl 700',
    sample: '普罗米修斯号 · Prometheus',
    cls: 'text-2xl font-bold text-neutral-900',
  },
  {
    tag: 'h3 / text-xl 600',
    sample: '普罗米修斯号 · Prometheus',
    cls: 'text-xl font-semibold text-neutral-900',
  },
  {
    tag: 'body / text-base',
    sample: '正文示例 Body sample 0123456789',
    cls: 'text-base text-neutral-900',
  },
  { tag: 'small / text-sm', sample: '辅助文字 Caption sample', cls: 'text-sm text-neutral-500' },
];

const RADII: { name: string; cls: string }[] = [
  { name: 'rounded-sm', cls: 'rounded-sm' },
  { name: 'rounded-md', cls: 'rounded-md' },
  { name: 'rounded-lg', cls: 'rounded-lg' },
  { name: 'rounded-xl', cls: 'rounded-xl' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold mb-6 text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

export default function ElementsContent({ t }: ElementsContentProps) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-neutral-900">{t['heading']}</h1>
        <p className="mt-3 mb-12 text-neutral-700">{t['intro']}</p>

        <Section title={t['colors']}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SWATCHES.map((s) => (
              <div
                key={s.name}
                className={`${s.className} ${s.text} rounded-lg border border-neutral-300 p-4 h-24 flex flex-col justify-end`}
              >
                <span className="text-sm font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['typography']}>
          <div className="space-y-4">
            {TYPE_SCALE.map((row) => (
              <div key={row.tag} className="flex flex-col gap-1 border-b border-neutral-300 pb-4">
                <span className="text-sm text-neutral-500">{row.tag}</span>
                <span className={row.cls}>{row.sample}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['radius']}>
          <div className="flex flex-wrap gap-6">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div className={`${r.cls} bg-surface-card border border-neutral-300 w-20 h-20`} />
                <span className="text-sm text-neutral-500">{r.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['components']}>
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="secondary">Secondary</Button>
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Section>

        <Section title={t['motion']}>
          <p className="text-neutral-700 max-w-2xl">{t['motionNote']}</p>
        </Section>
      </div>
    </div>
  );
}
