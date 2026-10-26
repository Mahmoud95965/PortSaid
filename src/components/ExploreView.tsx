'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES, CATS } from '@/lib/constants';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
  X,
  Map,
  Tag,
  Star,
  ExternalLink,
  ChevronLeft,
  Navigation,
  SlidersHorizontal,
} from 'lucide-react';

export interface ExploreViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onSelectCategory?: (categoryKey: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
}

// ربط الأماكن الحقيقية بصور بورسعيد الأصلية المتوفرة في المشروع
export const PLACE_PHOTOS: Record<string, string> = {
  // مطعم وكافيه كاستن
  '20000000-0000-0000-0000-000000000001': '/assets/port-said/hero-02.webp',
  // مجمع الجراج
  '20000000-0000-0000-0000-000000000002': '/assets/port-said/gallery/balconies-street.webp',
  // كافيه ومطعم الشاطئ
  '20000000-0000-0000-0000-000000000004': '/assets/port-said/port-said-port-night.webp',
  // مطعم ابن حميدو
  '20000000-0000-0000-0000-000000000005': '/assets/port-said/hero-02.webp',
  // ديليسبس الممشى السياحي
  '20000000-0000-0000-0000-000000000009': '/assets/port-said/hero-01.webp',
  // سوق الأسماك الحضاري
  '20000000-0000-0000-0000-000000000031': '/assets/port-said/gallery/ship.webp',
  // مطعم الجندي
  '20000000-0000-0000-0000-000000000075': '/assets/port-said/hero-03.webp',
  // سوق السمك الحضاري الجديد
  '20000000-0000-0000-0000-000000000084': '/assets/port-said/gallery/ship.webp',
  // قاعدة تمثال ديليسبس
  '20000000-0000-0000-0000-000000000100': '/assets/port-said/hero-01.webp',
  // De Lesseps Bay
  '20000000-0000-0000-0000-000000000128': '/assets/port-said/port-said-port-night.webp',
  // Cap d'Or
  '20000000-0000-0000-0000-000000000138': '/assets/port-said/gallery/balconies-street.webp',
  // مطعم الجندي للأسماك بورفؤاد
  '20000000-0000-0000-0000-000000000191': '/assets/port-said/hero-03.webp',
  // الممشى السياحي
  '20000000-0000-0000-0000-000000000253': '/assets/port-said/hero-01.webp',
  // متحف النصر للفن الحديث
  '20000000-0000-0000-0000-000000000256': '/assets/port-said/gallery/martyrs-square.webp',
};

export function getPlacePhoto(place: { id?: string; n?: string; cat?: string }): string {
  if (place.id && PLACE_PHOTOS[place.id]) {
    return PLACE_PHOTOS[place.id];
  }
  const name = (place.n || '').toLowerCase();
  if (name.includes('فنار')) return '/assets/port-said/port-said-lighthouse.webp';
  if (name.includes('مسجد') || name.includes('سلام')) return '/assets/port-said/port-said-mosque.webp';
  if (name.includes('ديليسبس') || name.includes('ممشى')) return '/assets/port-said/hero-01.webp';
  if (name.includes('كاستن') || name.includes('سمك')) return '/assets/port-said/hero-02.webp';
  if (name.includes('جندي')) return '/assets/port-said/hero-03.webp';
  if (name.includes('بينوس') || name.includes('كافيه')) return '/assets/port-said/port-said-port-night.webp';
  if (name.includes('سيلفر') || name.includes('كاساتا')) return '/assets/port-said/gallery/balconies-street.webp';
  if (name.includes('شهداء') || name.includes('نصر')) return '/assets/port-said/gallery/martyrs-square.webp';
  return '/assets/port-said/hero-01.webp';
}

// 2. اقتراحات بحث سريعة
const QUICK_SUGGESTIONS = [
  { label: 'أكلات سمك وسي فود', query: 'سمك' },
  { label: 'ممشى ديليسبس', query: 'ديليسبس' },
  { label: 'فنار بورسعيد التاريخي', query: 'فنار' },
  { label: 'كافيهات على القناة', query: 'بينوس' },
  { label: 'كاساتا وحلويات', query: 'سيلفر' },
  { label: 'حي الشرق', query: 'حي الشرق' },
  { label: 'حي العرب', query: 'حي العرب' },
];

// 3. تصنيفات الاكتشاف
const DISCOVERY_CATEGORIES = [
  { key: 'all', label: 'جميع الأماكن', icon: '✨' },
  { key: 'fun', label: 'معالم وتاريخ', icon: '🏛️' },
  { key: 'food', label: 'مطاعم وأسماك', icon: '🐟' },
  { key: 'cafe', label: 'كافيهات القناة', icon: '☕' },
  { key: 'sweets', label: 'حلويات وكاساتا', icon: '🍨' },
  { key: 'shop', label: 'أسواق وتسوق', icon: '🛍️' },
  { key: 'housing', label: 'سكن ومغتربين', icon: '🏠' },
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onSelectCategory,
  onNavigate,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // معالجة البحث والتصنيف بناءً على البيانات الحقيقية
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return places.filter((place) => {
      // 1. فلتر التصنيف
      if (selectedCategory !== 'all' && place.cat !== selectedCategory) {
        return false;
      }

      // 2. فلتر البحث النصي
      if (!q) return true;

      const nameMatch = place.n.toLowerCase().includes(q);
      const areaMatch = place.a.toLowerCase().includes(q);
      const descMatch = (place.ds || '').toLowerCase().includes(q);
      const catObj = CATS[place.cat];
      const catMatch = catObj ? catObj.t.toLowerCase().includes(q) : false;

      return nameMatch || areaMatch || descMatch || catMatch;
    });
  }, [places, searchQuery, selectedCategory]);

  const handleApplySearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleOpenPlace = (id: string) => {
    if (onSelectPlace) {
      onSelectPlace(id);
    } else if (onNavigate) {
      onNavigate('place', id);
    }
  };

  const handleOpenMapForPlace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('map', id);
    } else {
      window.location.href = `/map?place=${id}`;
    }
  };

  const handleNavigateToMap = () => {
    if (onNavigate) {
      onNavigate('map');
    } else {
      window.location.href = '/map';
    }
  };

  const handleNavigateToAI = () => {
    if (onNavigate) {
      onNavigate('ai');
    } else {
      window.location.href = '/ai';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10" dir="rtl">
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

      {/* 1. المقدمة وحقل البحث: «اكتشف بورسعيد على مزاجك» */}
      <section className="space-y-4 text-center sm:text-right">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>دليل المدينة السياحي والمعرفي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ocean-950 dark:text-white tracking-tight">
            اكتشف بورسعيد على مزاجك
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            دليلك لاستكشاف المعالم التاريخية، المطاعم البحرية، كافيهات الممشى، وتجارب بورسعيد الحقيقية الموثقة.
          </p>
        </div>

        {/* حقل البحث الواضح */}
        <div className="relative max-w-2xl">
          <div className="relative flex items-center rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition p-1.5">
            <div className="p-2.5 text-slate-400">
              <Search className="w-5 h-5 text-slate-400" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الحي، أو الفئة (مثال: فنار، سمك، بينوس، حي الشرق)..."
              className="flex-1 bg-transparent text-ocean-950 dark:text-white text-xs sm:text-sm font-semibold outline-none px-1 placeholder:text-slate-400"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. اقتراحات بحث سريعة */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">
            اقتراحات سريعة:
          </span>
          {QUICK_SUGGESTIONS.map((item, idx) => {
            const isActive = searchQuery === item.query;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySearch(item.query)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-[#0c1622] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d2d3e] hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-[#121f2f]'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. تصنيفات الاكتشاف */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#162232]">
          <h2 className="text-sm font-black text-ocean-950 dark:text-white flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>تصنيفات الاكتشاف</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            تصفية سريعة للأماكن
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DISCOVERY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.key);
                  if (cat.key !== 'all' && onSelectCategory) {
                    // إشعار الصفحة الرئيسية في حال الحاجة
                  }
                }}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-ocean-900 text-white border-ocean-900 shadow-xs dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-white dark:bg-[#0c1622] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. قسم الأماكن المميزة (بيانات حقيقية موثوقة) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white">
              {searchQuery ? `نتائج البحث عن: "${searchQuery}"` : 'أماكن مميزة في بورسعيد'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              بيانات ومعالم موثقة ومطابقة لموقعها الجغرافي
            </p>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22354a]">
            {filteredPlaces.length} مكان
          </span>
        </div>

        {/* Grid الأماكن */}
        {filteredPlaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredPlaces.map((place) => {
              const photo = getPlacePhoto(place);
              const catObj = CATS[place.cat] || { t: 'معلم', border: '#0284c7' };

              return (
                <div
                  key={place.id}
                  onClick={() => handleOpenPlace(place.id)}
                  className="group bg-white dark:bg-[#0c1622] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[#1d2d3e] overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between text-right"
                >
                  {/* صورة حقيقية من معالم بورسعيد */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={photo}
                      alt={place.n}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Badges on Image */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/95 dark:bg-[#0c1622]/95 text-ocean-950 dark:text-white shadow-xs backdrop-blur-xs">
                        {catObj.t}
                      </span>
                      {place.disc > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                          خصم {place.disc}%
                        </span>
                      )}
                    </div>

                    {/* Area tag on bottom of image */}
                    <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-white text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] drop-shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{place.a}</span>
                      </span>

                      {place.p > 0 && (
                        <span className="text-[10px] font-bold text-amber-300 drop-shadow-sm">
                          +{place.p} نقطة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Place Content Details */}
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

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#162232] flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-[-2px] transition flex items-center gap-1">
                        <span>تفاصيل المكان</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleOpenMapForPlace(e, place.id)}
                        className="p-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1d2d3e] text-[11px] font-bold transition flex items-center gap-1"
                        title="عرض المكان على الخريطة"
                      >
                        <Map className="w-3.5 h-3.5 text-teal2-600" />
                        <span>الخريطة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* حالة عدم وجود نتائج للبحث */
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152332] text-slate-400 grid place-items-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-ocean-950 dark:text-white">
                لم نجد أماكن مطابقة لبحثك
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرب البحث بكلمات أخرى مثل «فنار»، «سمك»، «ديليسبس»، أو قم بإلغاء الفلتر.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs"
            >
              عرض جميع الأماكن
            </button>
          </div>
        )}
      </section>

      {/* 5. قسم ومدخل الخريطة التفاعلية */}
      <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal2-500/15 text-teal2-600 grid place-items-center shrink-0">
              <Map className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-ocean-950 dark:text-white">
              استكشف كل الأماكن على الخريطة التفاعلية
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            تصفح خريطة شوارع بورسعيد الحية مع علامات المعالم، وحساب المسافات الدقيقة لموقعك الحالي بالـ GPS، ومسارات السير.
          </p>
        </div>

        <button
          onClick={handleNavigateToMap}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-ocean-900 hover:bg-ocean-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
        >
          <span>فتح الخريطة التفاعلية</span>
          <Map className="w-4 h-4 text-sand-400" />
        </button>
      </section>

      {/* 6. مدخل مركز الذكاء الاصطناعي لتخطيط الخروجات */}
      <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-ocean-950 via-[#0a1e38] to-[#062c3e] text-white border border-teal2-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal2-500/25 text-teal2-300 grid place-items-center shrink-0 border border-teal2-400/30">
              <Sparkles className="w-4 h-4 text-sand-300 animate-pulse" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-white">
              مخطط الخروجات الذكي (AI Studio)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
            حدد ميزانيتك ووقتك، والمساعد الذكي هيصمم لك برنامج خروجة متكامل بمحطات واقعية في بورسعيد ومسار شوارع فوري.
          </p>
        </div>

        <button
          onClick={handleNavigateToAI}
          type="button"
          className="px-4 py-2.5 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-md shrink-0 self-stretch sm:self-auto justify-center"
        >
          <span>ابدأ التخطيط بالذكاء الاصطناعي</span>
          <Sparkles className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
