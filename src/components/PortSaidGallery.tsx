'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export const PortSaidGallery: React.FC = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <section className="space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-sand-400 to-amber-600 inline-block" />
          <h3 className="font-black text-base min-[400px]:text-lg sm:text-xl text-ocean-900 dark:text-white flex items-center gap-2">
            <span>لمحات من بورسعيد</span>
          </h3>
        </div>

        {/* Desktop Carousel Controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={scrollRight}
            type="button"
            aria-label="التالي"
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] text-ocean-700 dark:text-white grid place-items-center hover:bg-sand-100 transition shadow-sm active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={scrollLeft}
            type="button"
            aria-label="السابق"
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] text-ocean-700 dark:text-white grid place-items-center hover:bg-sand-100 transition shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Swipe Hint */}
        <span className="sm:hidden text-[10px] font-bold text-ocean-700/50 dark:text-white/40">
          اسحب للتصفح ←
        </span>
      </div>

      {/* Horizontal Carousel with Native Hardware Scrolling */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 min-[400px]:gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {galleryItems.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative shrink-0 snap-start w-44 min-[400px]:w-52 sm:w-64 md:w-72 aspect-[16/11] sm:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-sand-200/80 dark:border-[#1d2d3e] text-right focus:outline-none transition-transform active:scale-[0.98]"
          >
            <img
              src={item.src}
              alt={item.cap}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Gradient Overlay with Caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 sm:p-4 pt-8">
              <p className="text-white text-xs sm:text-sm font-bold line-clamp-1 drop-shadow">
                {item.cap}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxIndex(null)}
              type="button"
              aria-label="إغلاق"
              className="absolute top-4 left-4 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prev button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              type="button"
              aria-label="السابقة"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg active:scale-90"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              type="button"
              aria-label="التالية"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg active:scale-90"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Image Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            >
              <img
                src={galleryItems[lightboxIndex].src}
                alt={galleryItems[lightboxIndex].cap}
                className="max-h-[72vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain"
              />
              <p className="mt-3 text-center text-white text-xs sm:text-base font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                {galleryItems[lightboxIndex].cap}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
