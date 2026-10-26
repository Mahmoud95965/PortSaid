'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Place } from '@/types';
import { CATS } from '@/lib/constants';
import { ArrowRight, MapPin, Sparkles, Tag } from 'lucide-react';
import { SightsView } from '@/components/SightsView';
import { RestaurantsView } from '@/components/RestaurantsView';

interface PlaceListProps {
  categoryKey: string;
  places: Place[];
  onSelectPlace: (placeId: string) => void;
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onRequestCoupon?: (place: Place) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 22,
    },
  },
};

export const PlaceList: React.FC<PlaceListProps> = ({
  categoryKey,
  places,
  onSelectPlace,
  onBack,
  onNavigate,
  onRequestCoupon,
}) => {
  if (categoryKey === 'fun') {
    return (
      <SightsView
        places={places}
        onSelectPlace={onSelectPlace}
        onNavigate={onNavigate}
        onBack={onBack}
      />
    );
  }

  if (categoryKey === 'food') {
    return (
      <RestaurantsView
        places={places}
        onSelectPlace={onSelectPlace}
        onNavigate={onNavigate}
        onBack={onBack}
        onRequestCoupon={onRequestCoupon}
      />
    );
  }

  const cat = CATS[categoryKey] || { t: 'الأماكن', border: '#1559b7', bgSoft: '#1559b71a' };
  const filtered = places.filter((p) => p.cat === categoryKey);

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back Button */}
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

      {/* Category Heading Banner */}
      <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-[#121c29]/70 backdrop-blur-md border border-sand-200/80 dark:border-[#203042] shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className="w-12 h-12 rounded-2xl grid place-items-center text-xl shadow-inner shrink-0"
            style={{ backgroundColor: cat.bgSoft, color: cat.border }}
          >
            <MapPin className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-ocean-900 dark:text-white leading-tight">
              {cat.t}
            </h2>
            <p className="text-xs text-ocean-700/70 dark:text-white/60 font-medium mt-0.5">
              استكشف أفضل الخيارات في بورسعيد
            </p>
          </div>
        </div>
        <motion.span
          className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-full bg-sand-100 dark:bg-[#1a293b] text-ocean-800 dark:text-teal2-400 border border-sand-200 dark:border-[#22364c]"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {filtered.length} مكان
        </motion.span>
      </div>

      {/* Places Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filtered.length > 0 ? (
          filtered.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => onSelectPlace(p.id)}
              type="button"
              variants={cardVariants}
              whileHover={{
                y: -6,
                scale: 1.02,
                boxShadow: '0 20px 35px -10px rgba(11, 42, 91, 0.12)',
              }}
              whileTap={{ scale: 0.98 }}
              className="group bg-white dark:bg-[#0f1a28] rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-right shadow-md shadow-ocean-700/5 dark:shadow-black/40 transition-colors border border-sand-200/80 dark:border-[#1d2d3e] flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 inset-x-0 h-1.5 transition-all duration-300 group-hover:h-2"
                style={{ backgroundColor: cat.border }}
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-3 mt-1">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: cat.bgSoft, color: cat.border }}
                  >
                    <MapPin className="w-5 h-5" />
                  </span>
                  {p.p > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                      <Sparkles className="w-3 h-3" />
                      +{p.p} نقطة
                    </span>
                  )}
                </div>

                <p className="text-base sm:text-lg font-black text-ocean-900 dark:text-white leading-snug group-hover:text-teal2-600 dark:group-hover:text-teal2-400 transition-colors">
                  {p.n}
                </p>
                <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 mt-1 font-semibold flex items-center gap-1">
                  <span>بورسعيد</span>
                  <span className="text-sand-400">·</span>
                  <span>{p.a}</span>
                </p>
                {p.ds && (
                  <p className="mt-2 text-xs text-ocean-700/70 dark:text-white/60 line-clamp-2 leading-relaxed">
                    {p.ds}
                  </p>
                )}
              </div>

              {p.disc > 0 && (
                <div className="mt-4 pt-3 border-t border-sand-200/60 dark:border-[#1d2d3e] flex items-center justify-between text-xs font-black">
                  <span className="inline-flex items-center gap-1 text-teal2-600 dark:text-teal2-400 bg-teal2-50 dark:bg-teal2-950/50 px-2 py-0.5 rounded-lg">
                    <Tag className="w-3 h-3" />
                    خصم {p.disc}%
                  </span>
                  <span className="text-sand-500 dark:text-sand-400">كوبون متاح ✨</span>
                </div>
              )}
            </motion.button>
          ))
        ) : (
          <motion.div
            variants={cardVariants}
            className="col-span-full py-16 text-center text-ocean-700/80 dark:text-white/70 bg-white/40 dark:bg-[#0f1a28]/40 rounded-3xl border border-dashed border-sand-300 dark:border-[#22364c]"
          >
            <p className="text-base font-bold">مفيش أماكن مضافة في هذا القسم حاليًا.</p>
            <p className="text-xs text-ocean-700/60 dark:text-white/50 mt-1">
              بنضيف أماكن جديدة يومياً، تابعنا دايماً!
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
