'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Image as ImageIcon, X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export const PortSaidGallery: React.FC = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-40px' });

  const galleryItems = [
    {
      src: '/assets/port-said/gallery/balconies-street.webp',
      cap: 'شرفات خشبية في شوارع الحي الإفرنجي القديم بورسعيد',
    },
    {
      src: '/assets/port-said/gallery/martyrs-square.webp',
      cap: 'ميدان الشهداء ومسلة النصر الشامخة',
    },
    {
      src: '/assets/port-said/gallery/ship.webp',
      cap: 'سفينة عملاقة تعبر المجرى الملاحي لقناة السويس',
    },
    {
      src: '/assets/port-said/port-said-lighthouse.webp',
      cap: 'فنار بورسعيد التاريخي العريق',
    },
    {
      src: '/assets/port-said/port-said-mosque.webp',
      cap: 'مسجد السلام الكبير بورسعيد',
    },
  ];

  const handleNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % galleryItems.length);
    }
  };

  const handlePrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + galleryItems.length) % galleryItems.length);
    }
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} className="space-y-3 sm:space-y-4">
      {/* Section Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-sand-400 to-amber-600 inline-block"
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
          <h3 className="font-black text-base min-[400px]:text-lg sm:text-xl text-ocean-900 dark:text-white flex items-center gap-2">
            <span>لمحات من بورسعيد</span>
          </h3>
        </div>

        {/* Desktop Carousel Controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <motion.button
            onClick={scrollRight}
            type="button"
            aria-label="التالي"
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] text-ocean-700 dark:text-white grid place-items-center hover:bg-sand-100 transition shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={scrollLeft}
            type="button"
            aria-label="السابق"
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] text-ocean-700 dark:text-white grid place-items-center hover:bg-sand-100 transition shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Mobile Swipe Hint */}
        <motion.span
          className="sm:hidden text-[10px] font-bold text-ocean-700/50 dark:text-white/40"
          animate={{ x: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          اسحب للتصفح ←
        </motion.span>
      </motion.div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 min-[400px]:gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none"
      >
        {galleryItems.map((item, index) => (
          <motion.button
            key={item.src}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative shrink-0 snap-start w-44 min-[400px]:w-52 sm:w-64 md:w-72 aspect-[16/11] sm:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md shadow-ocean-900/5 dark:shadow-black/40 border border-sand-200/80 dark:border-[#1d2d3e] text-right focus:outline-none"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{
              delay: 0.15 + index * 0.1,
              duration: 0.5,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            whileHover={{
              y: -8,
              scale: 1.03,
              boxShadow: '0 24px 48px -12px rgba(11,42,91,0.25)',
              transition: { type: 'spring', stiffness: 400, damping: 15 },
            }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.img
              src={item.src}
              alt={item.cap}
              loading="lazy"
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.6 }}
            />
            {/* Gradient Overlay with Caption */}
            <motion.div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 sm:p-4 pt-8"
              initial={{ y: 10, opacity: 0.8 }}
              whileHover={{ y: 0, opacity: 1 }}
            >
              <p className="text-white text-xs sm:text-sm font-bold line-clamp-1 drop-shadow">
                {item.cap}
              </p>
            </motion.div>
          </motion.button>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close button */}
            <motion.button
              onClick={() => setLightboxIndex(null)}
              type="button"
              aria-label="إغلاق"
              className="absolute top-4 left-4 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Prev button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              type="button"
              aria-label="السابقة"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>

            {/* Next button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              type="button"
              aria-label="التالية"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            {/* Main Image Container */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3"
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxIndex}
                  src={galleryItems[lightboxIndex].src}
                  alt=""
                  className="max-w-full max-h-[72vh] rounded-2xl sm:rounded-3xl object-contain shadow-2xl border border-white/10"
                  initial={{ opacity: 0, scale: 0.9, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -50 }}
                  transition={{ duration: 0.35 }}
                />
              </AnimatePresence>
              <motion.p
                className="text-white text-center font-bold text-sm sm:text-base px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {galleryItems[lightboxIndex].cap}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
