'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  Shirt,
  Search,
  MapPin,
  Clock,
  Tag,
  Star,
  ExternalLink,
  Heart,
  ChevronDown,
  Navigation,
  Percent,
  CheckCircle2,
  ArrowRight,
  X,
  Phone,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ClothesViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
  onRequestCoupon?: (place: Place) => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

const CLOTHES_FILTER_TABS = [
  { key: 'all', label: 'جميع المحلات', icon: '🛍️' },
  { key: 'women', label: 'حريمي وأزياء', icon: '👗' },
  { key: 'men', label: 'رجالي وكاجوال', icon: '👔' },
  { key: 'kids', label: 'أطفال ومواليد', icon: '👶' },
  { key: 'outlet', label: 'أوتلت وماركات بالكيلو', icon: '🏷️' },
  { key: 'shoes', label: 'أحذية وسنيكرز وشنط', icon: '👟' },
];

function getClothesPhoto(place: Place): string {
  const n = (place.n || '').toLowerCase();
  const type = (place.type_ar || '').toLowerCase();
  const a = (place.a || '').toLowerCase();

  if (n.includes('shoes') || n.includes('أحذية') || n.includes('شنط') || type.includes('أحذية')) {
    return '/assets/port-said/gallery/martyrs-square.webp';
  }
  if (n.includes('dima') || n.includes('حريمي') || type.includes('حريمي')) {
    return '/assets/port-said/gallery/balconies-street.webp';
  }
  if (n.includes('men') || n.includes('رجالي') || n.includes('khoder') || n.includes('بدل')) {
    return '/assets/port-said/hero-01.webp';
  }
  if (n.includes('outlet') || n.includes('كيلو') || n.includes('ستوك')) {
    return '/assets/port-said/hero-03.webp';
  }
  if (n.includes('kids') || n.includes('أطفال')) {
    return '/assets/port-said/gallery/balconies-street.webp';
  }
  return '/assets/port-said/hero-02.webp';
}

export const ClothesView: React.FC<ClothesViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onNavigate,
  onBack,
  onRequestCoupon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'reviews' | 'discount'>('default');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedTab, selectedArea, sortBy]);

  // Load favorites
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

      fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: id, action: isAdded ? 'add' : 'remove' }),
      }).catch(() => {});

      if (isAdded) {
        confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
        showToast(`تمت إضافة "${name}" للمفضلة ❤️`);
      } else {
        showToast(`تمت إزالة "${name}" من المفضلة`);
      }
    } catch (e) {}
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Filter clothes places
  const clothesPlaces = useMemo(() => {
    return places.filter(
      (p) =>
        p.cat === 'clothes' ||
        (p.cat === 'shop' &&
          (p.n.includes('ملابس') ||
            p.n.includes('أحذية') ||
            (p.type_ar && (p.type_ar.includes('ملابس') || p.type_ar.includes('أحذية')))))
    );
  }, [places]);

  // Extract unique areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    clothesPlaces.forEach((p) => {
      if (p.a) set.add(p.a);
    });
    return Array.from(set).sort();
  }, [clothesPlaces]);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    return clothesPlaces
      .filter((place) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = place.n.toLowerCase().includes(q);
          const matchDesc = (place.ds || '').toLowerCase().includes(q);
          const matchArea = (place.a || '').toLowerCase().includes(q);
          const matchType = (place.type_ar || '').toLowerCase().includes(q);
          const matchAddress = (place.address || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchArea && !matchType && !matchAddress) {
            return false;
          }
        }

        // Tab filter
        if (selectedTab !== 'all') {
          const n = (place.n || '').toLowerCase();
          const type = (place.type_ar || '').toLowerCase();
          const ds = (place.ds || '').toLowerCase();

          if (selectedTab === 'women') {
            if (!type.includes('حريمي') && !type.includes('عبايات') && !n.includes('حريمي') && !ds.includes('حريمي')) {
              return false;
            }
          } else if (selectedTab === 'men') {
            if (!type.includes('رجالي') && !type.includes('بدل') && !type.includes('كاجوال') && !n.includes('men') && !ds.includes('رجالي')) {
              return false;
            }
          } else if (selectedTab === 'kids') {
            if (!type.includes('أطفال') && !n.includes('kids') && !ds.includes('أطفال')) {
              return false;
            }
          } else if (selectedTab === 'outlet') {
            if (!type.includes('كيلو') && !type.includes('أوتلت') && !type.includes('ستوك') && !n.includes('outlet') && !ds.includes('كيلو')) {
              return false;
            }
          } else if (selectedTab === 'shoes') {
            if (!type.includes('أحذية') && !type.includes('سنيكرز') && !type.includes('شنط') && !n.includes('shoes') && !ds.includes('أحذية')) {
              return false;
            }
          }
        }

        // Area
        if (selectedArea !== 'all' && place.a !== selectedArea) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'reviews') {
          return (b.reviews_count || 0) - (a.reviews_count || 0);
        }
        if (sortBy === 'discount') {
          return (b.disc || 0) - (a.disc || 0);
        }
        return 0;
      });
  }, [clothesPlaces, searchQuery, selectedTab, selectedArea, sortBy]);

  const displayedPlaces = filteredPlaces.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlaces.length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-ocean-900 text-white font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-sand-400"
          >
            <Sparkles className="w-4 h-4 text-sand-400 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#3b0764] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-sand-300">
              <Shirt className="w-3.5 h-3.5 text-sand-300" />
              <span>دليل الماركات والملابس والأحذية الموثقة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              الملابس والأحذية في بورسعيد
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              عاصمة التجارة الحرة والماركات المستوردة. جمعنا لك أشهر محلات الملابس والأحذية والأوتلت وماركات بالكيلو في بورسعيد ببيانات خرائط جوجل الرسمية ومواعيد العمل وأرقام الهواتف.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-center">
              <span className="block text-2xl font-black text-sand-300">{clothesPlaces.length}</span>
              <span className="text-[11px] text-white/70 font-bold">محل موثق</span>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition"
              >
                <span>العودة للرئيسية</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CLOTHES_FILTER_TABS.map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border border-sand-300 dark:border-[#1d2d3e] hover:border-indigo-400'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ocean-700/50 dark:text-white/40 absolute right-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المحل، النوع، الماركة، أو الشارع..."
            className="w-full pr-11 pl-10 py-2.5 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white placeholder:text-ocean-700/40 dark:placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-700/50 dark:text-white/40 hover:text-ocean-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full md:w-auto px-3.5 py-2.5 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">📍 كل المناطق</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full md:w-auto px-3.5 py-2.5 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="default">الترتيب الافتراضي</option>
            <option value="rating">الأعلى تقييماً ⭐</option>
            <option value="reviews">الأكثر تقييمات 💬</option>
            <option value="discount">أعلى نسبة خصم 🏷️</option>
          </select>
        </div>
      </div>

      {/* Places Cards Grid */}
      {displayedPlaces.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] space-y-3">
          <Shirt className="w-12 h-12 text-ocean-700/30 dark:text-white/20 mx-auto" />
          <h3 className="font-black text-lg text-ocean-900 dark:text-white">لا توجد محلات مطابقة للبحث</h3>
          <p className="text-xs text-ocean-700/60 dark:text-white/50">جرب تغيير كلمات البحث أو اختيار تبويب آخر</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTab('all');
              setSelectedArea('all');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedPlaces.map((place) => {
            const isFav = favorites.includes(place.id);
            const photo = getClothesPhoto(place);

            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace && onSelectPlace(place.id)}
                className="group rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300/80 dark:border-[#1d2d3e] shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer relative"
              >
                {/* Photo & Badges */}
                <div className="relative h-44 overflow-hidden bg-sand-100 dark:bg-[#121c29]">
                  <img
                    src={photo}
                    alt={place.n}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, place.id, place.n)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition z-10"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>

                  {/* Discount / Points Badge */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    {place.disc > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-coral-500 text-white text-[11px] font-black shadow flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>خصم {place.disc}%</span>
                      </span>
                    )}
                    {place.p > 0 && (
                      <span className="px-2.5 py-1 rounded-xl bg-ocean-900/80 text-sand-300 border border-sand-400/30 text-[10px] font-bold backdrop-blur-sm">
                        +{place.p} نقطة
                      </span>
                    )}
                  </div>

                  {/* Name and Type in Image Footer */}
                  <div className="absolute bottom-3 right-3 left-3 text-white">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-600/80 backdrop-blur-sm text-[10px] font-black text-white mb-1">
                      {place.type_ar || 'ملابس وأزياء'}
                    </span>
                    <h3 className="font-black text-base sm:text-lg leading-snug line-clamp-1">{place.n}</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Area and Rating */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 text-ocean-700/80 dark:text-white/70 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{place.a}</span>
                      </span>

                      {(place.rating || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-xs">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{place.rating}</span>
                          {(place.reviews_count || 0) > 0 && (
                            <span className="text-[10px] opacity-75 font-normal">
                              {place.reviews_count?.toLocaleString('ar-EG')}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Address Detail */}
                    {place.address && (
                      <p className="text-xs text-ocean-700/60 dark:text-white/50 line-clamp-1 font-medium">
                        {place.address}
                      </p>
                    )}

                    {/* Hours */}
                    {place.hours && place.hours !== 'غير متوفر' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-ocean-700/70 dark:text-white/60 font-medium">
                        <Clock className="w-3 h-3 text-ocean-500 shrink-0" />
                        <span>{place.hours}</span>
                      </div>
                    )}

                    {/* Phone */}
                    {place.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-ocean-700/70 dark:text-white/60 font-medium" dir="ltr">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{place.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-sand-200 dark:border-[#1d2d3e] flex items-center justify-between gap-2">
                    {/* Map Link */}
                    {place.maps_url ? (
                      <a
                        href={place.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-sand-100 dark:bg-[#121c29] hover:bg-sand-200 dark:hover:bg-[#1a2739] text-ocean-700 dark:text-white/80 text-xs font-bold transition flex items-center gap-1"
                        title="افتح في خرائط جوجل"
                      >
                        <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="hidden sm:inline">الخريطة</span>
                      </a>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {onRequestCoupon && place.disc > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestCoupon(place);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />
                          <span>كوبون</span>
                        </button>
                      )}

                      <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition">
                        تفاصيل
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="px-6 py-3 rounded-2xl bg-white dark:bg-[#0c1622] hover:bg-sand-50 dark:hover:bg-[#121c29] text-ocean-900 dark:text-white font-black text-xs sm:text-sm border border-sand-300 dark:border-[#1d2d3e] shadow-sm transition"
          >
            عرض المزيد من المحلات ({filteredPlaces.length - visibleCount} متبقي)
          </button>
        </div>
      )}
    </div>
  );
};
