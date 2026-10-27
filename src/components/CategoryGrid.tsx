'use client';

import React from 'react';
import { CATS } from '@/lib/constants';
import {
  Compass,
  Star,
  Utensils,
  Coffee,
  IceCream,
  ShoppingBag,
  Dumbbell,
  Bed,
  Bus,
  Hotel,
  Shirt,
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  explore: <Compass className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  fun: <Star className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  food: <Utensils className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  cafe: <Coffee className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  sweets: <IceCream className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  shop: <ShoppingBag className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  clothes: <Shirt className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  sport: <Dumbbell className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  hotels: <Hotel className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  housing: <Bed className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
  bus: <Bus className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-7" />,
};

interface CategoryGridProps {
  onSelectCategory: (key: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelectCategory }) => {
  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-teal2-500 to-ocean-700 inline-block" />
          <h3 className="font-black text-base min-[400px]:text-lg sm:text-xl text-ocean-900 dark:text-white">
            اكتشف بورسعيد
          </h3>
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-ocean-800/80 dark:text-white/60">
          11 قسماً رئيسياً
        </span>
      </div>

      {/* Grid: 3 columns fluid on mobile up to desktop */}
      <div className="grid grid-cols-3 gap-2 min-[380px]:gap-2.5 sm:gap-3.5 lg:gap-4">
        {Object.entries(CATS).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => onSelectCategory(key)}
            type="button"
            className="group relative bg-white dark:bg-[#0f1a28] rounded-2xl sm:rounded-3xl p-2 min-[380px]:p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1.5 min-[380px]:gap-2 sm:gap-3 shadow-sm hover:shadow-md border border-sand-200/80 dark:border-[#1d2d3e] border-b-[3px] sm:border-b-4 transition-all duration-200 active:scale-95 touch-manipulation min-h-[5.2rem] min-[380px]:min-h-[6rem] sm:min-h-[7.5rem] md:min-h-[8.5rem] overflow-hidden"
            style={{ borderBottomColor: cat.border }}
          >
            {/* Category Icon Badge */}
            <span
              className="w-10 h-10 min-[380px]:w-11 min-[380px]:h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl grid place-items-center shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: cat.bgSoft, color: cat.border }}
            >
              {ICONS[key] ?? <Compass className="w-6 h-6" />}
            </span>

            {/* Category Name */}
            <span className="text-[11px] min-[380px]:text-xs sm:text-sm md:text-base font-black leading-tight text-ocean-900 dark:text-white line-clamp-2 px-0.5 relative z-10">
              {cat.t}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
