'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  Coffee,
  Search,
  MapPin,
  Sparkles,
  Tag,
  Heart,
  ChevronDown,
  Navigation,
  Compass,
  SlidersHorizontal,
  X,
  ExternalLink,
  Waves,
  BookOpen,
  Percent,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';

export interface CafesViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
  onRequestCoupon?: (place: Place) => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

// ربط الكافيهات بالصور الأصلية المتوفرة في أصول المشروع الحقيقية
const CAFE_PHOTOS: Record<string, string> = {
  // كافيه المنارة
  '20000000-0000-0000-0000-000000000003': '/assets/port-said/port-said-lighthouse.webp',
  // كافيه سيالنترو
  '20000000-0000-0000-0000-000000000007': '/assets/port-said/gallery/balconies-street.webp',
  // كافيه جيانو
  '20000000-0000-0000-0000-000000000010': '/assets/port-said/gallery/balconies-street.webp',
  // كافيه القبة
  '20000000-0000-0000-0000-000000000012': '/assets/port-said/hero-01.webp',
  // Billy's Coffee
  '20000000-0000-0000-0000-000000000015': '/assets/port-said/gallery/balconies-street.webp',
  // Central Perk
  '20000000-0000-0000-0000-000000000016': '/assets/port-said/hero-01.webp',
  // Taby's Cafe
  '20000000-0000-0000-0000-000000000023': '/assets/port-said/gallery/balconies-street.webp',
  // Coffeeshop Company
  '20000000-0000-0000-0000-000000000025': '/assets/port-said/hero-01.webp',
  // Espresso Rankers
  '20000000-0000-0000-0000-000000000026': '/assets/port-said/hero-02.webp',
  // Mad Cup Cafe
  '20000000-0000-0000-0000-000000000027': '/assets/port-said/gallery/balconies-street.webp',
  // Despacito Cafe
  '20000000-0000-0000-0000-000000000150': '/assets/port-said/hero-02.webp',
  // Elmatrah Cafe
  '20000000-0000-0000-0000-000000000154': '/assets/port-said/hero-01.webp',
  // La Vie Cafe
  '20000000-0000-0000-0000-000000000155': '/assets/port-said/hero-02.webp',
  // Marino Cafe
  '20000000-0000-0000-0000-000000000196': '/assets/port-said/hero-02.webp',
  // مطعم وكافيه كاستن
  '20000000-0000-0000-0000-000000000001': '/assets/port-said/hero-02.webp',
  // كافيه ومطعم الشاطئ
  '20000000-0000-0000-0000-000000000004': '/assets/port-said/hero-02.webp',
};

function getCafePhoto(place: Place): string {
  if (CAFE_PHOTOS[place.id]) {
    return CAFE_PHOTOS[place.id];
  }
  const area = (place.a || '').toLowerCase();
  const name = (place.n || '').toLowerCase();
  const desc = (place.ds || '').toLowerCase();

  if (area.includes('طرح البحر') || name.includes('شاطئ') || desc.includes('شاطئ')) {
    return '/assets/port-said/hero-02.webp';
  }
  if (area.includes('الممشى السياحي') || name.includes('قناة') || desc.includes('قناة')) {
    return '/assets/port-said/hero-01.webp';
  }
  if (area.includes('بورفؤاد')) {
    return '/assets/port-said/gallery/ship.webp';
  }
  if (name.includes('فنار') || desc.includes('فنار')) {
    return '/assets/port-said/port-said-lighthouse.webp';
  }
  return '/assets/port-said/gallery/balconies-street.webp';
}

// تصنيفات التجربة والمزاج
const MOOD_FILTERS = [
  { key: 'all', label: 'جميع الكافيهات', icon: '☕' },
  { key: 'sea', label: 'إطلالة بحرية وقناة السويس', icon: '🌊' },
  { key: 'study', label: 'هدوء ومذاكرة ولابتوب', icon: '📚' },
  { key: 'offers', label: 'عروض وخصومات حصرية', icon: '🏷️' },
];

export const CafesView: React.FC<CafesViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onNavigate,
  onBack,
  onRequestCoupon,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'discount' | 'points' | 'name'>('featured');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination: التحميل التدريجي للأماكن (8 في البداية)
  const [visibleCount, setVisibleCount] = useState<number>(8);

  // مزامنة واسترجاع المفضلة
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
      fetch('/api/user/favorites')
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.favorites && res.favorites.length > 0) {
            setFavorites((prev) => {
              const merged = Array.from(new Set([...prev, ...res.favorites]));
              localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    try {
      let updated: string[];
      let isAdded = false;
      if (favorites.includes(id)) {
        updated = favorites.filter((favId) => favId !== id);
      } else {
        updated = [...favorites, id];
        isAdded = true;
      }
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));

      // تزامن مع Supabase
      fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: id, action: isAdded ? 'add' : 'remove' }),
      }).catch(() => {});

      setToastMessage(isAdded ? `تمت إضافة «${name}» إلى مفضلتك ❤️` : `تمت إزالة «${name}» من مفضلتك`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {}
  };

  // استخراج كافة الكافيهات المعتمدة (48 كافيه رسمي + أماكن الكافيهات المدمجة)
  const allCafes = useMemo(() => {
    return places.filter((p) => {
      const isCatCafe = p.cat === 'cafe';
      const name = (p.n || '').toLowerCase();
      const isNamedCafe = name.includes('كافيه') || name.includes('cafe') || name.includes('مقهى') || name.includes('coffee');
      return isCatCafe || isNamedCafe;
    });
  }, [places]);

  // قائمة المناطق الفعلية المستخرجة من بيانات الكافيهات
  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    allCafes.forEach((c) => {
      if (c.a) areas.add(c.a.trim());
    });
    return Array.from(areas);
  }, [allCafes]);

  // فلترة وترتيب الكافيهات بناءً على المدخلات
  const filteredCafes = useMemo(() => {
    let result = [...allCafes];

    // 1. فلتر البحث النصي بالاسم أو الحي أو الوصف
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.n.toLowerCase().includes(q) ||
          c.a.toLowerCase().includes(q) ||
          (c.ds && c.ds.toLowerCase().includes(q))
      );
    }

    // 2. فلتر المزاج والتجربة
    if (selectedMood === 'sea') {
      result = result.filter((c) => {
        const area = (c.a || '').toLowerCase();
        const desc = (c.ds || '').toLowerCase();
        const name = (c.n || '').toLowerCase();
        return (
          area.includes('طرح البحر') ||
          area.includes('الممشى السياحي') ||
          desc.includes('بحر') ||
          desc.includes('قناة') ||
          desc.includes('ممشى') ||
          name.includes('شاطئ') ||
          name.includes('كاستن')
        );
      });
    } else if (selectedMood === 'study') {
      result = result.filter((c) => {
        const area = (c.a || '').toLowerCase();
        const desc = (c.ds || '').toLowerCase();
        const name = (c.n || '').toLowerCase();
        return (
          area.includes('الجامعة') ||
          area.includes('بورفؤاد') ||
          desc.includes('مذاكرة') ||
          desc.includes('دراسة') ||
          desc.includes('هادئ') ||
          desc.includes('أجواء') ||
          name.includes('company') ||
          name.includes('perk') ||
          name.includes('billy')
        );
      });
    } else if (selectedMood === 'offers') {
      result = result.filter((c) => c.disc > 0 || (c.cost && c.cost > 0));
    }

    // 3. فلتر المنطقة
    if (selectedArea !== 'all') {
      result = result.filter((c) => c.a === selectedArea);
    }

    // 4. الترتيب
    if (sortBy === 'discount') {
      result.sort((a, b) => (b.disc || 0) - (a.disc || 0));
    } else if (sortBy === 'points') {
      result.sort((a, b) => (b.p || 0) - (a.p || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.n.localeCompare(b.n, 'ar'));
    }

    return result;
  }, [allCafes, searchTerm, selectedMood, selectedArea, sortBy]);

  // قائمة الكافيهات المعروضة في الشاشة الحالية وفق عدد الصفحة
  const displayedCafes = useMemo(() => {
    return filteredCafes.slice(0, visibleCount);
  }, [filteredCafes, visibleCount]);

  const hasMore = visibleCount < filteredCafes.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 8);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedMood('all');
    setSelectedArea('all');
    setSortBy('featured');
    setVisibleCount(8);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 text-right" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[90%] z-50 rounded-2xl bg-slate-900 text-white px-5 py-3 font-bold shadow-2xl text-xs sm:text-sm border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header & Hero Section */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-blue-900/20 border border-blue-500/20">
        {/* Ambient Light Accent */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-black text-cyan-200">
            <Coffee className="w-4 h-4 text-cyan-300" />
            <span>كافيهات ومقاهي بورسعيد المعتمدة</span>
          </div>

          <h1 className="text-2xl min-[400px]:text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            كافيهات بورسعيد
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-2xl">
            دليلك لأرقى مقاهي وكافيهات بورسعيد وبورفؤاد: إطلالات ساحرة على مجرى قناة السويس والبحر، قعدات مذاكرة ودراسة هادئة، وأجواء مميزة مع عروض وخصومات حصرية.
          </p>

          {/* Quick Stats Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-white/90">
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              ☕ {allCafes.length} كافيه معتمد
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              🌊 إطلالات البحر وقناة السويس
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              🏷️ خصومات حصرية وكوبونات
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              ✨ نقاط حضور بالـ GPS
            </span>
          </div>
        </div>
      </header>

      {/* 2. Search & Controls */}
      <section className="space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(8);
            }}
            placeholder="ابحث باسم الكافيه، القهوة، أو الحي في بورسعيد..."
            className="w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm sm:text-base font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 hover:text-slate-700 transition"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Experience / Mood Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MOOD_FILTERS.map((f) => {
              const isActive = selectedMood === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setSelectedMood(f.key);
                    setVisibleCount(8);
                  }}
                  className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Bar: Area Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Areas Scrollable Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
            <span className="text-xs font-bold text-slate-500 shrink-0 ml-1">
              المنطقة:
            </span>
            <button
              onClick={() => {
                setSelectedArea('all');
                setVisibleCount(8);
              }}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedArea === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              الكل ({allCafes.length})
            </button>
            {availableAreas.map((area) => {
              const isSelected = selectedArea === area;
              const count = allCafes.filter((c) => c.a === area).length;
              return (
                <button
                  key={area}
                  onClick={() => {
                    setSelectedArea(area);
                    setVisibleCount(8);
                  }}
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {area} ({count})
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">الترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="featured">المقترحة أولاً</option>
              <option value="discount">الأعلى خصماً</option>
              <option value="points">الأكثر نقاطاً</option>
              <option value="name">الاسم أبجدياً</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
          <span>
            يتم عرض {displayedCafes.length} من أصل {filteredCafes.length} كافيه
          </span>
          {(searchTerm || selectedMood !== 'all' || selectedArea !== 'all' || sortBy !== 'featured') && (
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Cafe Cards Grid */}
      {displayedCafes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {displayedCafes.map((cafe, index) => {
            const isFav = favorites.includes(cafe.id);
            const photoUrl = getCafePhoto(cafe);

            return (
              <motion.article
                key={cafe.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                onClick={() => onSelectPlace && onSelectPlace(cafe.id)}
                className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Photo & Badges Container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={photoUrl}
                      alt={cafe.n}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                    {/* Area Badge (Top Right) */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-black border border-white/20 shadow-sm">
                        <MapPin className="w-3 h-3 text-cyan-300" />
                        <span>{cafe.a}</span>
                      </span>
                    </div>

                    {/* Favorite Button (Top Left) */}
                    <button
                      onClick={(e) => toggleFavorite(e, cafe.id, cafe.n)}
                      className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md grid place-items-center shadow-md hover:scale-110 active:scale-95 transition"
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      />
                    </button>

                    {/* Bottom Badges on Photo */}
                    <div className="absolute bottom-2.5 right-3 left-3 z-10 flex items-center justify-between text-xs font-bold text-white">
                      {/* Visit Points Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600/90 backdrop-blur-sm text-[10px] font-black">
                        <span>+{cafe.p || 20} نقطة</span>
                      </span>

                      {/* Discount Badge */}
                      {cafe.disc > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600/95 backdrop-blur-sm text-[11px] font-black text-white shadow-sm">
                          <Percent className="w-3 h-3" />
                          <span>خصم {cafe.disc}%</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cafe.n}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                      {cafe.ds || 'كافيه ومقهى متميز بأجواء مريحة ومشروبات متنوعة في بورسعيد.'}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlace && onSelectPlace(cafe.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition text-center font-black flex items-center justify-center gap-1"
                    >
                      <span>التفاصيل</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>

                    {/* Map Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('map', cafe.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition text-center font-bold flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>الخريطة</span>
                    </button>
                  </div>

                  {/* Additional Actions (AI Planner + Google Maps) */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('planner', `خروجة كافيه ${cafe.n} في ${cafe.a}`);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>خطط خروجة هنا</span>
                      </button>
                    )}

                    {cafe.maps_url && (
                      <a
                        href={cafe.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition flex items-center gap-1 ml-auto"
                        title="فتح في Google Maps"
                      >
                        <span>Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto grid place-items-center">
            <Coffee className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              لم نجد كافيهات مطابقة لبحثك
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              جرب تغيير كلمة البحث أو اختيار منطقة أخرى للوصول إلى الكافيه المطلوب.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition"
          >
            إعادة ضبط خيارات البحث
          </button>
        </div>
      )}

      {/* 4. Load More Button (عرض المزيد من الكافيهات) */}
      {hasMore && (
        <div className="text-center pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLoadMore}
            className="px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:border-blue-500 font-black text-sm sm:text-base shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 mx-auto"
          >
            <ChevronDown className="w-4 h-4 animate-bounce" />
            <span>
              عرض المزيد من الكافيهات ({filteredCafes.length - visibleCount} متبقية)
            </span>
          </motion.button>
        </div>
      )}

      {/* 5. Gateways & Discovery Cards (Bottom Section) */}
      <section className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Gateway 1: Interactive Map for Cafes */}
        <div
          onClick={() => onNavigate && onNavigate('map')}
          className="p-5 rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white border border-blue-500/20 shadow-lg cursor-pointer hover:border-blue-400 transition space-y-2.5"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-cyan-300 grid place-items-center">
            <Navigation className="w-5 h-5" />
          </div>
          <h4 className="font-black text-base sm:text-lg">
            خريطة كافيهات بورسعيد التفاعلية
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            تصفح مواقع الكافيهات والمقاهي على الخريطة المباشرة واعرف الأقرب لموقعك بالكيلومتر ومسارات السير والتاكسي.
          </p>
          <div className="pt-1 text-xs font-black text-cyan-300 flex items-center gap-1">
            <span>استكشف الخريطة الآن</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </div>
        </div>

        {/* Gateway 2: AI Assistant & Outing Planner */}
        <div
          onClick={() => onNavigate && onNavigate('ai', 'عايز كافيهات هادية قريبة من البحر للمذاكرة')}
          className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white border border-slate-700/60 shadow-lg cursor-pointer hover:border-blue-400 transition space-y-2.5"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-300 grid place-items-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h4 className="font-black text-base sm:text-lg">
            مساعد بورسعيد الذكي لاختيار الكافيه
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            اطلب من المساعد الذكي ترشيح كافيه يناسب ميزانيتك، دراستك، أو قعدة رايقة مع أصحابك بالأسعار والتفاصيل.
          </p>
          <div className="pt-1 text-xs font-black text-cyan-300 flex items-center gap-1">
            <span>اسأل المساعد الذكي الآن</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </div>
        </div>
      </section>
    </div>
  );
};
