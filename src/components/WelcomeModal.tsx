'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bus, Utensils, Bed, Star, Sun, Moon, Waves, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  onStart: () => void;
}

const SLIDES = [
  { src: '/assets/port-said/port-said-lighthouse.webp', caption: 'فنار بورسعيد التاريخي' },
  { src: '/assets/port-said/port-said-port-night.webp', caption: 'ميناء بورسعيد ليلاً' },
  { src: '/assets/port-said/port-said-mosque.webp', caption: 'مسجد السلام الكبير' },
];

// Floating particles component
const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }))
  , []);

  return (
    <div className="particles-container">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="particle bg-sand-400/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart }) => {
  const { theme, toggleTheme } = useAuth();
  const [slide, setSlide] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    { icon: <Bus className="w-4 h-4" />, label: 'مواصلات' },
    { icon: <Utensils className="w-4 h-4" />, label: 'مطاعم' },
    { icon: <Bed className="w-4 h-4" />, label: 'سكن' },
    { icon: <Star className="w-4 h-4" />, label: 'نقاط ومكافآت' },
  ];

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#040f24] text-white flex flex-col items-center justify-center">
      {/* Background Slides */}
      <div className="absolute inset-0" aria-hidden="true">
        <AnimatePresence mode="wait">
          {SLIDES.map((s, i) => (
            <motion.div
              key={s.src}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: i === slide ? 1 : 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              <motion.img
                src={s.src}
                alt=""
                className="w-full h-full object-cover"
                animate={{
                  scale: i === slide ? [1, 1.08] : 1,
                }}
                transition={{
                  duration: 6,
                  ease: 'easeOut',
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Multi-layer overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(4,15,36,0.55) 0%, rgba(4,15,36,0.2) 30%, rgba(4,15,36,0.7) 65%, rgba(4,15,36,0.97) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 20% 50%, rgba(15,111,184,0.35) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(10,154,146,0.2) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Animated Morphing Blobs */}
      <motion.div
        className="absolute w-72 h-72 bg-teal2-500/10 animate-morph-blob blur-3xl"
        style={{ top: '10%', right: '-5%' }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-sand-400/10 animate-morph-blob blur-3xl"
        style={{ bottom: '5%', left: '-10%' }}
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Theme Toggle */}
      <motion.button
        onClick={toggleTheme}
        type="button"
        aria-label="تبديل الوضع الليلي والنهاري"
        className="absolute left-4 top-4 z-20 w-11 h-11 rounded-2xl bg-white/15 border border-white/30 text-white backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition shadow-lg"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-sand-400" /> : <Moon className="w-5 h-5" />}
      </motion.button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {SLIDES.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === slide ? 'w-8 bg-sand-400' : 'w-2 bg-white/40'
            }`}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.8 }}
            layout
          />
        ))}
      </div>

      {/* Main Card */}
      {isReady && (
        <div className="relative z-10 w-full max-w-lg mx-auto px-5 flex flex-col items-center text-center">
          {/* Logo */}
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border-4 border-white/50 shadow-[0_0_0_8px_rgba(255,255,255,0.12),0_0_56px_rgba(255,185,56,0.45)] flex items-center justify-center mb-5 pulse-glow relative"
            initial={{ opacity: 0, scale: 0.3, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
          >
            <motion.img
              src="/assets/logo/icon-192.png"
              alt="Port Said Hub"
              className="w-[80%] h-[80%] object-contain"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            {/* Sparkle effects around logo */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={deg}
                className="absolute w-2 h-2"
                style={{
                  top: `${50 + 60 * Math.sin((deg * Math.PI) / 180)}%`,
                  left: `${50 + 60 * Math.cos((deg * Math.PI) / 180)}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="w-2 h-2 text-sand-400" />
              </motion.div>
            ))}
          </motion.div>

          {/* Title */}
          <motion.p
            dir="ltr"
            className="text-xs font-black tracking-[0.25em] uppercase text-sand-400 drop-shadow mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Port Said Hub
          </motion.p>
          <motion.h1
            className="text-4xl sm:text-5xl font-black leading-tight drop-shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.7, ease: 'easeOut' }}
          >
            مرحبًا بك{' '}
            <motion.span
              className="animate-text-glow inline-block"
              style={{
                background: 'linear-gradient(135deg, #ffe3a8 0%, #ffb938 50%, #ff9800 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%',
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              في بورسعيد
            </motion.span>
          </motion.h1>

          <motion.div
            className="w-16 h-1 rounded-full mx-auto my-4 bg-gradient-to-r from-transparent via-sand-400 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
          />

          <motion.p
            className="text-base sm:text-lg text-white/85 leading-relaxed drop-shadow max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            دليلك الشامل في المدينة الباسلة — مواصلات، مطاعم، سكن، وأماكن تستاهل.
          </motion.p>

          {/* Feature Chips */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {features.map((f, i) => (
              <motion.span
                key={i}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white/12 border border-white/20 text-white backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 1.2 + i * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <span className="text-sand-400">{f.icon}</span>
                {f.label}
              </motion.span>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            onClick={onStart}
            type="button"
            className="mt-7 ps-btn-gold text-lg min-w-[16rem] relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6, ease: 'easeOut' }}
            whileHover={{
              scale: 1.05,
              y: -4,
              boxShadow: '0 24px 48px -10px rgba(255,185,56,0.7)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 shimmer-bg"
              animate={{
                backgroundPosition: ['-200% center', '200% center'],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 2 }}
            />
            <span className="relative z-10">هيا نبدأ</span>
            <ArrowLeft className="w-5 h-5 relative z-10" />
          </motion.button>

          <motion.p
            className="mt-4 text-xs text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            بورسعيد .. المدينة الباسلة &middot; فريق Alpha Team &copy; 2026
          </motion.p>
        </div>
      )}
    </div>
  );
};
