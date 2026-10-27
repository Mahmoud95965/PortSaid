'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Star,
  Moon,
  Sun,
  User as UserIcon,
  MessageSquare,
  Shield,
  LogOut,
  Bus,
  Bed,
  Compass,
  Home,
  Sparkles,
  MapPin,
  Settings,
  Hotel,
  Camera,
  Shirt,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  Store,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onNavigate: (view: string, arg?: string | null) => void;
  onOpenFeedback: () => void;
  onOpenPoints: () => void;
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenFeedback,
  onOpenPoints,
  onOpenGuide,
}) => {
  const { user, theme, toggleTheme, logout } = useAuth();

  // Dropdown states
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exploreMenuOpen, setExploreMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for click outside
  const userMenuRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (exploreRef.current && !exploreRef.current.contains(target)) {
        setExploreMenuOpen(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(target)) {
        setServicesMenuOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMerchant = user?.role === 'merchant';

  const dropdownVariants: Variants = {
    hidden: { opacity: 0, y: -8, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    exit: { opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.15 } },
  };

  const navigateAndClose = (view: string, arg?: string | null) => {
    onNavigate(view, arg);
    setExploreMenuOpen(false);
    setServicesMenuOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <motion.header
      className={`sticky top-0 z-40 text-white shadow-lg backdrop-blur-md transition-colors duration-300 border-b border-white/10 hardware-accel ${
        isMerchant
          ? 'bg-gradient-to-r from-[#2c1d58]/95 via-[#4a1d6e]/95 to-[#8c3d1b]/95'
          : 'bg-[#061a3d]/98 dark:bg-[#051122]/98 waves-pattern'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <nav className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Link */}
        <motion.div
          onClick={() => navigateAndClose('home')}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 sm:gap-3 min-w-0 font-extrabold cursor-pointer select-none hover:opacity-90 transition"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-[#f8f4ea] border-2 border-white/70 shadow-md flex items-center justify-center overflow-hidden"
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <img src="/assets/logo/icon-192.png" alt="Port Said Hub" className="w-[84%] h-[84%] object-contain" />
          </motion.div>
          <div className="leading-tight min-w-0">
            <p dir="ltr" className="text-sm sm:text-base lg:text-lg font-black truncate text-right tracking-tight">
              Port Said Hub
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-white/75 truncate hidden min-[360px]:block">
              {isMerchant ? 'حساب التاجر والشركاء' : 'بورسعيد.. المدينة الباسلة'}
            </p>
          </div>
        </motion.div>

        {/* Center Desktop Navigation: Grouped & Elegant */}
        {!isMerchant && (
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {/* 1. الرئيسية */}
            <motion.button
              onClick={() => navigateAndClose('home')}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-white/90 hover:text-white hover:bg-white/15 transition"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-4 h-4 text-sand-400" />
              <span>الرئيسية</span>
            </motion.button>

            {/* 2. قائمة استكشف بورسعيد المنسدلة */}
            <div className="relative" ref={exploreRef}>
              <motion.button
                onClick={() => {
                  setExploreMenuOpen(!exploreMenuOpen);
                  setServicesMenuOpen(false);
                }}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm transition ${
                  exploreMenuOpen
                    ? 'bg-white/20 text-white'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Compass className="w-4 h-4 text-sand-400" />
                <span>استكشف بورسعيد</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    exploreMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {exploreMenuOpen && (
                  <motion.div
                    className="absolute right-0 top-11 z-50 w-64 bg-white dark:bg-[#101b2a] text-ocean-900 dark:text-white rounded-2xl shadow-2xl p-2 border border-sand-200 dark:border-[#1d2d3e] space-y-1"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <button
                      onClick={() => navigateAndClose('explore')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sand-200/80 dark:bg-sand-400/20 text-sand-700 dark:text-sand-300 grid place-items-center shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 text-ocean-900 dark:text-sand-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">الدليل التاريخي</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          قصة المدينة الباسلة من 1859 حتى اليوم
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigateAndClose('memories')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300 grid place-items-center shrink-0 mt-0.5">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">ذكريات بورسعيد</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          صور وتجارب مجتمع بورسعيد هب
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigateAndClose('map')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 grid place-items-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">الخريطة التفاعلية</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          تصفح المعالم والشوارع بالكيلومتر
                        </p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. قائمة دليل وخدمات المدينة المنسدلة */}
            <div className="relative" ref={servicesRef}>
              <motion.button
                onClick={() => {
                  setServicesMenuOpen(!servicesMenuOpen);
                  setExploreMenuOpen(false);
                }}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm transition ${
                  servicesMenuOpen
                    ? 'bg-white/20 text-white'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Layers className="w-4 h-4 text-sand-400" />
                <span>دليل المدينة</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    servicesMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {servicesMenuOpen && (
                  <motion.div
                    className="absolute right-0 top-11 z-50 w-64 bg-white dark:bg-[#101b2a] text-ocean-900 dark:text-white rounded-2xl shadow-2xl p-2 border border-sand-200 dark:border-[#1d2d3e] space-y-1"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <button
                      onClick={() => navigateAndClose('hotels')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 grid place-items-center shrink-0 mt-0.5">
                        <Hotel className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">الفنادق والأوتيلات</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          منتجعات الشاطئ وفنادق المدينة
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigateAndClose('bus')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-ocean-100 dark:bg-ocean-950/60 text-ocean-700 dark:text-sand-300 grid place-items-center shrink-0 mt-0.5">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">المواصلات والخطوط</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          خطوط السير والجامعة والمعدية
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigateAndClose('housing')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 grid place-items-center shrink-0 mt-0.5">
                        <Bed className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">السكن والمغتربين</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          سكن الطلاب والعائلات في الأحياء
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigateAndClose('clothes')}
                      type="button"
                      className="w-full text-right p-2.5 rounded-xl hover:bg-sand-100 dark:hover:bg-[#162738] transition flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 grid place-items-center shrink-0 mt-0.5">
                        <Shirt className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-ocean-900 dark:text-white">الملابس والتسوق</p>
                        <p className="text-[10px] text-ocean-700/60 dark:text-white/50 truncate">
                          أسواق المنطقة الحرة والماركات
                        </p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4. زر المساعد الذكي المميز */}
            <motion.button
              onClick={() => navigateAndClose('ai')}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs xl:text-sm bg-gradient-to-r from-teal2-500 to-ocean-700 text-white shadow-md border border-teal2-400/40 hover:brightness-110 transition"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-sand-300 animate-pulse" />
              <span>المساعد الذكي ✦</span>
            </motion.button>
          </div>
        )}

        {/* Right Actions: Points, Theme, Profile, Mobile Menu Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Points Badge */}
          {!isMerchant && (
            <motion.button
              onClick={onOpenPoints}
              type="button"
              aria-label="عرض تفاصيل رصيد النقاط والمكافآت"
              title="رصيدك من النقاط - اضغط لعرض التفاصيل الكاملة"
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1 sm:py-1.5 font-black text-xs sm:text-sm transition cursor-pointer select-none"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sand-400 fill-sand-400 shrink-0" />
              <span className="text-sand-300 font-extrabold">{user?.points ?? 0}</span>
              <span className="hidden min-[480px]:inline text-[11px] sm:text-xs text-white/90">نقطة</span>
            </motion.button>
          )}

          {/* Theme Toggle Button */}
          <motion.button
            onClick={toggleTheme}
            type="button"
            aria-label="تبديل الوضع الليلي والنهاري"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/15 border border-white/30 text-white grid place-items-center hover:bg-white/25 transition shadow-sm"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9, rotate: -15 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-sand-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              type="button"
              aria-label="حسابي"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#ffd27a] to-[#ffb938] text-ocean-900 grid place-items-center hover:opacity-90 transition shadow-md overflow-hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-ocean-900" />
              )}
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  className="absolute left-0 top-12 sm:top-14 z-50 w-72 sm:w-80 bg-white dark:bg-[#121c29] text-ocean-900 dark:text-white rounded-3xl shadow-2xl p-4 border border-sand-200 dark:border-[#223246]"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-sand-200 dark:border-[#223246]">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-sand-100 dark:bg-[#1a2739] text-ocean-700 dark:text-teal2-400 grid place-items-center font-bold text-lg overflow-hidden border border-sand-200 dark:border-[#2a3a4f]">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.charAt(0) || <UserIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold truncate text-base text-ocean-900 dark:text-white">{user?.name || 'زائر بورسعيد'}</p>
                      <p dir="ltr" className="text-xs text-ocean-700/70 dark:text-white/60 truncate text-right">
                        {user?.email || user?.phone || 'مرحباً بك'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {user?.role === 'owner' && (
                          <span className="rounded-full bg-ocean-900 text-sand-400 text-[10px] font-bold px-2 py-0.5">
                            المالك
                          </span>
                        )}
                        {user?.role === 'admin' && (
                          <span className="rounded-full bg-ocean-700 text-white text-[10px] font-bold px-2 py-0.5">
                            أدمن
                          </span>
                        )}
                        {user?.role === 'merchant' && (
                          <span className="rounded-full bg-teal2-600 text-white text-[10px] font-bold px-2 py-0.5">
                            تاجر شريك
                          </span>
                        )}
                        {user?.gov && (
                          <span className="rounded-full bg-sand-100 dark:bg-[#1e2d40] text-ocean-900 dark:text-white text-[10px] font-bold px-2 py-0.5">
                            {user.gov}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {/* 1. الملف الشخصي */}
                    <button
                      onClick={() => navigateAndClose('account')}
                      type="button"
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sand-50 dark:bg-[#1a2739] text-ocean-900 dark:text-white font-bold text-sm hover:bg-sand-100 dark:hover:bg-[#22334a] transition border border-sand-200/80 dark:border-[#2a3a4f]"
                    >
                      <span className="flex items-center gap-2.5">
                        <UserIcon className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
                        <span>الملف الشخصي والبيانات</span>
                      </span>
                      <span className="text-[10px] font-black text-ocean-600 dark:text-sand-300 bg-sand-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        حسابي
                      </span>
                    </button>

                    {/* 2. الإعدادات */}
                    <button
                      onClick={() => navigateAndClose('account')}
                      type="button"
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sand-50 dark:bg-[#1a2739] text-ocean-900 dark:text-white font-bold text-sm hover:bg-sand-100 dark:hover:bg-[#22334a] transition border border-sand-200/80 dark:border-[#2a3a4f]"
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
                        <span>الإعدادات والتفضيلات</span>
                      </span>
                      <span className="text-[10px] font-black text-ocean-600 dark:text-sand-300 bg-sand-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        إعدادات
                      </span>
                    </button>

                    {/* لوحة التحكم للمالك والمشرف */}
                    {(user?.role === 'admin' || user?.role === 'owner') && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sand-100 dark:bg-[#1f2d3f] text-ocean-900 dark:text-white font-bold text-sm hover:bg-sand-200 dark:hover:bg-[#283950] transition border border-sand-300 dark:border-[#31445d]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-sand-500" />
                          <span>لوحة التحكم الإدارية</span>
                        </span>
                        <span className="text-[10px] font-black text-white bg-ocean-900 px-2 py-0.5 rounded-full">
                          إدارة
                        </span>
                      </Link>
                    )}

                    {/* 3. تسجيل الخروج */}
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition border border-red-200/60 dark:border-red-900/30"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle Button (Visible on screens < lg) */}
          {!isMerchant && (
            <div className="lg:hidden relative" ref={mobileRef}>
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                type="button"
                aria-label="القائمة الرئيسية"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/15 border border-white/30 text-white grid place-items-center hover:bg-white/25 transition shadow-sm"
                whileTap={{ scale: 0.9 }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>

              {/* Mobile Drawer Dropdown */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    className="absolute left-0 top-12 sm:top-14 z-50 w-[88vw] max-w-sm bg-white dark:bg-[#101b2a] text-ocean-900 dark:text-white rounded-3xl shadow-2xl p-4 border border-sand-300 dark:border-[#223246] space-y-3"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {/* Header in mobile menu */}
                    <div className="flex items-center justify-between pb-2 border-b border-sand-200 dark:border-[#1d2d3e]">
                      <span className="font-black text-sm text-ocean-900 dark:text-white">أقسام بورسعيد هب</span>
                      <button
                        onClick={() => navigateAndClose('ai')}
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-gradient-to-r from-teal2-600 to-ocean-800 text-white text-[11px] font-black flex items-center gap-1 shadow"
                      >
                        <Sparkles className="w-3 h-3 text-sand-300" />
                        <span>AI Suite ✦</span>
                      </button>
                    </div>

                    {/* Section 1: استكشف المدينة */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-ocean-700/60 dark:text-white/50 px-1">استكشف المدينة</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => navigateAndClose('home')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Home className="w-4 h-4 text-ocean-700 dark:text-sand-400" />
                          <span>الرئيسية</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('explore')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <BookOpen className="w-4 h-4 text-sand-500" />
                          <span>تاريخ بورسعيد</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('memories')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Camera className="w-4 h-4 text-teal2-600" />
                          <span>الذكريات</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('map')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <MapPin className="w-4 h-4 text-rose-500" />
                          <span>الخريطة</span>
                        </button>
                      </div>
                    </div>

                    {/* Section 2: الخدمات والإقامة */}
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-black text-ocean-700/60 dark:text-white/50 px-1">الخدمات والإقامة</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => navigateAndClose('hotels')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Hotel className="w-4 h-4 text-blue-600" />
                          <span>الفنادق</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('bus')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Bus className="w-4 h-4 text-ocean-700 dark:text-sand-300" />
                          <span>المواصلات</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('housing')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Bed className="w-4 h-4 text-amber-600" />
                          <span>السكن</span>
                        </button>

                        <button
                          onClick={() => navigateAndClose('clothes')}
                          type="button"
                          className="flex items-center gap-2 p-2 rounded-xl bg-sand-50 dark:bg-[#162738] text-xs font-bold hover:bg-sand-100"
                        >
                          <Shirt className="w-4 h-4 text-indigo-600" />
                          <span>الملابس</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick feedback action */}
                    <div className="pt-2 border-t border-sand-200 dark:border-[#1d2d3e] flex items-center justify-between">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenFeedback();
                        }}
                        type="button"
                        className="text-xs font-bold text-teal2-700 dark:text-teal2-400 flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>عندك اقتراح؟ شاركنا</span>
                      </button>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenPoints();
                        }}
                        type="button"
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>نقاطي: {user?.points ?? 0}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </nav>
    </motion.header>
  );
};
