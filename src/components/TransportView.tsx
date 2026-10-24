'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeftRight, Bus, MapPin, Info, Sparkles, Navigation } from 'lucide-react';
import { ALL_STOPS, HOME_STOP, planRoute, TRANSPORT_NOTE } from '@/lib/constants';

interface TransportViewProps {
  onBack: () => void;
}

export const TransportView: React.FC<TransportViewProps> = ({ onBack }) => {
  const [fromStop, setFromStop] = useState(HOME_STOP);
  const [toStop, setToStop] = useState('كلية الطب والعلاج الطبيعي');
  const [swapRotate, setSwapRotate] = useState(0);

  const shortcuts = [
    'كلية الطب والعلاج الطبيعي',
    'كلية التكنولوجيا والحقوق',
    'كلية التربية النوعية',
    'كلية الصيدلة',
  ];

  const handleSwap = () => {
    setSwapRotate((prev) => prev + 180);
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  };

  const routePlan = planRoute(fromStop, toStop);

  return (
    <motion.div
      className="space-y-5 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <motion.button
        onClick={onBack}
        type="button"
        className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-teal2-600 transition group"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        <span>رجوع للرئيسية</span>
      </motion.button>

      {/* Header Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-ocean-100 dark:bg-ocean-950/60 text-ocean-700 dark:text-teal2-400 grid place-items-center shadow-inner">
              <Bus className="w-5 h-5" />
            </span>
            <span>مواصلات بورسعيد</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 font-semibold leading-relaxed">
            اختار رايح منين ولفين وهنقولك تركب إيه. المسارات مبنية على تجارب حقيقية لطلبة الجامعات.
          </p>
        </div>
      </div>

      {/* Selector Card */}
      <motion.div
        className="rounded-3xl bg-white dark:bg-[#0f1a28] shadow-xl p-5 sm:p-6 border border-sand-200/80 dark:border-[#1d2d3e]"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid min-[480px]:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-ocean-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal2-500" />
              <span>من (نقطة التحرك)</span>
            </label>
            <select
              value={fromStop}
              onChange={(e) => setFromStop(e.target.value)}
              className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-3.5 py-3 text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500 transition"
            >
              {ALL_STOPS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            onClick={handleSwap}
            type="button"
            aria-label="اعكس الاتجاه"
            className="mx-auto w-11 h-11 rounded-2xl bg-sand-100 dark:bg-[#1a2d42] text-ocean-700 dark:text-white grid place-items-center hover:bg-sand-200 dark:hover:bg-[#233b56] transition shadow-md border border-sand-200/80 dark:border-[#24374c]"
            animate={{ rotate: swapRotate }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeftRight className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
          </motion.button>

          <div>
            <label className="block text-xs font-bold text-ocean-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-coral-500" />
              <span>إلى (الوجهة)</span>
            </label>
            <select
              value={toStop}
              onChange={(e) => setToStop(e.target.value)}
              className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-3.5 py-3 text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500 transition"
            >
              {ALL_STOPS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="mt-5 pt-4 border-t border-sand-200/60 dark:border-[#1d2d3e]">
          <p className="text-xs font-black text-ocean-800 dark:text-white/70 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sand-400" />
            <span>اختصارات سريعة للكليات:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((sc) => (
              <motion.button
                key={sc}
                onClick={() => {
                  setFromStop(HOME_STOP);
                  setToStop(sc);
                }}
                type="button"
                className={`rounded-full border text-xs font-bold px-3.5 py-1.5 transition ${
                  toStop === sc
                    ? 'bg-teal2-600 text-white border-teal2-600 shadow-sm'
                    : 'bg-sand-50 dark:bg-[#142232] border-sand-200 dark:border-[#22354a] text-ocean-700 dark:text-white/80 hover:bg-teal2-100 dark:hover:bg-teal2-950/60'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {sc.replace('كلية ', '')}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Plan Result */}
      <motion.div
        className="rounded-3xl bg-white dark:bg-[#0f1a28] shadow-md p-5 sm:p-6 border border-sand-200/80 dark:border-[#1d2d3e]"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {fromStop === toStop ? (
          <p className="text-sm font-bold text-ocean-700/80 dark:text-white/70 text-center py-6">
            أنت أصلًا في نفس المكان! اختر وجهة أخرى 📍
          </p>
        ) : !routePlan ? (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-ocean-800 dark:text-white">
              مفيش خط مباشر مباشر بين النقطتين دول لسه.
            </p>
            <p className="text-xs text-ocean-700/70 dark:text-white/60 mt-1">
              تقدر تركب تاكسي بورسعيد أو تسأل في أقرب موقف ميكروباص.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-sand-200/60 dark:border-[#1d2d3e]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300 font-black text-xs px-3.5 py-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {routePlan.length === 1
                    ? 'رحلة مباشرة بدون تبديل'
                    : `تبديل خط ${routePlan.length - 1} مرة`}
                </span>
              </span>

              <span className="text-xs font-bold text-ocean-700/60 dark:text-white/50">
                {routePlan.length} خطوات
              </span>
            </div>

            <ol className="space-y-4 relative">
              {routePlan.map((x, i) => {
                const noteKey = `${x.l}|${x.t}`;
                let note = TRANSPORT_NOTE[noteKey] || '';
                const nextStep = routePlan[i + 1];
                if (x.t === 'قصر الثقافة') {
                  note = nextStep && nextStep.f === x.t ? `انزل واركب ${nextStep.l} من برّه` : '';
                }

                return (
                  <motion.li
                    key={i}
                    className="flex gap-3 text-sm"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <span className="flex flex-col items-center">
                      <span className="w-8 h-8 shrink-0 rounded-2xl bg-gradient-to-b from-teal2-500 to-teal2-600 text-white grid place-items-center font-black text-xs shadow-md">
                        {i + 1}
                      </span>
                      {i < routePlan.length - 1 && (
                        <span className="flex-1 w-0.5 bg-teal2-500/30 my-1.5 rounded-full" />
                      )}
                    </span>
                    <div className="pb-3 min-w-0 flex-1">
                      <p className="font-black text-ocean-900 dark:text-white text-base">
                        اركب خط{' '}
                        <span className="rounded-xl bg-ocean-900 dark:bg-ocean-700 text-sand-300 px-2.5 py-0.5 text-xs font-black">
                          {x.l}
                        </span>
                      </p>
                      <p className="text-xs text-ocean-700/80 dark:text-ocean-100/70 mt-1 font-semibold">
                        من: <span className="font-bold text-ocean-900 dark:text-white">{x.f}</span>
                      </p>
                      <p className="text-xs font-black text-ocean-900 dark:text-white mt-0.5">
                        وانزل عند:{' '}
                        <span className="text-teal2-600 dark:text-teal2-400 font-extrabold">{x.t}</span>
                      </p>
                      {note && (
                        <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Info className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>{note}</span>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
