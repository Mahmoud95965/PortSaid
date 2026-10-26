'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  Bed,
  MapPin,
  Search,
  X,
  Compass,
  Star,
  ExternalLink,
  Heart,
  SlidersHorizontal,
  Info,
  ArrowRight,
  Sparkles,
  Building,
  RotateCcw,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Palmtree,
  Hotel,
  Users,
} from 'lucide-react';

const FAVORITES_KEY = 'ps_user_favorites';

interface HousingViewProps {
  places?: Place[];
  onSelectPlace: (placeId: string) => void;
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onRequestCoupon?: (place: Place) => void;
}

// تعيين الصور الواقعية المحلية لأماكن الإقامة ببورسعيد
export function getHousingPhoto(placeName: string, area: string): string {
  const n = (placeName || '').toLowerCase();
  const a = (area || '').toLowerCase();

  if (n.includes('porto said') || n.includes('بورتو')) {
    return '/assets/port-said/hero-01.webp';
  }
  if (n.includes('grand albatros') || n.includes('الباتروس') || a.includes('طرح البحر')) {
    return '/assets/port-said/hero-03.webp';
  }
  if (n.includes('helnan') || n.includes('هلنان') || a.includes('بورفؤاد')) {
    return '/assets/port-said/port-said-port-night.webp';
  }
  if (n.includes('marom') || n.includes('ماروم') || n.includes('poste') || n.includes('بوست')) {
    return '/assets/port-said/port-said-lighthouse.webp';
  }
  if (n.includes('palma') || n.includes('بالما') || n.includes('hotel port said')) {
    return '/assets/port-said/balconies-street.webp';
  }
  if (n.includes('شباب') || n.includes('youth')) {
    return '/assets/port-said/martyrs-square.webp';
  }
  if (n.includes('بدر') || a.includes('الزهور')) {
    return '/assets/port-said/hero-02.webp';
  }
  return '/assets/port-said/hero-02.webp';
}

// تصنيف أنواع الإقامة بناءً على البيانات الواقعية
export type AccommodationType = 'all' | 'resort' | 'city' | 'hostel';

export function getAccommodationType(placeName: string): {
  type: 'resort' | 'city' | 'hostel';
  label: string;
  badgeBg: string;
} {
  const n = (placeName || '').toLowerCase();
  if (
    n.includes('resort') ||
    n.includes('spa') ||
    n.includes('albatros') ||
    n.includes('helnan') ||
    n.includes('marom') ||
    n.includes('porto')
  ) {
    return {
      type: 'resort',
      label: 'منتجع وفندق ساحلي',
      badgeBg: 'bg-blue-600 text-white',
    };
  }
  if (n.includes('شباب') || n.includes('hostel')) {
    return {
      type: 'hostel',
      label: 'بيت شباب وسكن اقتصادي',
      badgeBg: 'bg-emerald-600 text-white',
    };
  }
  return {
    type: 'city',
    label: 'فندق وسياحة داخلية',
    badgeBg: 'bg-indigo-600 text-white',
  };
}

export const HousingView: React.FC<HousingViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onBack,
  onNavigate,
}) => {
  // حالات البحث والتصفية
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AccommodationType>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'points' | 'name'>('featured');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // استرجاع وتزامن المفضلة
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

  // استخراج كافة أماكن الإقامة المعتمدة
  const allHousing = useMemo(() => {
    return places.filter((p) => p.cat === 'housing');
  }, [places]);

  // استخراج الأحياء المتوفرة فعلياً في بيانات السكن
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    allHousing.forEach((p) => {
      if (p.a) set.add(p.a.trim());
    });
    return Array.from(set);
  }, [allHousing]);

  // تصنيفات الإقامة الثلاثة المعتمدة
  const ACCOMMODATION_TYPES = [
    { key: 'all', label: 'جميع أماكن الإقامة', icon: Building, count: allHousing.length },
    {
      key: 'resort',
      label: 'منتجعات وفنادق ساحلية',
      icon: Palmtree,
      count: allHousing.filter((p) => getAccommodationType(p.n).type === 'resort').length,
    },
    {
      key: 'city',
      label: 'فنادق وسط المدينة',
      icon: Hotel,
      count: allHousing.filter((p) => getAccommodationType(p.n).type === 'city').length,
    },
    {
      key: 'hostel',
      label: 'بيوت شباب وسكن اقتصادي',
      icon: Users,
      count: allHousing.filter((p) => getAccommodationType(p.n).type === 'hostel').length,
    },
  ];

  // تصفية وترتيب أماكن الإقامة بناءً على اختيارات المستخدم
  const filteredHousing = useMemo(() => {
    return allHousing
      .filter((place) => {
        // فلتر البحث النصي (الاسم، الحي، الوصف)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (place.n || '').toLowerCase().includes(q);
          const matchArea = (place.a || '').toLowerCase().includes(q);
          const matchDesc = (place.ds || '').toLowerCase().includes(q);
          if (!matchName && !matchArea && !matchDesc) return false;
        }

        // فلتر نوع الإقامة
        if (selectedType !== 'all') {
          const info = getAccommodationType(place.n);
          if (info.type !== selectedType) return false;
        }

        // فلتر المنطقة / الحي
        if (selectedArea !== 'all') {
          if (!place.a || !place.a.includes(selectedArea)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'points') return (b.p || 0) - (a.p || 0);
        if (sortBy === 'name') return a.n.localeCompare(b.n, 'ar');
        // الافتراضي (الأكثر تميزاً: يضع المنتجعات والفنادق الكبرى في المقدمة)
        return (b.p || 0) - (a.p || 0);
      });
  }, [allHousing, searchQuery, selectedType, selectedArea, sortBy]);

  // إعادة ضبط كافة الفلاتر
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedArea('all');
    setSortBy('featured');
  };

  const isFiltered = searchQuery !== '' || selectedType !== 'all' || selectedArea !== 'all' || sortBy !== 'featured';

  return (
    <motion.div
      className="space-y-6 max-w-6xl mx-auto pb-16"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ocean-950/90 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md flex items-center gap-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. زر الرجوع والشارة الترحيبية */}
      <div className="flex items-center justify-between">
        <motion.button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-blue-600 transition group"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          <span>الرئيسية</span>
        </motion.button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>أماكن إقامة وفنادق معتمدة</span>
        </span>
      </div>

      {/* 2. الهيدر والمقدمة البصرية */}
      <div className="bg-gradient-to-br from-white via-sand-50/60 to-blue-50/30 dark:from-[#0d1825] dark:via-[#09131f] dark:to-[#0c1f36] p-6 sm:p-8 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ocean-900 dark:text-white flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-md shrink-0">
                <Bed className="w-6 h-6" />
              </span>
              <span>دور على سكنك في بورسعيد</span>
            </h1>
            <p className="text-sm sm:text-base text-ocean-700/80 dark:text-ocean-100/70 font-semibold leading-relaxed max-w-2xl">
              دليلك الشامل لاكتشاف خيارات الإقامة وأماكن السكن المعتمدة في بورسعيد وبورفؤاد، من الفنادق والمنتجعات الساحلية إلى بيوت الضيافة وسكن الشباب.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-blue-600 dark:text-blue-400">{allHousing.length}</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">أماكن إقامة</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400">{availableAreas.length}</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">أحياء ومناطق</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#132233] border border-sand-200 dark:border-[#22354a] text-center shadow-xs">
              <span className="block text-xl font-black text-amber-600 dark:text-amber-400">100%</span>
              <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">إحداثيات مؤكدة</span>
            </div>
          </div>
        </div>

        {/* شريط البحث المباشر */}
        <div className="mt-6 relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الفندق، المنتجع، أو المنطقة (مثال: بورتو، هلنان، حي الشرق)..."
              className="w-full pl-10 pr-12 py-3.5 rounded-2xl border border-sand-300 dark:border-[#22354a] bg-white dark:bg-[#101c2b] text-sm font-bold text-ocean-900 dark:text-white placeholder:text-ocean-700/40 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
            />
            <Search className="w-5 h-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sand-200 dark:bg-[#1a2d42] text-ocean-700 dark:text-white/70 grid place-items-center hover:bg-sand-300 transition"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. تصنيفات الإقامة وفلاتر الأحياء والترتيب */}
      <div className="bg-white dark:bg-[#0f1a28] p-4 sm:p-5 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm space-y-4">
        {/* أزرار تصنيفات الإقامة */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {ACCOMMODATION_TYPES.map((t) => {
            const IconComponent = t.icon;
            const isSelected = selectedType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(t.key as AccommodationType)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-sand-50 dark:bg-[#142232] text-ocean-800 dark:text-white/80 border-sand-200 dark:border-[#22354a] hover:border-blue-400'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-sand-200 dark:bg-[#1b2d42] text-ocean-700 dark:text-white/70'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* فلاتر الأحياء والترتيب وزر المسح */}
        <div className="pt-3 border-t border-sand-200/60 dark:border-[#1d2d3e] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* فلتر الأحياء */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ocean-700/80 dark:text-white/70 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>المنطقة:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedArea('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition border ${
                selectedArea === 'all'
                  ? 'bg-ocean-900 text-white border-ocean-900 dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-sand-100 dark:bg-[#152332] text-ocean-700 dark:text-white/70 border-sand-200 dark:border-[#24374c]'
              }`}
            >
              الكل
            </button>

            {availableAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-2.5 py-1 rounded-xl font-bold transition border ${
                  selectedArea === area
                    ? 'bg-ocean-900 text-white border-ocean-900 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-sand-100 dark:bg-[#152332] text-ocean-700 dark:text-white/70 border-sand-200 dark:border-[#24374c]'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* الترتيب وزر مسح الفلاتر */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-ocean-700/80 dark:text-white/70">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>الترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-sand-50 dark:bg-[#142232] border border-sand-200 dark:border-[#22354a] rounded-xl px-2 py-1 text-xs font-bold text-ocean-900 dark:text-white focus:outline-none"
              >
                <option value="featured">الأكثر تميزاً</option>
                <option value="points">الأعلى نقاطاً</option>
                <option value="name">أبجدياً (أ-ي)</option>
              </select>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح الفلاتر</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. عداد النتائج ومعلومات السعر والتوافر */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-ocean-700/70 dark:text-white/60">
        <span className="font-bold">
          عرض <strong className="text-blue-600 dark:text-blue-400 font-black">{filteredHousing.length}</strong> من أصل {allHousing.length} مكان إقامة معتمد
        </span>

        <span className="flex items-center gap-1 text-[11px] text-ocean-700/60 dark:text-white/50">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>الأسعار والتوافر يتم الاستعلام والتنسيق المباشر لها عبر المكان أو خرائط جوجل</span>
        </span>
      </div>

      {/* 5. شبكة بطاقات أماكن الإقامة */}
      {filteredHousing.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHousing.map((place, index) => {
            const photo = getHousingPhoto(place.n, place.a);
            const typeInfo = getAccommodationType(place.n);
            const isFav = favorites.includes(place.id);

            return (
              <motion.div
                key={place.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="bg-white dark:bg-[#0f1a28] rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                {/* رأس البطاقة مع الصورة والشارات */}
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-sand-200 dark:bg-[#121c29]">
                    <img
                      src={photo}
                      alt={place.n}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* شارة نوع الإقامة */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md ${typeInfo.badgeBg}`}>
                        {typeInfo.label}
                      </span>
                    </div>

                    {/* زر المفضلة */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, place.id, place.n)}
                      aria-label="إضافة للمفضلة"
                      className="absolute top-3 left-3 w-9 h-9 rounded-2xl bg-white/90 dark:bg-[#0f1a28]/90 text-ocean-900 dark:text-white grid place-items-center backdrop-blur-md shadow-md hover:scale-110 transition active:scale-95"
                    >
                      <Heart
                        className={`w-4 h-4 transition ${
                          isFav ? 'fill-rose-500 text-rose-500' : 'text-ocean-700/70 dark:text-white/70'
                        }`}
                      />
                    </button>

                    {/* المنطقة والشارات السفلية فوق الصورة */}
                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white text-xs font-bold">
                      <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-xl">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>{place.a}</span>
                      </span>

                      {place.p > 0 && (
                        <span className="flex items-center gap-1 bg-amber-500/90 text-ocean-950 px-2 py-0.5 rounded-lg text-[10px] font-black">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{place.p} نقطة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* محتوى البطاقة */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base sm:text-lg font-black text-ocean-900 dark:text-white line-clamp-1">
                      {place.n}
                    </h3>

                    <p className="text-xs text-ocean-700/80 dark:text-white/70 line-clamp-2 leading-relaxed">
                      {place.ds || 'إقامة مريحة وخدمات فندقية متميزة في موقع حيوي ببورسعيد.'}
                    </p>

                    {/* شريط الإيضاح */}
                    <div className="pt-2 border-t border-sand-200/60 dark:border-[#1d2d3e] flex items-center justify-between text-[11px] text-ocean-700/70 dark:text-white/60">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>موقع مسجل ومعتمد</span>
                      </span>

                      {place.disc > 0 && (
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                          خصم {place.disc}% لحاملي البطاقة
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="p-5 pt-0 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place.id)}
                    className="col-span-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition text-center shadow-xs"
                  >
                    عرض التفاصيل
                  </button>

                  {place.maps_url ? (
                    <a
                      href={place.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 rounded-xl bg-sand-100 hover:bg-sand-200 dark:bg-[#1a2d42] dark:hover:bg-[#233b56] text-ocean-700 dark:text-white/80 font-bold text-xs transition flex items-center justify-center gap-1 border border-sand-200 dark:border-[#24374c]"
                      aria-label="الموقع على Google Maps"
                    >
                      <span>الخريطة</span>
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate('map', place.id)}
                      className="py-2.5 rounded-xl bg-sand-100 hover:bg-sand-200 dark:bg-[#1a2d42] dark:hover:bg-[#233b56] text-ocean-700 dark:text-white/80 font-bold text-xs transition flex items-center justify-center gap-1 border border-sand-200 dark:border-[#24374c]"
                    >
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>الموقع</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* الحالة الفارغة عند عدم العثور على نتائج */
        <div className="text-center py-16 bg-white dark:bg-[#0f1a28] rounded-3xl border border-dashed border-sand-300 dark:border-[#203042] p-8 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-sand-100 dark:bg-[#182638] text-ocean-700 dark:text-white/70 grid place-items-center mx-auto text-2xl">
            🏨
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-ocean-900 dark:text-white">لم نجد أماكن إقامة تطابق بحثك</h3>
            <p className="text-xs text-ocean-700/70 dark:text-white/60 max-w-md mx-auto leading-relaxed">
              جرّب تغيير كلمات البحث أو مسح الفلاتر المختارة لعرض جميع خيارات الإقامة المعتمدة في بورسعيد.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
          >
            مسح خيارات البحث والفلاتر
          </button>
        </div>
      )}

      {/* 6. البوابات السفلية: استعراض الخريطة ومخطط الرحلات الذكي */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => onNavigate && onNavigate('map')}
          className="p-5 rounded-3xl bg-white dark:bg-[#0f1a28] border border-sand-200/80 dark:border-[#1d2d3e] shadow-xs cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-ocean-900 dark:text-white group-hover:text-blue-600 transition">
                الخريطة التفاعلية لأماكن السكن
              </h4>
              <p className="text-[11px] text-ocean-700/70 dark:text-white/60">
                استكشف مواقع الفنادق والمنتجعات جغرافياً على خريطة بورسعيد
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ocean-700/50 group-hover:text-blue-600 group-hover:-translate-x-1 transition" />
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => onNavigate && onNavigate('planner', 'أماكن إقامة وفنادق في بورسعيد')}
          className="p-5 rounded-3xl bg-white dark:bg-[#0f1a28] border border-sand-200/80 dark:border-[#1d2d3e] shadow-xs cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-ocean-900 dark:text-white group-hover:text-amber-600 transition">
                مخطط الإقامة والجولات الذكي
              </h4>
              <p className="text-[11px] text-ocean-700/70 dark:text-white/60">
                دع الذكاء الاصطناعي يرتب لك برنامج إقامة وزيارات متكاملاً
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ocean-700/50 group-hover:text-amber-600 group-hover:-translate-x-1 transition" />
        </motion.div>
      </div>
    </motion.div>
  );
};
