'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  ShoppingBag,
  Search,
  MapPin,
  Sparkles,
  Tag,
  Heart,
  ChevronDown,
  Navigation,
  ExternalLink,
  Percent,
  CheckCircle2,
  ArrowRight,
  X,
  Store,
  Laptop,
  Shirt,
  ShoppingCart,
} from 'lucide-react';

export interface ShoppingViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
  onRequestCoupon?: (place: Place) => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

// ربط المتاجر والأسواق بالصور الأصلية المتوفرة في أصول المشروع الحقيقية
const SHOP_PHOTOS: Record<string, string> = {
  // جراند بورسعيد (حي الشرق)
  '20000000-0000-0000-0000-000000000029': '/assets/port-said/gallery/balconies-street.webp',
  // أراكان بورسعيد (حي الشرق)
  '20000000-0000-0000-0000-000000000030': '/assets/port-said/gallery/balconies-street.webp',
  // سوق الأسماك الحضاري (حي العرب)
  '20000000-0000-0000-0000-000000000031': '/assets/port-said/hero-03.webp',
  // سوق الحميدي (حي الشرق - أشهر أسواق الملابس والأقمشة)
  '20000000-0000-0000-0000-000000000032': '/assets/port-said/gallery/balconies-street.webp',
  // السوق التجاري (حي الشرق)
  '20000000-0000-0000-0000-000000000033': '/assets/port-said/gallery/balconies-street.webp',
  // بازار الخضروات والفاكهة (حي العرب)
  '20000000-0000-0000-0000-000000000034': '/assets/port-said/hero-03.webp',
  // سوق البازار (حي العرب)
  '20000000-0000-0000-0000-000000000036': '/assets/port-said/gallery/martyrs-square.webp',
  // محلات الاستوك (حي الشرق - ملابس مستوردة)
  '20000000-0000-0000-0000-000000000037': '/assets/port-said/gallery/balconies-street.webp',
  // Hollywood Downtown (حي المناخ)
  '20000000-0000-0000-0000-000000000040': '/assets/port-said/hero-01.webp',
  // Carrefour Port Fouad (بورفؤاد)
  '20000000-0000-0000-0000-000000000064': '/assets/port-said/gallery/ship.webp',
  // Metro Market (حي الشرق)
  '20000000-0000-0000-0000-000000000065': '/assets/port-said/gallery/balconies-street.webp',
  // Kheir Zaman (حي الشرق)
  '20000000-0000-0000-0000-000000000066': '/assets/port-said/gallery/balconies-street.webp',
  // Kazyon (حي الشرق)
  '20000000-0000-0000-0000-000000000067': '/assets/port-said/gallery/balconies-street.webp',
  // سوق السمك الحضاري الجديد (حي العرب)
  '20000000-0000-0000-0000-000000000084': '/assets/port-said/hero-03.webp',
  // مول الفرما (حي الشرق)
  '20000000-0000-0000-0000-000000000189': '/assets/port-said/gallery/martyrs-square.webp',
  // محمود الفار ماركت (حي الشرق)
  '20000000-0000-0000-0000-000000000190': '/assets/port-said/gallery/balconies-street.webp',
  // Alarabiya Computer (بورفؤاد)
  '20000000-0000-0000-0000-000000000233': '/assets/port-said/hero-01.webp',
  // The Soldier Computer (بورفؤاد)
  '20000000-0000-0000-0000-000000000234': '/assets/port-said/gallery/ship.webp',
  // iC Store (بورفؤاد)
  '20000000-0000-0000-0000-000000000235': '/assets/port-said/hero-01.webp',
};

function getShopPhoto(place: Place): string {
  if (SHOP_PHOTOS[place.id]) {
    return SHOP_PHOTOS[place.id];
  }
  const name = (place.n || '').toLowerCase();
  const area = (place.a || '').toLowerCase();

  if (name.includes('مول') || name.includes('أراكان') || name.includes('جراند') || name.includes('فرما')) {
    return '/assets/port-said/gallery/martyrs-square.webp';
  }
  if (name.includes('سوق') || name.includes('بازار') || name.includes('استوك')) {
    return '/assets/port-said/gallery/balconies-street.webp';
  }
  if (name.includes('computer') || name.includes('store') || name.includes('ic')) {
    return '/assets/port-said/hero-01.webp';
  }
  if (area.includes('بورفؤاد')) {
    return '/assets/port-said/gallery/ship.webp';
  }
  return '/assets/port-said/gallery/balconies-street.webp';
}

// تصنيفات التسوق المعتمدة بناءً على البيانات الفعلية
const SHOPPING_CATEGORIES = [
  { key: 'all', label: 'جميع أماكن التسوق', icon: '🛍️' },
  { key: 'malls', label: 'المراكز التجارية والمولات', icon: '🏬' },
  { key: 'markets', label: 'الأسواق التراثية والبازارات', icon: '🕌' },
  { key: 'fashion', label: 'الملابس والأزياء والاستوكات', icon: '👗' },
  { key: 'tech', label: 'الإلكترونيات والكمبيوتر', icon: '💻' },
  { key: 'supermarkets', label: 'السوبرماركت والهايبرماركت', icon: '🛒' },
];

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  places = INITIAL_PLACES,
  onSelectPlace,
  onNavigate,
  onBack,
  onRequestCoupon,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'discount' | 'points' | 'name'>('featured');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination: التحميل التدريجي للمتاجر (8 في البداية)
  const [visibleCount, setVisibleCount] = useState<number>(8);

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

  // استخراج كافة أماكن التسوق المعتمدة (44 مكاناً حقيقياً)
  const allShops = useMemo(() => {
    return places.filter((p) => {
      const isCatShop = p.cat === 'shop';
      const name = (p.n || '').toLowerCase();
      const isNamedShop =
        name.includes('مول') ||
        name.includes('سوق') ||
        name.includes('ماركت') ||
        name.includes('store') ||
        name.includes('computer') ||
        name.includes('بازار') ||
        name.includes('استوك') ||
        name.includes('تجاري');
      return isCatShop || isNamedShop;
    });
  }, [places]);

  // قائمة المناطق الفعلية المستخرجة من البيانات
  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    allShops.forEach((s) => {
      if (s.a) areas.add(s.a.trim());
    });
    return Array.from(areas);
  }, [allShops]);

  // تصنيف وفلترة المتاجر حسب البيانات الفعلية
  const filteredShops = useMemo(() => {
    let result = [...allShops];

    // 1. فلتر البحث النصي
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.n.toLowerCase().includes(q) ||
          s.a.toLowerCase().includes(q) ||
          (s.ds && s.ds.toLowerCase().includes(q))
      );
    }

    // 2. فلتر فئات التسوق المعتمدة
    if (selectedCategory === 'malls') {
      result = result.filter((s) => {
        const name = (s.n || '').toLowerCase();
        return (
          name.includes('مول') ||
          name.includes('جراند') ||
          name.includes('أراكان') ||
          name.includes('التجاري') ||
          name.includes('downtown') ||
          name.includes('الفرما')
        );
      });
    } else if (selectedCategory === 'markets') {
      result = result.filter((s) => {
        const name = (s.n || '').toLowerCase();
        return (
          name.includes('سوق') ||
          name.includes('بازار') ||
          name.includes('الحميدي') ||
          name.includes('الاستوك')
        );
      });
    } else if (selectedCategory === 'fashion') {
      result = result.filter((s) => {
        const name = (s.n || '').toLowerCase();
        return (
          name.includes('استوك') ||
          name.includes('حميدي') ||
          name.includes('downtown') ||
          name.includes('جراند') ||
          name.includes('أراكان') ||
          name.includes('التجاري') ||
          name.includes('البازار')
        );
      });
    } else if (selectedCategory === 'tech') {
      result = result.filter((s) => {
        const name = (s.n || '').toLowerCase();
        return (
          name.includes('computer') ||
          name.includes('ic store') ||
          name.includes('العربية') ||
          name.includes('soldier')
        );
      });
    } else if (selectedCategory === 'supermarkets') {
      result = result.filter((s) => {
        const name = (s.n || '').toLowerCase();
        return (
          name.includes('carrefour') ||
          name.includes('كارفور') ||
          name.includes('metro') ||
          name.includes('مترو') ||
          name.includes('kheir zaman') ||
          name.includes('خير زمان') ||
          name.includes('kazyon') ||
          name.includes('كازيون') ||
          name.includes('الفار') ||
          name.includes('market') ||
          name.includes('supermarket')
        );
      });
    }

    // 3. فلتر المنطقة
    if (selectedArea !== 'all') {
      result = result.filter((s) => s.a === selectedArea);
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
  }, [allShops, searchTerm, selectedCategory, selectedArea, sortBy]);

  // الأماكن المعروضة وفق التحميل التدريجي
  const displayedShops = useMemo(() => {
    return filteredShops.slice(0, visibleCount);
  }, [filteredShops, visibleCount]);

  const hasMore = visibleCount < filteredShops.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 8);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
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
        {/* Ambient Lights */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-black text-cyan-200">
            <ShoppingBag className="w-4 h-4 text-cyan-300" />
            <span>دليل المراكز والأسواق التجارية • بورسعيد وبورفؤاد</span>
          </div>

          <h1 className="text-2xl min-[400px]:text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            تسوّق في بورسعيد
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-2xl">
            دليلك الشامل لأفضل وجهات التسوق في بورسعيد وبورفؤاد: الأسواق التراثية كالحميدي والبازار، محلات الاستوك والملابس المستوردة، المراكز التجارية والمولات الحديثة، ومتاجر الإلكترونيات بعروض ونقاط زيارة حصرية.
          </p>

          {/* Quick Stats Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-white/90">
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              🏬 {allShops.length} وجهة تسوق معتمدة
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              🛍️ أسواق تراثية ومحلات استوك
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15">
              📱 إلكترونيات وأجهزة كمبيوتر
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
            placeholder="ابحث باسم المحل، السوق، المركز التجاري، أو الحي..."
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

        {/* Real Data Categories Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SHOPPING_CATEGORIES.map((c) => {
              const isActive = selectedCategory === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setSelectedCategory(c.key);
                    setVisibleCount(8);
                  }}
                  className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
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
              الكل ({allShops.length})
            </button>
            {availableAreas.map((area) => {
              const isSelected = selectedArea === area;
              const count = allShops.filter((s) => s.a === area).length;
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
            يتم عرض {displayedShops.length} من أصل {filteredShops.length} وجهة تسوق
          </span>
          {(searchTerm || selectedCategory !== 'all' || selectedArea !== 'all' || sortBy !== 'featured') && (
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

      {/* 3. Shopping Places Cards Grid */}
      {displayedShops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {displayedShops.map((shop, index) => {
            const isFav = favorites.includes(shop.id);
            const photoUrl = getShopPhoto(shop);

            // تحديد شارة نوع النشاط التجاري
            let activityBadge = 'متجر تسوق';
            const name = (shop.n || '').toLowerCase();
            if (name.includes('مول') || name.includes('أراكان') || name.includes('جراند') || name.includes('الفرما')) {
              activityBadge = 'مركز تجاري ومول';
            } else if (name.includes('استوك')) {
              activityBadge = 'ملابس واستوكات مستوردة';
            } else if (name.includes('حميدي') || name.includes('بازار') || name.includes('سوق')) {
              activityBadge = 'سوق تراثي وبازار';
            } else if (name.includes('computer') || name.includes('store') || name.includes('ic')) {
              activityBadge = 'إلكترونيات وكمبيوتر';
            } else if (name.includes('market') || name.includes('سوبرماركت') || name.includes('كارفور')) {
              activityBadge = 'سوبرماركت واحتياجات';
            }

            return (
              <motion.article
                key={shop.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                onClick={() => onSelectPlace && onSelectPlace(shop.id)}
                className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Photo & Badges Container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={photoUrl}
                      alt={shop.n}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                    {/* Area Badge (Top Right) */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-black border border-white/20 shadow-sm">
                        <MapPin className="w-3 h-3 text-cyan-300" />
                        <span>{shop.a}</span>
                      </span>
                    </div>

                    {/* Favorite Button (Top Left) */}
                    <button
                      onClick={(e) => toggleFavorite(e, shop.id, shop.n)}
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
                      {/* Activity Type Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-600/90 backdrop-blur-sm text-[10px] font-black">
                        <span>{activityBadge}</span>
                      </span>

                      {/* Points / Discount Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-sm text-[10px] font-black text-amber-300 border border-white/10">
                        <span>+{shop.p || 20} نقطة</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {shop.n}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                      {shop.ds || 'مركز تسوق متكامل يوفر كافة الاحتياجات والمنتجات بأسعار مناسبة في بورسعيد.'}
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
                        onSelectPlace && onSelectPlace(shop.id);
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
                        if (onNavigate) onNavigate('map', shop.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition text-center font-bold flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>الخريطة</span>
                    </button>
                  </div>

                  {/* Additional Actions (AI Shopping Planner + Google Maps) */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('planner', `جولة تسوق في ${shop.n} بـ ${shop.a}`);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-500" />
                        <span>جولة تسوق بالـ AI</span>
                      </button>
                    )}

                    {shop.maps_url && (
                      <a
                        href={shop.maps_url}
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
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              لم نجد متاجر أو أسواق مطابقة لبحثك
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              جرب تغيير كلمة البحث أو اختيار تصنيف تسوق آخر للوصول إلى وجهتك المطلوبة.
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

      {/* 4. Load More Button (عرض المزيد من المتاجر) */}
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
              عرض المزيد من المتاجر والأسواق ({filteredShops.length - visibleCount} متبقية)
            </span>
          </motion.button>
        </div>
      )}

      {/* 5. Gateways & Discovery Cards (Bottom Section) */}
      <section className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Gateway 1: Interactive Map for Shopping */}
        <div
          onClick={() => onNavigate && onNavigate('map')}
          className="p-5 rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white border border-blue-500/20 shadow-lg cursor-pointer hover:border-blue-400 transition space-y-2.5"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-cyan-300 grid place-items-center">
            <Navigation className="w-5 h-5" />
          </div>
          <h4 className="font-black text-base sm:text-lg">
            خريطة أسواق ومتاجر بورسعيد التفاعلية
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            تصفح مواقع المراكز التجارية ومحلات الاستوكات والأسواق على الخريطة المباشرة واعرف الأقرب لموقعك بالكيلومتر وأفضل مسارات السير والتاكسي.
          </p>
          <div className="pt-1 text-xs font-black text-cyan-300 flex items-center gap-1">
            <span>استكشف الخريطة الآن</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </div>
        </div>

        {/* Gateway 2: AI Shopping & Outing Advisor */}
        <div
          onClick={() => onNavigate && onNavigate('ai', 'عايز أحسن أسواق استوكات ملابس ومولات تجارية في بورسعيد')}
          className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white border border-slate-700/60 shadow-lg cursor-pointer hover:border-blue-400 transition space-y-2.5"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-300 grid place-items-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h4 className="font-black text-base sm:text-lg">
            مساعد بورسعيد الذكي لجولات التسوق
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            اطلب من المساعد الذكي تخطيط جولة تسوق كاملة تجمع بين سوق الحميدي، محلات الاستوك، وأرقى المولات والمطاعم المجاورة بميزانية محددة.
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
