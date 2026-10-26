'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-sand-200/80 dark:border-[#1d2d3e] bg-white/60 dark:bg-[#071322]/80 backdrop-blur-md py-8 sm:py-10 mt-10 sm:mt-14 transition-colors relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-12 bg-teal2-500/10 blur-2xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 text-ocean-700/80 dark:text-white/70 text-center sm:text-right relative z-10">
        {/* Brand & Credits */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs min-[400px]:text-sm font-bold">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-8 h-8 rounded-xl bg-sand-200 dark:bg-sand-400/20 grid place-items-center overflow-hidden border border-sand-300/60 dark:border-sand-400/30">
              <img src="/assets/logo/icon-192.png" alt="" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-black text-ocean-900 dark:text-white text-sm sm:text-base">
              Port Said Hub
            </span>
          </motion.div>
          <span className="hidden sm:inline text-sand-400">·</span>
          <p className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm flex-wrap justify-center sm:justify-start">
            <span>صُنع بـ</span>
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            </motion.span>
            <span>الموقع مصمم من قبل <strong className="font-black text-ocean-900 dark:text-white">TOLZY Team</strong> © 2026</span>
          </p>
        </div>

        {/* Social Links with Magnetic Spring Hover */}
        <div className="flex items-center gap-2.5">
          <motion.a
            href="https://www.facebook.com/share/1dFYiUcCpv/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="فيسبوك"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] shadow-sm grid place-items-center hover:bg-ocean-700 hover:text-white text-ocean-900 dark:text-white transition"
            whileHover={{ scale: 1.15, y: -4, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </motion.a>
          <motion.a
            href="https://www.instagram.com/portsaid.hub/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="إنستجرام"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] shadow-sm grid place-items-center hover:bg-pink-600 hover:text-white text-ocean-900 dark:text-white transition"
            whileHover={{ scale: 1.15, y: -4, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </motion.a>
          <motion.a
            href="https://www.tiktok.com/@portsaid.hub"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تيك توك"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#121c29] border border-sand-200 dark:border-[#223246] shadow-sm grid place-items-center hover:bg-black hover:text-white text-ocean-900 dark:text-white transition"
            whileHover={{ scale: 1.15, y: -4, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </motion.a>
        </div>
      </div>
    </footer>
  );
};
