'use client';

import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { CATS } from '@/lib/constants';
import { Compass, Star, Utensils, Coffee, IceCream, ShoppingBag, Dumbbell, Bed, Bus, Sparkles, Hotel, Shirt } from 'lucide-react';

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

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelectCategory }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Section Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-teal2-500 to-ocean-700 inline-block"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
          />
          <h3 className="font-black text-base min-[400px]:text-lg sm:text-xl text-ocean-900 dark:text-white">
            اكتشف بورسعيد
          </h3>
        </div>
        <motion.span
          className="text-[11px] sm:text-xs font-bold text-ocean-700/60 dark:text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          11 قسماً رئيسياً
        </motion.span>
      </motion.div>

      {/* Grid: 3 columns fluid on mobile up to desktop */}
      <motion.div
        ref={ref}
        className="grid grid-cols-3 gap-2 min-[380px]:gap-2.5 sm:gap-3.5 lg:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {Object.entries(CATS).map(([key, cat], index) => (
          <motion.button
            key={key}
            onClick={() => onSelectCategory(key)}
            type="button"
            className="group relative bg-white dark:bg-[#0f1a28] rounded-2xl sm:rounded-3xl p-2 min-[380px]:p-3 sm:p-4 text-center flex flex-col items-center justify-center gap-1.5 min-[380px]:gap-2 sm:gap-3 shadow-md shadow-ocean-900/5 dark:shadow-black/40 border border-sand-200/80 dark:border-[#1d2d3e] border-b-[3px] sm:border-b-4 transition-colors duration-200 touch-manipulation min-h-[5.2rem] min-[380px]:min-h-[6rem] sm:min-h-[7.5rem] md:min-h-[8.5rem] overflow-hidden"
            style={{ borderBottomColor: cat.border }}
            variants={itemVariants}
            whileHover={{
              y: -8,
              scale: 1.04,
              boxShadow: `0 20px 40px -10px ${cat.border}33`,
              transition: { type: 'spring', stiffness: 400, damping: 15 },
            }}
            whileTap={{ scale: 0.92 }}
          >
            {/* Hover background glow */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl sm:rounded-3xl"
              style={{
                background: `radial-gradient(circle at center, ${cat.border}12 0%, transparent 70%)`,
              }}
            />

            {/* Category Icon Badge */}
            <motion.span
              className="w-10 h-10 min-[380px]:w-11 min-[380px]:h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl grid place-items-center shrink-0 relative z-10"
              style={{ backgroundColor: cat.bgSoft, color: cat.border }}
              whileHover={{
                scale: 1.15,
                rotate: [0, -5, 5, 0],
                transition: { rotate: { duration: 0.5 } },
              }}
            >
              {ICONS[key] ?? <Compass className="w-6 h-6" />}
            </motion.span>

            {/* Category Name */}
            <span className="text-[11px] min-[380px]:text-xs sm:text-sm md:text-base font-black leading-tight text-ocean-900 dark:text-white line-clamp-2 px-0.5 relative z-10">
              {cat.t}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
};
