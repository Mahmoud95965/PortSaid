'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  Hotel,
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
  Users,
} from 'lucide-react';

const FAVORITES_KEY = 'ps_user_favorites';

interface HotelsViewProps {
  places?: Place[];
  onSelectPlace: (placeId: string) => void;
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onRequestCoupon?: (place: Place) => void;
}

// تعيين الصور الواقعية المحلية للفنادق والأوتيلات ببورسعيد
export function getHotelPhoto(placeName: string, area: string): string {
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
    return '/assets/port-said/gallery/balconies-street.webp';
  }
  if (n.includes('شباب') || n.includes('youth')) {
    return '/assets/port-said/gallery/martyrs-square.webp';
  }
  if (n.includes('بدر') || a.includes('الزهور')) {
    return '/assets/port-said/hero-02.webp';
  }
  return '/assets/port-said/hero-02.webp';
}

// تصنيف أنواع الإقامة بناءً على البيانات الواقعية
export type HotelType = 'all' | 'resort' | 'city' | 'hostel';

export function getHotelCategory(placeName: string): {
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
    label: 'فندق وسط المدينة',
    badgeBg: 'bg-indigo-600 text-white',
  };
}

export const HotelsView: React.FC<HotelsViewProps> = ({
  places,
  onSelectPlace,
  onBack,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<HotelType>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // استخراج قائمة الفنادق الفعلية (الفئة: hotels)
  const allHotels = useMemo(() => {
    const source = places && places.length > 0 ? places : INITIAL_PLACES;
    return source.filter((p) => p.cat === 'hotels');
  }, [places]);

  // استخراج الأحياء والمناطق الحقيقية المتوفرة
  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    allHotels.forEach((h) => {
      if (h.a) areas.add(h.a.replace(/^حي\s+/, '').trim());
    });
    return Array.from(areas);
  }, [allHotels]);

  // تحميل المفضلة من التخزين المحلي
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  // فلترة الفنادق وفق البحث والنوع والحي
  const filteredHotels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allHotels.filter((hotel) => {
      // 1. فلتر البحث النصي
      if (q) {
        const matchesName = hotel.n.toLowerCase().includes(q);
        const matchesArea = hotel.a.toLowerCase().includes(q);
        const matchesDesc = (hotel.ds || '').toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesDesc) return false;
      }

      // 2. فلتر النوع
      if (selectedType !== 'all') {
        const catInfo = getHotelCategory(hotel.n);
        if (catInfo.type !== selectedType) return false;
      }

      // 3. فلتر الحي
      if (selectedArea !== 'all') {
        const normalizedHotelArea = hotel.a.replace(/^حي\s+/, '').trim();
        if (normalizedHotelArea !== selectedArea) return false;
      }

      return true;
    });
  }, [allHotels, searchQuery, selectedType, selectedArea]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-4" dir="rtl">
      {/* 1. الشريط العلوي: زر الرجوع وعنوان الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div>
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition group py-1"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span>رجوع للرئيسية</span>
          </button>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                فنادق وأوتيلات بورسعيد
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                اكتشف المنتجعات الشاطئية، الفنادق التراثية، وأماكن الإقامة المناسبة للزوار والمغتربين
              </p>
            </div>
          </div>
        </div>

        {/* زر عرض على الخريطة التفاعلية */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-slate-800 dark:text-white font-bold text-xs shadow-xs transition shrink-0"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>عرض الفنادق على الخريطة</span>
          </button>
        )}
      </div>

      {/* 2. شريط البحث والفلاتر السريعة */}
      <div className="space-y-3 bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* حقل البحث */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الفندق أو الحي (مثال: بورتو، هلنان، الشرق، طرح البحر)..."
            className="w-full pr-10 pl-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-semibold outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* فلاتر التصنيف النوعي */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'all', label: 'الكل', count: allHotels.length },
            { id: 'resort', label: 'منتجعات وفنادق ساحلية', count: allHotels.filter((h) => getHotelCategory(h.n).type === 'resort').length },
            { id: 'city', label: 'فنادق وسط المدينة', count: allHotels.filter((h) => getHotelCategory(h.n).type === 'city').length },
            { id: 'hostel', label: 'بيت شباب واقتصادي', count: allHotels.filter((h) => getHotelCategory(h.n).type === 'hostel').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as HotelType)}
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* فلتر الأحياء */}
        {availableAreas.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">
              المنطقة:
            </span>
            <button
              onClick={() => setSelectedArea('all')}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                selectedArea === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              كل المناطق
            </button>
            {availableAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                  selectedArea === area
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. قائمة بطاقات الفنادق والأوتيلات */}
      {filteredHotels.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Building className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
            لا توجد فنادق مطابقة للبحث
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            جرب إزالة كلمات البحث أو تغيير المنطقة لعرض كافة الفنادق المسجلة في بورسعيد.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedArea('all');
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredHotels.map((hotel) => {
            const photo = getHotelPhoto(hotel.n, hotel.a);
            const catInfo = getHotelCategory(hotel.n);
            const isFav = favorites.includes(hotel.id);

            return (
              <motion.div
                key={hotel.id}
                onClick={() => onSelectPlace(hotel.id)}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
                whileHover={{ y: -4 }}
              >
                {/* Image Cover */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={photo}
                    alt={hotel.n}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Badges on Top */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black shadow-xs ${catInfo.badgeBg}`}>
                      {catInfo.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, hotel.id)}
                      className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 grid place-items-center shadow-xs hover:scale-110 transition"
                      title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* Name and Area over image */}
                  <div className="absolute bottom-3 inset-x-3 text-white">
                    <h2 className="text-base sm:text-lg font-black leading-tight drop-shadow-sm truncate">
                      {hotel.n}
                    </h2>
                    <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{hotel.a}</span>
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    {hotel.ds || `إقامة فندقية مريحة وموقع متميز في ${hotel.a} بالقرب من أهم معالم بورسعيد.`}
                  </p>

                  {/* Footer Action Strip */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
                      <span>تفاصيل الإقامة والحجز</span>
                      <ArrowRight className="w-3 h-3 -rotate-180" />
                    </span>

                    {hotel.maps_url && (
                      <a
                        href={hotel.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="فتح في خرائط جوجل"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
