'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { AREAS } from '@/lib/constants';
import { ArrowRight, Bed, MapPin, Building, Sparkles } from 'lucide-react';

interface HousingViewProps {
  places: Place[];
  onSelectPlace: (placeId: string) => void;
  onBack: () => void;
}

export const HousingView: React.FC<HousingViewProps> = ({ places, onSelectPlace, onBack }) => {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const housingPlaces = places.filter((p) => p.cat === 'housing');

  const filteredPlaces = selectedArea
    ? selectedArea === '*'
      ? housingPlaces
      : housingPlaces.filter((p) => p.a.includes(selectedArea.replace('حي ', '')))
    : [];

  return (
    <motion.div
      className="space-y-5 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <motion.button
        onClick={() => {
          if (selectedArea) {
            setSelectedArea(null);
          } else {
            onBack();
          }
        }}
        type="button"
        className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-teal2-600 transition group"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        <span>{selectedArea ? 'رجوع لمناطق السكن' : 'رجوع للرئيسية'}</span>
      </motion.button>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-coral-100 dark:bg-coral-950/40 text-coral-500 grid place-items-center shadow-inner">
            <Bed className="w-5 h-5" />
          </span>
          <span>
            {selectedArea
              ? selectedArea === '*'
                ? 'كل السكن المتاح'
                : `السكن في ${selectedArea}`
              : 'سكن الطلاب والمغتربين'}
          </span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 font-semibold">
          {selectedArea
            ? 'اختر السكن لعرض التفاصيل وطريقة الوصول بالمواصلات.'
            : 'اختر المنطقة اللي حابب تسكن فيها في بورسعيد:'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedArea ? (
          <motion.div
            key="areas-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3.5"
          >
            {AREAS.map((a, i) => {
              const count = housingPlaces.filter((p) => p.a.includes(a.replace('حي ', ''))).length;
              return (
                <motion.button
                  key={a}
                  onClick={() => setSelectedArea(a)}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-[#0f1a28] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md shadow-ocean-700/5 dark:shadow-black/40 transition flex items-center justify-between gap-3 text-right border border-sand-200/80 dark:border-[#1d2d3e]"
                >
                  <span className="text-sm sm:text-base font-black text-ocean-900 dark:text-white flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-coral-500" />
                    <span>{a}</span>
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full ${
                      count
                        ? 'bg-teal2-100 text-teal2-700 dark:bg-teal2-950/60 dark:text-teal2-300'
                        : 'text-ocean-700/60 dark:text-white/50 bg-sand-100 dark:bg-[#182638]'
                    }`}
                  >
                    {count ? `${count} متاح` : 'قريبًا'}
                  </span>
                </motion.button>
              );
            })}

            <motion.button
              onClick={() => setSelectedArea('*')}
              type="button"
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="min-[480px]:col-span-2 bg-gradient-to-r from-ocean-900 via-ocean-800 to-ocean-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl transition font-black text-sm sm:text-base flex items-center justify-center gap-2 border border-white/10"
            >
              <Building className="w-5 h-5 text-sand-400" />
              <span>عرض كل السكن المتاح في جميع أحياء بورسعيد</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="places-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
          >
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((p, i) => (
                <motion.button
                  key={p.id}
                  onClick={() => onSelectPlace(p.id)}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-[#0f1a28] rounded-2xl sm:rounded-3xl p-5 text-right shadow-md hover:shadow-xl transition border border-sand-200/80 dark:border-[#1d2d3e] border-b-4 border-b-coral-500"
                >
                  <span className="inline-block rounded-full bg-coral-500 text-white text-[11px] font-black px-2.5 py-0.5">
                    سكن طلاب
                  </span>
                  <p className="mt-2 text-base sm:text-lg font-black text-ocean-900 dark:text-white leading-tight">
                    {p.n}
                  </p>
                  <p className="text-xs text-ocean-700/80 dark:text-ocean-100/70 mt-1 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-coral-500" />
                    <span>بورسعيد · {p.a}</span>
                  </p>
                  {p.ds && (
                    <p className="mt-2 text-xs text-ocean-700/70 dark:text-white/60 line-clamp-2 leading-relaxed">
                      {p.ds}
                    </p>
                  )}
                </motion.button>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-ocean-700/80 dark:text-white/70 bg-white/40 dark:bg-[#0f1a28]/40 rounded-3xl border border-dashed border-sand-300 dark:border-[#203042]">
                <p className="text-base font-bold">مفيش سكن مسجل في هذه المنطقة حاليًا.</p>
                <p className="text-xs text-ocean-700/60 dark:text-white/50 mt-1">
                  بنضيف عقارات وأماكن سكن جديدة بشكل دوري.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
