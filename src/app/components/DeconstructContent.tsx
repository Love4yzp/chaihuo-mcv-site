import React from 'react';
import { motion } from 'motion/react';
import { fadeUp, stagger, springTransition, defaultViewport } from './motion';
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import { Cpu, Factory, BatteryCharging, ChevronRight } from 'lucide-react';

// ─── Types ───

interface NoteEntry {
  date: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
}

interface EquipmentCategory {
  icon: string;
  title: string;
  items: { name: string; spec: string }[];
}

interface Companion {
  name: string;
  image: string;
  bio?: string;
}

interface Props {
  notes: NoteEntry[];
  equipment: EquipmentCategory[];
  companion?: Companion | null;
  locale?: Locale;
  t: Record<string, string>;
}

// ─── Icon map ───

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Cpu,
  Factory,
  BatteryCharging,
};

const VehicleExplodedView = React.lazy(() =>
  import('./VehicleExplodedView').then((module) => ({ default: module.VehicleExplodedView })),
);

// ─── Component ───

export default function DeconstructContent({ notes, equipment, companion, locale = 'zh', t }: Props) {
  return (
    <div className="min-h-screen bg-surface">

      {/* ═══════ HERO — 车辆标题 + 爆炸图 ═══════ */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 标题区 */}
          <motion.div
            className="text-center mb-12"
            variants={stagger(0.2)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            <motion.p
              className="text-sm tracking-[0.3em] text-neutral-500 uppercase mb-3"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.subtitle']}
            </motion.p>
            <motion.h1
              className="text-5xl md:text-6xl font-bold text-neutral-900 mb-4"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.title']}
            </motion.h1>
            <motion.p
              className="text-lg text-neutral-500 max-w-xl mx-auto"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.body']}
            </motion.p>
          </motion.div>

          {/* 车辆速览 */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            {[
              { label: t['specs.range'], value: '430 km' },
              { label: t['specs.height'], value: '2.5 m' },
              { label: t['specs.v2l'], value: 'V2L 220V' },
              { label: t['specs.safety'], value: 'NCAP Platinum' },
            ].map((spec) => (
              <motion.div
                key={spec.label}
                variants={fadeUp}
                transition={springTransition}
                className="bg-white rounded-lg p-4 text-center shadow-sm"
              >
                <div className="text-xl font-bold text-neutral-900">{spec.value}</div>
                <div className="text-xs text-neutral-500 mt-1">{spec.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
          >
            <React.Suspense
              fallback={
                <div
                  className="h-[520px] md:h-[620px] rounded-2xl border border-neutral-300/40 bg-neutral-100"
                  aria-busy="true"
                  aria-label={t['3d.loading'] || 'Loading vehicle view'}
                />
              }
            >
              <VehicleExplodedView t={t} />
            </React.Suspense>
          </motion.div>

        </div>
      </section>

      {/* ═══════ 改装手记 ═══════ */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="flex items-end justify-between mb-8"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">{t['notes.title']}</h2>
              <p className="text-neutral-500 mt-2">{t['notes.subtitle']}</p>
            </div>
            <a
              href="https://www.yuque.com/chaihuo-mcv/home"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-200 items-center gap-1 cursor-pointer"
            >
              {t['notes.viewAll']}
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            {notes.map((note) => (
              <motion.div
                key={note.title}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
                variants={fadeUp}
                transition={springTransition}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={note.image}
                    alt={note.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-1">{note.title}</h3>
                  <time className="text-xs text-neutral-400 font-mono">{note.date}</time>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 移动端 CTA */}
          <motion.div
            className="mt-6 text-center md:hidden"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
          >
            <a
              href="https://www.yuque.com/chaihuo-mcv/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-200 cursor-pointer"
            >
              {t['notes.viewAllMobile']}
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ═══════ 装备清单 ═══════ */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">{t['equipment.title']}</h2>
            <p className="text-neutral-500 mt-2">{t['equipment.subtitle']}</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            {equipment.map((category) => {
              const IconComponent = ICON_MAP[category.icon] ?? Cpu;
              return (
                <motion.div
                  key={category.title}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                  variants={fadeUp}
                  transition={springTransition}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold text-neutral-900">{category.title}</h3>
                  </div>

                  <div className="divide-y divide-neutral-300">
                    {category.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between items-baseline py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm text-neutral-700">{item.name}</span>
                        <span className="text-xs text-neutral-500 font-mono text-right ml-4 shrink-0">
                          {item.spec}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* AI 伙伴 — 车上的具身智能节点 */}
      {companion && (
        <section className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mb-10"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              transition={springTransition}
            >
              <p className="text-sm tracking-[0.3em] text-neutral-400 uppercase mb-3">
                {t['companion.eyebrow']}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
                {t['companion.title']}
              </h2>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              transition={springTransition}
              className="flex flex-col md:flex-row items-center gap-6 rounded-xl border border-neutral-200 bg-white p-6"
            >
              <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 overflow-hidden rounded-xl bg-neutral-900">
                <img
                  src={companion.image}
                  alt={companion.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-3">{companion.name}</h3>
                {companion.bio && (
                  <p className="text-sm text-neutral-600 leading-relaxed">{companion.bio}</p>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* 底部 CTA */}
      <section className="py-16 px-6 bg-white border-t border-neutral-200">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-neutral-900 mb-3">{t['cta.title']}</h3>
          <p className="text-neutral-500 mb-6">{t['cta.body']}</p>
          <a
            href={localePath('/guide', locale)}
            className="inline-flex items-center gap-2 bg-brand text-brand-foreground px-8 py-3 rounded-full hover:bg-brand-hover transition-colors duration-200 cursor-pointer font-medium"
          >
            {t['cta.button']}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
      </section>
    </div>
  );
}
