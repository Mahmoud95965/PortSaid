'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Star,
  Moon,
  Sun,
  User as UserIcon,
  Share2,
  MessageSquare,
  Shield,
  Store,
  LogOut,
  IdCard,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMerchant = user?.role === 'merchant';

  const navLinks = [
    { key: 'home', label: 'الرئيسية', icon: Home },
    { key: 'hotels', label: 'الفنادق', icon: Hotel },
    { key: 'explore', label: 'تاريخ بورسعيد', icon: Compass },
    { key: 'memories', label: 'الذكريات', icon: Camera },
    { key: 'bus', label: 'المواصلات', icon: Bus },
    { key: 'housing', label: 'السكن', icon: Bed },
    { key: 'clothes', label: 'الملابس', icon: Shirt },
    { key: 'map', label: 'الخريطة', icon: MapPin },
    { key: 'ai', label: 'الذكاء الاصطناعي ✦', icon: Sparkles },
  ];

  const menuVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: -10,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -5,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  const menuItemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.header
      className={`sticky top-0 z-40 text-white shadow-lg backdrop-blur-md transition-colors duration-300 border-b border-white/10 ${
        isMerchant
          ? 'bg-gradient-to-r from-[#2c1d58]/95 via-[#4a1d6e]/95 to-[#8c3d1b]/95'
          : 'bg-[#061a3d]/95 dark:bg-[#051122]/95 waves-pattern'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <nav className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Link */}
        <motion.div
          onClick={() => onNavigate('home')}
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

        {/* Center Desktop Navigation Links */}
        {!isMerchant && (
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-white/85 hover:text-white hover:bg-white/15 transition"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.08 }}
                  whileHover={{
                    y: -2,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4 text-sand-400" />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Center Quick Actions (Tablet & Desktop) */}
        {!isMerchant && (
          <div className="hidden md:flex lg:hidden items-center gap-2">
            <motion.button
              onClick={onOpenPoints}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-sand-400 text-ocean-900 shadow hover:bg-sand-200 transition"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>نقاطي ومكافآتي</span>
            </motion.button>
            <motion.button
              onClick={onOpenFeedback}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs bg-white/15 border border-white/20 text-white hover:bg-white/25 transition"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal2-400" />
              <span>اقتراحات</span>
            </motion.button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Points Badge */}
          {!isMerchant && (
            <motion.button
              onClick={onOpenPoints}
              type="button"
              aria-label="عرض تفاصيل رصيد النقاط والمكافآت"
              title="رصيدك من النقاط - اضغط لعرض التفاصيل الكاملة وكيفية استخدامها"
              className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-black text-xs sm:text-sm transition cursor-pointer select-none"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
              <motion.div
                animate={{ rotate: [0, 20, -20, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sand-400 fill-sand-400 shrink-0" />
              </motion.div>
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
          <div className="relative" ref={menuRef}>
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
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
              {menuOpen && (
                <motion.div
                  className="absolute left-0 top-12 sm:top-14 z-50 w-72 sm:w-80 bg-white dark:bg-[#121c29] text-ocean-900 dark:text-white rounded-3xl shadow-2xl p-4 border border-sand-200 dark:border-[#223246]"
                  variants={menuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div
                    className="flex items-center gap-3 pb-3 border-b border-sand-200 dark:border-[#223246]"
                    variants={menuItemVariants}
                  >
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
                  </motion.div>

                  <div className="mt-3 space-y-1.5">
                    {/* 1. الملف الشخصي */}
                    <motion.div variants={menuItemVariants}>
                      <button
                        onClick={() => {
                          onNavigate('account');
                          setMenuOpen(false);
                        }}
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
                    </motion.div>

                    {/* 2. الإعدادات */}
                    <motion.div variants={menuItemVariants}>
                      <button
                        onClick={() => {
                          onNavigate('account');
                          setMenuOpen(false);
                        }}
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
                    </motion.div>

                    {/* لوحة التحكم للمالك والمشرف */}
                    {(user?.role === 'admin' || user?.role === 'owner') && (
                      <motion.div variants={menuItemVariants}>
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
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
                      </motion.div>
                    )}

                    {/* 3. تسجيل الخروج */}
                    <motion.div variants={menuItemVariants}>
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition border border-red-200/60 dark:border-red-900/30"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </motion.header>
  );
};
