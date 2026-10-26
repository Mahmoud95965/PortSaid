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
  Compass,
  X,
  Map,
  Clock,
  Heart,
  ChevronLeft,
  Navigation,
  SlidersHorizontal,
  Share2,
  Calendar,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface SightsViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

// ربط المعالم بالصور الأصلية المتوفرة في المشروع
const SIGHTS_PHOTOS: Record<string, string> = {
  // فنار بورسعيد التاريخي
  '11111111-1111-1111-1111-111111111101': '/assets/port-said/port-said-lighthouse.webp',
  // ممشى ديليسبس وقناة السويس
  '11111111-1111-1111-1111-111111111102': '/assets/port-said/hero-01.webp',
  // مسجد السلام الكبير
  '11111111-1111-1111-1111-111111111103': '/assets/port-said/port-said-mosque.webp',
  // ميناء بورسعيد وقناة السويس
  'default-port': '/assets/port-said/port-said-port-night.webp',
  // ميدان الشهداء
  'default-square': '/assets/port-said/gallery/martyrs-square.webp',
};

function getSightPhoto(place: Place): string {
  if (SIGHTS_PHOTOS[place.id]) {
    return SIGHTS_PHOTOS[place.id];
  }
  const name = place.n.toLowerCase();
  if (name.includes('فنار')) return '/assets/port-said/port-said-lighthouse.webp';
  if (name.includes('ديليسبس') || name.includes('ممشى')) return '/assets/port-said/hero-01.webp';
  if (name.includes('سلام') || name.includes('مسجد')) return '/assets/port-said/port-said-mosque.webp';
  if (name.includes('شهداء') || name.includes('مسلة')) return '/assets/port-said/gallery/martyrs-square.webp';
  if (name.includes('سفينة') || name.includes('قناة')) return '/assets/port-said/gallery/ship.webp';
  return '/assets/port-said/hero-01.webp';
}

// تصنيفات فلاتر المعالم حسب النوع الحقيقي
const SIGHT_TYPES = [
  { key: 'all', label: 'جميع المعالم' },
  { key: 'history', label: 'تاريخية وأثرية' },
  { key: 'sea', label: 'مماشي وإطلالات القناة' },
  { key: 'culture', label: 'دينية وثقافية' },
];

export const SightsView: React.FC<SightsViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onNavigate,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
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

  // حفظ المفضلة
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

  // حصر المعالم الحقيقية (المصنفة fun أو explore)
  const funPlaces = useMemo(() => {
    return places.filter((p) => p.cat === 'fun' || p.cat === 'explore');
  }, [places]);

  // استخراج قائمة الأحياء المتوفرة فعلياً في المعالم
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    funPlaces.forEach((p) => {
      if (p.a) set.add(p.a.trim());
    });
    return Array.from(set);
  }, [funPlaces]);

  // فلترة المعالم وفق البحث والنوع والحي
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return funPlaces.filter((place) => {
      // 1. فلتر المنطقة
      if (selectedArea !== 'all' && place.a !== selectedArea) {
        return false;
      }

      // 2. فلتر النوع
      if (selectedType !== 'all') {
        const name = place.n.toLowerCase();
        const desc = (place.ds || '').toLowerCase();
        if (selectedType === 'history') {
          const isHistory = name.includes('تاريخي') || name.includes('فنار') || desc.includes('تاريخ');
          if (!isHistory) return false;
        } else if (selectedType === 'sea') {
          const isSea = name.includes('ممشى') || name.includes('ديليسبس') || desc.includes('قناة السويس') || desc.includes('سفن');
          if (!isSea) return false;
        } else if (selectedType === 'culture') {
          const isCulture = name.includes('مسجد') || name.includes('سلام') || desc.includes('إسلامي');
          if (!isCulture) return false;
        }
      }

      // 3. فلتر البحث النصي
      if (!q) return true;

      const nameMatch = place.n.toLowerCase().includes(q);
      const areaMatch = place.a.toLowerCase().includes(q);
      const descMatch = (place.ds || '').toLowerCase().includes(q);

      return nameMatch || areaMatch || descMatch;
    });
  }, [funPlaces, searchQuery, selectedType, selectedArea]);

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
    const prompt = `عايز أزور ${placeName} في بورسعيد وخطط لي خروجة متكاملة حواليه`;
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
          src="/assets/port-said/hero-01.webp"
          alt="معالم بورسعيد"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/90 via-ocean-950/40 to-transparent" />

        <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-end text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold w-fit mb-2 backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5" />
            <span>استكشاف المعالم السياحية</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
            معالم وترفيه في بورسعيد
          </h1>

          <p className="text-xs sm:text-sm text-white/85 font-medium max-w-xl line-clamp-2 mt-1 leading-relaxed">
            استكشف أهم المعالم التاريخية، المماشي السياحية، وأماكن الترفيه في المدينة الباسلة المطلة على قناة السويس.
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
            placeholder="ابحث بالاسم، الحي، أو الكلمات المفتاحية (مثال: فنار، ممشى، تاريخ)..."
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

        {/* Filter Chips: Type and Area */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
          {/* Types Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {SIGHT_TYPES.map((type) => {
              const isSelected = selectedType === type.key;
              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setSelectedType(type.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-[#0c1622] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300'
                  }`}
                >
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Area Filter Select */}
          {availableAreas.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>المنطقة:</span>
              </span>
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
        </div>
      </section>

      {/* Sights Places Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white">
              {searchQuery ? `نتائج البحث عن: "${searchQuery}"` : 'قائمة المعالم السياحية'}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#152332] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22354a]">
              {filteredPlaces.length} مكان
            </span>
          </div>

          {/* Map Link Action */}
          <button
            onClick={() => {
              if (onNavigate) onNavigate('map');
              else window.location.href = '/map';
            }}
            type="button"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>عرض الكل على الخريطة</span>
            <Map className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Places Grid */}
        {filteredPlaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredPlaces.map((place) => {
              const photo = getSightPhoto(place);
              const meta = PLACES_METADATA[place.id];
              const isFav = favorites.includes(place.id);

              return (
                <div
                  key={place.id}
                  onClick={() => handleOpenPlace(place.id)}
                  className="group bg-white dark:bg-[#0c1622] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[#1d2d3e] overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between text-right"
                >
                  {/* Place Real Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={photo}
                      alt={place.n}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/95 dark:bg-[#0c1622]/95 text-ocean-950 dark:text-white shadow-xs backdrop-blur-xs">
                        معلم سياحي
                      </span>

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

                    {/* Bottom Area Tag on Image */}
                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white text-xs">
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

                    {/* Metadata Pill (Duration & Best Time if present) */}
                    {meta && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium flex-wrap">
                        {meta.recommendedDurationMinutes && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-teal2-600" />
                            <span>{meta.recommendedDurationMinutes} دقيقة</span>
                          </span>
                        )}
                        {meta.bestTimeOfDay === 'morning' && (
                          <span>• أفضل وقت: صباحاً</span>
                        )}
                        {meta.bestTimeOfDay === 'evening' && (
                          <span>• أفضل وقت: وقت الغروب</span>
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
                          title="تخطيط خروجة تشمل هذا المعلم بالذكاء الاصطناعي"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="hidden min-[420px]:inline">تخطيط بالـ AI</span>
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
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-ocean-950 dark:text-white">
                لم نجد معالم مطابقة لبحثك
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرب البحث بكلمات أخرى مثل «فنار»، «ممشى»، أو قم بإلغاء الفلاتر.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedArea('all');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs"
            >
              عرض جميع المعالم
            </button>
          </div>
        )}
      </section>

      {/* Gateway Card: Interactive Map & Outing Planner */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {/* Map Gateway */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex flex-col justify-between gap-3 text-right">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal2-500/15 text-teal2-600 grid place-items-center shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-ocean-950 dark:text-white">
                خريطة المعالم الحية
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              تصفح كل المعالم على الخريطة التفاعلية واحسب مسافة السير لموقعك الحالي.
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
            <span>فتح الخريطة التفاعلية</span>
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
                تخطيط خروجة المعالم بالـ AI
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              حدد ميزانيتك ووقتك، والمساعد الذكي يصمم لك برنامج جولة سياحية متكاملة.
            </p>
          </div>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('ai', 'خطط لي جولة سياحية لأهم معالم بورسعيد');
              else window.location.href = `/ai?q=${encodeURIComponent('خطط لي جولة سياحية لأهم معالم بورسعيد')}`;
            }}
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>تخطيط جولة معالم</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
