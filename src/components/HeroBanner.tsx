'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence, useMotionValue, useTransform, Variants } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [0, 300], [2, -2]);
  const rotateY = useTransform(mouseX, [0, 800], [-2, 2]);

  useEffect(() => {
    const t = setInterval(() => {
      setDirection(1);
      setIdx((p) => (p + 1) % HERO_IMAGES.length);
    }, 6500);
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
      scale: 1.1,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1.02,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.6, ease: 'easeIn' },
    }),
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl text-white shadow-2xl min-h-[200px] min-[400px]:min-h-[220px] sm:min-h-[260px] md:min-h-[300px] lg:min-h-[320px]"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      style={{ rotateX, rotateY, perspective: 1000 }}
      whileHover={{ boxShadow: '0 30px 60px -15px rgba(11,42,91,0.4)' }}
    >
      {/* Background Images with AnimatePresence */}
      <AnimatePresence custom={direction} mode="popLayout">
        <motion.img
          key={idx}
          src={HERO_IMAGES[idx].src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
        />
      </AnimatePresence>

      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(5,21,54,0.92) 0%, rgba(10,42,105,0.78) 45%, rgba(14,95,138,0.55) 85%, rgba(10,154,146,0.4) 100%)',
            'linear-gradient(135deg, rgba(5,21,54,0.88) 0%, rgba(10,42,105,0.72) 45%, rgba(14,95,138,0.6) 85%, rgba(10,154,146,0.45) 100%)',
            'linear-gradient(135deg, rgba(5,21,54,0.92) 0%, rgba(10,42,105,0.78) 45%, rgba(14,95,138,0.55) 85%, rgba(10,154,146,0.4) 100%)',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: 'radial-gradient(ellipse at 15% 30%, rgba(255,185,56,0.25) 0%, transparent 55%)',
        }}
      />

      {/* Floating decorative elements */}
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-sand-400/10 blur-2xl"
        style={{ top: '10%', right: '5%' }}
        animate={{ x: [0, 20, 0], y: [0, -15, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-teal2-400/10 blur-2xl"
        style={{ bottom: '20%', left: '10%' }}
        animate={{ x: [0, -15, 0], y: [0, 10, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Content Container */}
      <div className="relative z-10 p-4 min-[400px]:p-5 sm:p-7 md:p-9 pb-12 min-[400px]:pb-14 sm:pb-16 flex flex-col justify-between h-full">
        <div className="max-w-2xl">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/15 border border-white/25 text-[10px] min-[400px]:text-xs font-bold mb-2.5 sm:mb-3.5 backdrop-blur-sm"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Waves className="w-3 h-3 min-[400px]:w-3.5 min-[400px]:h-3.5 text-sand-400 shrink-0" />
            <span>دليلك الشامل في المدينة الباسلة</span>
          </motion.div>

          {/* Greeting Title */}
          <motion.h2
            className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-black leading-tight drop-shadow-md"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
          >
            أهلًا يا{' '}
            <motion.span
              style={{
                background: 'linear-gradient(135deg, #ffe3a8 0%, #ffb938 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block"
            >
              {firstName}
            </motion.span>{' '}
            <motion.span
              className="inline-block"
              animate={{ rotate: [0, 15, -10, 15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            >
              👋
            </motion.span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            className="mt-1.5 sm:mt-2 text-xs min-[400px]:text-sm sm:text-base text-white/90 font-medium leading-relaxed drop-shadow max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            عايز تروح فين النهاردة؟ مواصلات كليتك، أحسن المطاعم، سكن الطلاب، وأماكن بورسعيد كلها في مكان واحد.
          </motion.p>

          {/* Desktop Highlight Badges */}
          <div className="hidden sm:flex items-center gap-2 mt-3.5 text-xs text-white/85 font-bold">
            <motion.span
              className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/15"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              <span>9 أقسام رئيسية</span>
            </motion.span>
            <motion.span
              className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/15"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.05, duration: 0.5 }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal2-400" />
              <span>خصومات وكوبونات</span>
            </motion.span>
          </div>
        </div>

        {/* Bottom Bar: Slide Dots & Desktop Controls */}
        <div className="flex items-center justify-between mt-4 sm:mt-5 pt-1">
          {/* Slide Dots */}
          <div className="flex items-center gap-1.5">
            {HERO_IMAGES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => {
                  setDirection(i > idx ? 1 : -1);
                  setIdx(i);
                }}
                aria-label={`شريحة ${i + 1}`}
                className={`h-1.5 sm:h-2 rounded-full ${
                  i === idx ? 'bg-sand-400' : 'bg-white/35 hover:bg-white/60'
                }`}
                animate={{ width: i === idx ? 32 : 8 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>

          {/* Desktop Arrow Controls */}
          <div className="hidden sm:flex items-center gap-1.5">
            <motion.button
              onClick={handlePrev}
              type="button"
              aria-label="الصورة السابقة"
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleNext}
              type="button"
              aria-label="الصورة التالية"
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Decorative Animated Wave SVG */}
      <motion.svg
        viewBox="0 0 400 50"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-8 sm:h-12 pointer-events-none text-sand-50 dark:text-[#07162b] fill-current opacity-20"
        aria-hidden="true"
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M0 25 Q100 5 200 25 T400 25 L400 50 L0 50 Z" />
      </motion.svg>
    </motion.div>
  );
};
