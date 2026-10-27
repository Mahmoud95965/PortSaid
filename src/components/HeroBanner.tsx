'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Waves, ChevronRight, ChevronLeft, Sparkles, MapPin } from 'lucide-react';

const HERO_IMAGES = [
  { src: '/assets/port-said/hero-01.webp', title: 'ممشى ديليسبس وقناة السويس' },
  { src: '/assets/port-said/hero-02.webp', title: 'شواطئ بورسعيد وبورفؤاد' },
  { src: '/assets/port-said/hero-03.webp', title: 'الحي الإفرنجي والعمارة التاريخية' },
];

export const HeroBanner: React.FC = () => {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setDirection(1);
      setIdx((p) => (p + 1) % HERO_IMAGES.length);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'صديقي';

  const handleNext = () => {
    setDirection(1);
    setIdx((p) => (p + 1) % HERO_IMAGES.length);
  };
  const handlePrev = () => {
    setDirection(-1);
    setIdx((p) => (p - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  };

  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      transition: { duration: 0.4, ease: 'easeIn' },
    }),
  };

  return (
    <div className="relative overflow-hidden rounded-3xl text-white shadow-xl min-h-[200px] min-[400px]:min-h-[220px] sm:min-h-[260px] md:min-h-[290px] will-change-transform">
      {/* Background Images with Hardware-Accelerated AnimatePresence */}
      <AnimatePresence custom={direction} mode="popLayout">
        <motion.img
          key={idx}
          src={HERO_IMAGES[idx].src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
        />
      </AnimatePresence>

      {/* High-Performance Hardware CSS Gradient Overlays (Zero JS Animation Overhead) */}
      <div className="absolute inset-0 bg-gradient-to-l from-[#051536]/90 via-[#0a2a69]/80 to-[#0e5f8a]/60" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: 'radial-gradient(ellipse at 15% 30%, rgba(255,185,56,0.2) 0%, transparent 60%)',
        }}
      />

      {/* Lightweight Ambient Glows without heavy blur loops */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-sand-400/10 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-teal2-400/10 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 p-4 min-[400px]:p-5 sm:p-7 md:p-8 pb-12 min-[400px]:pb-13 sm:pb-14 flex flex-col justify-between h-full">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/15 border border-white/25 text-[10px] min-[400px]:text-xs font-bold mb-2.5 sm:mb-3">
            <Waves className="w-3 h-3 min-[400px]:w-3.5 min-[400px]:h-3.5 text-sand-400 shrink-0" />
            <span>دليلك الشامل في المدينة الباسلة</span>
          </div>

          {/* Greeting Title */}
          <h2 className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-black leading-tight drop-shadow-md">
            يا هلا بيك يا {firstName} في بورسعيد! ⚓
          </h2>

          <p className="mt-1.5 sm:mt-2 text-xs min-[400px]:text-sm sm:text-base text-white/90 leading-relaxed max-w-xl font-medium">
            اكتشف أفضل مطاعم الأسماك، الكافيهات على القناة، ومعالم بورسعيد وبورفؤاد.. واكسب نقاط وهدايا حقيقية مع كل زيارة!
          </p>

          {/* Quick Info Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
            <span className="inline-flex items-center gap-1 bg-white/15 border border-white/20 rounded-xl px-2.5 py-1 text-[11px] font-bold">
              <Sparkles className="w-3 h-3 text-sand-400" />
              <span>كوبونات خصم 10% - 20%</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-white/15 border border-white/20 rounded-xl px-2.5 py-1 text-[11px] font-bold">
              <MapPin className="w-3 h-3 text-teal2-300" />
              <span>{HERO_IMAGES[idx].title}</span>
            </span>
          </div>
        </div>

        {/* Slide Indicators and Controls */}
        <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 flex items-center justify-between z-20">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > idx ? 1 : -1);
                  setIdx(i);
                }}
                aria-label={`شريحة ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? 'w-6 bg-sand-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              aria-label="السابق"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 grid place-items-center transition text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="التالي"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 grid place-items-center transition text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
