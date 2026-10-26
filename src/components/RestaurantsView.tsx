'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import { PLACES_METADATA } from '@/lib/plannerUtils';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Utensils,
  X,
  Map,
  Clock,
  Heart,
  ChevronLeft,
  Tag,
  DollarSign,
  QrCode,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface RestaurantsViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
  onRequestCoupon?: (place: Place) => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

// ربط المطاعم بالصور الأصلية الحقيقية المتوفرة في المشروع
const RESTAURANT_PHOTOS: Record<string, string> = {
  // مطعم كاستن للأسماك
  '11111111-1111-1111-1111-111111111104': '/assets/port-said/hero-02.webp',
  // مطعم ومأكولات الجندي البحرية
  '11111111-1111-1111-1111-111111111105': '/assets/port-said/hero-03.webp',
  // سوق السمك الحضاري الجديد
  '11111111-1111-1111-1111-111111111108': '/assets/port-said/gallery/balconies-street.webp',
};

function getRestaurantPhoto(place: Place): string {
  if (RESTAURANT_PHOTOS[place.id]) {
    return RESTAURANT_PHOTOS[place.id];
  }
  const name = (place.n || '').toLowerCase();
  const desc = (place.ds || '').toLowerCase();

  if (name.includes('كاستن')) return '/assets/port-said/hero-02.webp';
  if (name.includes('جندي')) return '/assets/port-said/hero-03.webp';
  if (name.includes('سمك') || desc.includes('سمك')) return '/assets/port-said/hero-02.webp';
  if (name.includes('بحر') || desc.includes('بحري')) return '/assets/port-said/hero-03.webp';
  return '/assets/port-said/hero-02.webp';
}

// تصنيفات فلاتر المطاعم المبنية على البيانات الفعلية
const FOOD_CATEGORIES = [
  { key: 'all', label: 'جميع المطاعم', icon: '🍽️' },
  { key: 'seafood', label: 'أسماك وسي فود طازج', icon: '🐟' },
  { key: 'casual', label: 'مأكولات شعبية وبلدي', icon: '🦐' },
  { key: 'offers', label: 'عروض وكوبونات خصم', icon: '🏷️' },
];

export const RestaurantsView: React.FC<RestaurantsViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onNavigate,
  onBack,
  onRequestCoupon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'discount' | 'points' | 'cost_asc'>('default');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // تحميل المفضلة من التخزين المحلي
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {}
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

      if (isAdded) {
        confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
        showToast(`تمت إضافة "${name}" إلى المفضلة ❤️`);
      } else {
        showToast(`تمت إزالة "${name}" من المفضلة`);
      }
    } catch (e) {}
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // حصر المطاعم الحقيقية (المصنفة food أو المرتبطة بتقديم المأكولات)
  const restaurantPlaces = useMemo(() => {
    return places.filter(
      (p) => p.cat === 'food' || (p.cat === 'shop' && p.n.includes('سمك'))
    );
  }, [places]);

  // استخراج قائمة الأحياء المتوفرة فعلياً في المطاعم
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    restaurantPlaces.forEach((p) => {
      if (p.a) set.add(p.a.trim());
    });
    return Array.from(set);
  }, [restaurantPlaces]);

  // فلترة وترتيب المطاعم
  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const result = restaurantPlaces.filter((place) => {
      // 1. فلتر المنطقة
      if (selectedArea !== 'all' && place.a !== selectedArea) {
        return false;
      }

      // 2. فلتر التصنيف الفرعي
      if (selectedCategory !== 'all') {
        const name = place.n.toLowerCase();
        const desc = (place.ds || '').toLowerCase();

        if (selectedCategory === 'seafood') {
          const isSeafood = name.includes('سمك') || name.includes('كاستن') || desc.includes('بحري') || desc.includes('أسماك');
          if (!isSeafood) return false;
        } else if (selectedCategory === 'casual') {
          const isCasual = name.includes('جندي') || desc.includes('بلدي') || desc.includes('شعب') || desc.includes('طلبة');
          if (!isCasual) return false;
        } else if (selectedCategory === 'offers') {
          if (!place.disc || place.disc <= 0) return false;
        }
      }

      // 3. فلتر البحث النصي
      if (!q) return true;

      const nameMatch = place.n.toLowerCase().includes(q);
      const areaMatch = place.a.toLowerCase().includes(q);
      const descMatch = (place.ds || '').toLowerCase().includes(q);

      return nameMatch || areaMatch || descMatch;
    });

    // 4. الترتيب
    return result.sort((a, b) => {
      if (sortBy === 'discount') {
        return (b.disc || 0) - (a.disc || 0);
      }
      if (sortBy === 'points') {
        return (b.p || 0) - (a.p || 0);
      }
      if (sortBy === 'cost_asc') {
        const metaA = PLACES_METADATA[a.id]?.estimatedCostPerPerson || a.cost || 999;
        const metaB = PLACES_METADATA[b.id]?.estimatedCostPerPerson || b.cost || 999;
        return metaA - metaB;
      }
      return 0;
    });
  }, [restaurantPlaces, searchQuery, selectedCategory, selectedArea, sortBy]);

  const handleOpenPlace = (id: string) => {
    if (onSelectPlace) {
      onSelectPlace(id);
    } else if (onNavigate) {
      onNavigate('place', id);
    }
  };

  const handleOpenMap = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('map', id);
    } else {
      window.location.href = `/map?place=${id}`;
    }
  };

  const handlePlanWithAI = (e: React.MouseEvent, placeName: string) => {
    e.stopPropagation();
    const prompt = `عايز اتغدى في ${placeName} في بورسعيد وخطط لي خروجة متكاملة حواليه`;
    if (onNavigate) {
      onNavigate('ai', prompt);
    } else {
      window.location.href = `/ai?q=${encodeURIComponent(prompt)}`;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-ocean-950 text-white px-4 py-2 rounded-2xl shadow-xl text-xs sm:text-sm font-bold border border-white/10"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-ocean-900 dark:hover:text-white transition group py-1"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span>رجوع للرئيسية</span>
          </button>
        </div>
      )}

      {/* Visual Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1d2d3e] shadow-xs bg-slate-900 text-white aspect-[21/9] sm:aspect-[25/8] max-h-64">
        <img
          src="/assets/port-said/hero-02.webp"
          alt="مطاعم بورسعيد"
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/95 via-ocean-950/50 to-transparent" />

        <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-end text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold w-fit mb-2 backdrop-blur-xs">
            <Utensils className="w-3.5 h-3.5 text-coral-400" />
            <span>دليل المأكولات والمطاعم</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
            مطاعم بورسعيد
          </h1>

          <p className="text-xs sm:text-sm text-white/85 font-medium max-w-xl line-clamp-2 mt-1 leading-relaxed">
            استكشف أشهر مطاعم المأكولات البحرية والأسماك الطازجة في بورسعيد، مع عروض وكوبونات خصم ونقاط مكافأة حصرية.
          </p>
        </div>
      </div>

      {/* Search and Filters Section */}
      <section className="space-y-3.5">
        {/* Search Bar */}
        <div className="relative flex items-center rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition p-1.5">
          <div className="p-2.5 text-slate-400">
            <Search className="w-5 h-5 text-slate-400" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المطعم، الحي، أو نوع الأكل (مثال: كاستن، الجندي، سمك)..."
            className="flex-1 bg-transparent text-ocean-950 dark:text-white text-xs sm:text-sm font-semibold outline-none px-1 placeholder:text-slate-400"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips & Sorting Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {FOOD_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-[#0c1622] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Area & Sort Dropdowns */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs flex-wrap">
            {/* Area Filter */}
            {availableAreas.length > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold hidden min-[400px]:inline">المنطقة:</span>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-ocean-950 dark:text-white text-xs font-bold outline-none cursor-pointer focus:border-blue-600"
                >
                  <option value="all">كل المناطق</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-bold hidden min-[400px]:inline">الترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-ocean-950 dark:text-white text-xs font-bold outline-none cursor-pointer focus:border-blue-600"
              >
                <option value="default">الافتراضي</option>
                <option value="discount">الأعلى خصماً 🏷️</option>
                <option value="points">الأعلى نقاطاً ⭐</option>
                <option value="cost_asc">الأقل تكلفة 💰</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurants Grid Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white">
              {searchQuery ? `نتائج البحث عن: "${searchQuery}"` : 'قائمة المطاعم المعتمدة'}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#152332] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22354a]">
              {filteredRestaurants.length} مطعم
            </span>
          </div>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('map');
              else window.location.href = '/map';
            }}
            type="button"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>عرض على الخريطة</span>
            <Map className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Places Grid */}
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredRestaurants.map((place) => {
              const photo = getRestaurantPhoto(place);
              const meta = PLACES_METADATA[place.id];
              const isFav = favorites.includes(place.id);

              return (
                <div
                  key={place.id}
                  onClick={() => handleOpenPlace(place.id)}
                  className="group bg-white dark:bg-[#0c1622] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[#1d2d3e] overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between text-right"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={photo}
                      alt={place.n}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/95 dark:bg-[#0c1622]/95 text-ocean-950 dark:text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                          <Utensils className="w-3 h-3 text-coral-500" />
                          <span>مطعم أسماك</span>
                        </span>

                        {place.disc > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal2-600 text-white shadow-xs">
                            خصم {place.disc}%
                          </span>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, place.id, place.n)}
                        className={`p-1.5 rounded-full backdrop-blur-xs transition shadow-xs ${
                          isFav
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/30 hover:bg-black/50 text-white'
                        }`}
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Bottom Area & Points on Image */}
                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] drop-shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{place.a}</span>
                      </span>

                      {place.p > 0 && (
                        <span className="text-[10px] font-bold text-amber-300 drop-shadow-sm flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3 fill-amber-300" />
                          <span>+{place.p} نقطة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                        {place.n}
                      </h3>
                      {place.ds && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 mt-1 leading-relaxed">
                          {place.ds}
                        </p>
                      )}
                    </div>

                    {/* Metadata Highlights (Cost Range & Timing) */}
                    {meta && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium flex-wrap">
                        {meta.costRange && (
                          <span className="inline-flex items-center gap-1 text-teal2-700 dark:text-teal2-300 font-bold">
                            <DollarSign className="w-3 h-3" />
                            <span>{meta.costRange}</span>
                          </span>
                        )}
                        {meta.bestTimeOfDay === 'midday' && (
                          <span>• أفضل وقت: الغداء</span>
                        )}
                        {meta.bestTimeOfDay === 'afternoon' && (
                          <span>• أفضل وقت: بعد الظهر</span>
                        )}
                        {meta.recommendedDurationMinutes && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{meta.recommendedDurationMinutes} دقيقة</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#162232] flex items-center justify-between gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPlace(place.id)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-[-2px] transition flex items-center gap-1"
                      >
                        <span>التفاصيل</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {place.disc > 0 && onRequestCoupon && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestCoupon(place);
                            }}
                            className="p-1.5 px-2 rounded-xl bg-teal2-50 dark:bg-teal2-950/40 text-teal2-700 dark:text-teal2-300 hover:bg-teal2-100 text-[11px] font-bold transition flex items-center gap-1 border border-teal2-200/60 dark:border-teal2-800/40"
                            title="طلب كود خصم للمطعم"
                          >
                            <QrCode className="w-3 h-3" />
                            <span className="hidden min-[380px]:inline">كوبون</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleOpenMap(e, place.id)}
                          className="p-1.5 px-2 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1d2d3e] text-[11px] font-bold transition flex items-center gap-1"
                          title="عرض على الخريطة"
                        >
                          <Map className="w-3 h-3 text-teal2-600" />
                          <span className="hidden min-[380px]:inline">الخريطة</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handlePlanWithAI(e, place.n)}
                          className="p-1.5 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[11px] font-bold transition flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/40"
                          title="تخطيط خروجة تشمل المطعم بالذكاء الاصطناعي"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="hidden min-[420px]:inline">خروجة بالـ AI</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search State */
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152332] text-slate-400 grid place-items-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-ocean-950 dark:text-white">
                لم نجد مطاعم مطابقة لبحثك
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرب البحث بكلمات أخرى مثل «كاستن»، «الجندي»، «سمك»، أو قم بإلغاء الفلاتر المحددة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedArea('all');
                setSortBy('default');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs"
            >
              عرض جميع المطاعم
            </button>
          </div>
        )}
      </section>

      {/* Gateway Cards: Interactive Map & Outing Planner */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {/* Map Gateway */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex flex-col justify-between gap-3 text-right">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal2-500/15 text-teal2-600 grid place-items-center shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-ocean-950 dark:text-white">
                خريطة مطاعم بورسعيد الحية
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              تصفح كل مطاعم الأسماك والوجبات البحرية على الخريطة واحسب مسافة الطريق لموقعك.
            </p>
          </div>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('map');
              else window.location.href = '/map';
            }}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152332] dark:hover:bg-[#1d2d3e] text-ocean-900 dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <span>فتح خريطة المطاعم</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Planner Gateway */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-ocean-950 via-[#0a1e38] to-[#062c3e] text-white border border-teal2-500/30 shadow-xs flex flex-col justify-between gap-3 text-right">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal2-500/25 text-teal2-300 grid place-items-center shrink-0 border border-teal2-400/30">
                <Sparkles className="w-3.5 h-3.5 text-sand-300" />
              </div>
              <h3 className="font-black text-sm text-white">
                تخطيط خروجة غداء بالذكاء الاصطناعي
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              حدد ميزانيتك وعدد الأفراد، والمساعد يصمم لك برنامج غداء مع قعدة كافيه على القناة.
            </p>
          </div>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('ai', 'خطط لي خروجة غداء بحري وكافيه على القناة في بورسعيد');
              else window.location.href = `/ai?q=${encodeURIComponent('خطط لي خروجة غداء بحري وكافيه على القناة في بورسعيد')}`;
            }}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>تخطيط خروجة غداء</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
