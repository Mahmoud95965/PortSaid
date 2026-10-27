'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'ps_pwa_dismissed_until';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // SW registered successfully
        })
        .catch((err) => {
          console.warn('Service Worker registration skipped/failed:', err);
        });
    }

    // 2. Check standalone mode (already installed)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isAppStandalone);
    if (isAppStandalone) return;

    // 3. Check dismissed timeout (dismiss for 48 hours if user closed it)
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    } catch (e) {}

    // 4. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('chrome');

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Show gentle prompt after 2 seconds on iOS
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // 5. Handle standard BeforeInstallPrompt event (Chrome, Edge, Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after brief delay for smooth UX
      setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      // Don't show again for 48 hours
      const nextTime = Date.now() + 48 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, String(nextTime));
    } catch (e) {}
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.aside
        role="region"
        aria-label="إشعار تثبيت التطبيق"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:left-6 sm:max-w-md z-50 hardware-accel"
        dir="rtl"
      >
        <div className="rounded-3xl bg-white/95 dark:bg-[#0c1624]/95 backdrop-blur-xl border border-sand-300 dark:border-[#22354c] p-4 sm:p-5 shadow-2xl space-y-3.5 text-ocean-900 dark:text-white">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ocean-700 to-teal2-700 p-2 text-white shadow-md grid place-items-center shrink-0">
                <img
                  src="/assets/logo/icon-192.png"
                  alt="Port Said Hub"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm sm:text-base">تثبيت تطبيق Port Said Hub</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-ocean-700/70 dark:text-slate-300 font-medium">
                  احصل على تجربة سريعة وتصفح مباشر بلمسة واحدة
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              type="button"
              className="p-1 text-ocean-600 dark:text-slate-400 hover:text-ocean-900 dark:hover:text-white transition rounded-lg"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body description */}
          {isIOS ? (
            <div className="p-3 rounded-2xl bg-sand-100/70 dark:bg-[#162738] text-xs space-y-2 border border-sand-200 dark:border-[#22354c]">
              <p className="font-bold text-ocean-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
                <span>طريقة التثبيت على أجهزة iPhone / iPad:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-ocean-700 dark:text-slate-300 pr-1">
                <li>
                  اضغط على زر المشاركة <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> في أسفل المتصفح.
                </li>
                <li>
                  اختر <strong className="text-ocean-900 dark:text-white">"إضافة إلى الشاشة الرئيسية"</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />.
                </li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-ocean-700/80 dark:text-slate-300 leading-relaxed font-medium">
              تصفح أسرع، وتوفير استهلاك البيانات، والوصول الفوري لدليل بورسعيد ومكافآتك بدون متصفح.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-ocean-800 to-teal2-600 text-white font-black text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 transition"
              >
                <Download className="w-4 h-4 text-sand-300" />
                <span>تثبيت التطبيق الآن</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              type="button"
              className={`${
                isIOS || !deferredPrompt ? 'w-full' : ''
              } px-4 py-2.5 rounded-2xl bg-sand-100 dark:bg-slate-800/80 hover:bg-sand-200 dark:hover:bg-slate-700 text-ocean-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition text-center`}
            >
              {isIOS ? 'حسناً، فهمت' : 'لاحقاً'}
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
