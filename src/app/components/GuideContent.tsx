import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fadeUp, stagger, springTransition, defaultViewport } from './motion';
import { ChevronDown, Mail, Truck, Sprout, Zap } from 'lucide-react';
import qrCoCreationImport from '@/assets/qr-co-creation.png';
import qrEmpowermentImport from '@/assets/qr-empowerment.png';
import type { Locale } from '@/i18n/index';

const qrCoCreation = typeof qrCoCreationImport === 'object' && qrCoCreationImport !== null && 'src' in qrCoCreationImport
  ? (qrCoCreationImport as { src: string }).src : qrCoCreationImport as string;
const qrEmpowerment = typeof qrEmpowermentImport === 'object' && qrEmpowermentImport !== null && 'src' in qrEmpowermentImport
  ? (qrEmpowermentImport as { src: string }).src : qrEmpowermentImport as string;

interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio?: string;
  isRobot?: boolean;
}

interface FaqGroup {
  label: string;
  items: { question: string; answer: string }[];
}

interface GuideContentProps {
  teamMembers: TeamMember[];
  faqGroups: FaqGroup[];
  locale?: Locale;
  t: Record<string, string>;
}

export default function GuideContent({ teamMembers, faqGroups, locale = 'zh', t }: GuideContentProps) {
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());

  return (
    <div className="min-h-screen bg-white">

      {/* 标题区 */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger(0.2)}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              className="text-sm tracking-[0.3em] text-neutral-400 uppercase mb-3"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.subtitle']}
            </motion.p>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.title']}
            </motion.h1>
            <motion.p
              className="text-base text-neutral-500"
              variants={fadeUp}
              transition={springTransition}
            >
              {t['hero.body']}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Participation Methods */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t['methods.title']}</h2>
            <p className="text-neutral-500">{t['methods.subtitle']}</p>
          </motion.div>

          {/* 三卡并排 */}
          <motion.div
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            {/* 上车同行 */}
            <motion.div
              variants={fadeUp}
              transition={springTransition}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-1.5 bg-brand" />
              <div className="p-8">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mb-5">
                  <Truck className="w-6 h-6 text-brand-dark" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t['ride.title']}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-5">
                  {t['ride.body']}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['ride.role1']}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['ride.role2']}</span>
                  </div>
                </div>

                <a
                  href="mailto:business@chaihuo.org?subject=柴火基地车同行申请"
                  className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-lg bg-brand text-brand-foreground font-medium hover:bg-brand-hover transition-colors cursor-pointer text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {t['ride.apply']}
                </a>
              </div>
            </motion.div>

            {/* 在地共创 */}
            <motion.div
              variants={fadeUp}
              transition={springTransition}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-1.5 bg-brand" />
              <div className="p-8">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mb-5">
                  <Sprout className="w-6 h-6 text-brand-dark" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t['cocreate.title']}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-5">
                  {t['cocreate.body']}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['cocreate.role1']}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['cocreate.role2']}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <img src={qrCoCreation} alt={t['cocreate.qrLabel']} className="w-28 h-28 rounded-lg" />
                  <span className="text-xs text-neutral-500">{t['cocreate.qrLabel']}</span>
                </div>
              </div>
            </motion.div>

            {/* 在地赋能 */}
            <motion.div
              variants={fadeUp}
              transition={springTransition}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-1.5 bg-brand" />
              <div className="p-8">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-brand-dark" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t['empower.title']}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-5">
                  {t['empower.body']}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['empower.role1']}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="text-neutral-700">{t['empower.role2']}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <img src={qrEmpowerment} alt={t['empower.qrLabel']} className="w-28 h-28 rounded-lg" />
                  <span className="text-xs text-neutral-500">{t['empower.qrLabel']}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* 统一说明 */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
            className="bg-white rounded-xl p-6 md:p-8 text-center text-sm text-neutral-500 leading-relaxed"
          >
            <p>
              <strong className="text-neutral-900">{t['apply.ride']}</strong>{t['apply.rideDetail']}
              <a href="mailto:business@chaihuo.org" className="text-brand hover:text-brand-hover transition mx-1">business@chaihuo.org</a>
              {t['apply.rideSubject']}
            </p>
            <p className="mt-2">
              <strong className="text-neutral-900">{t['apply.local']}</strong>{t['apply.localDetail']}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Members */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t['team.title']}</h2>
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {teamMembers.map((member, index) => (
              <motion.div key={index} variants={fadeUp} transition={springTransition} className="group">
                <div className={`relative overflow-hidden rounded-lg aspect-[3/4] mb-4 ${member.isRobot ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
                  <img
                    src={member.image}
                    alt={member.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${member.isRobot ? 'object-contain p-8' : ''}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                    <p className="text-brand text-sm">{member.role}</p>
                  </div>
                </div>
                {member.bio && (
                  <p className="text-sm text-neutral-500 leading-relaxed">{member.bio}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section — 分组展示 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            transition={springTransition}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t['faq.title']}</h2>
            <p className="text-neutral-500">{t['faq.subtitle']}</p>
          </motion.div>

          <motion.div
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="space-y-10"
          >
            {faqGroups.map((group) => (
              <motion.div key={group.label} variants={fadeUp} transition={springTransition}>
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 pl-1">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((faq) => {
                    const key = `${group.label}-${faq.question}`;
                    const isOpen = openFAQs.has(key);
                    return (
                      <div key={key} className="border border-neutral-300 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setOpenFAQs(prev => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })}
                          className="w-full px-5 py-4 text-left flex items-center justify-between bg-white hover:bg-neutral-50 transition cursor-pointer"
                        >
                          <span className="font-semibold pr-4">{faq.question}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-neutral-500 transition-transform duration-300 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
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
                              <div className="px-5 pb-5 pt-3 bg-neutral-50 border-t border-neutral-300">
                                <p className="text-sm text-neutral-700 leading-relaxed">{faq.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
