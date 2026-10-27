'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shirt,
  Sparkles,
  ArrowRight,
  Search,
  MapPin,
  Clock,
  Tag,
  CheckCircle2,
  Bell,
  Compass,
  ShoppingBag,
} from 'lucide-react';

interface ClothesViewProps {
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
}

const CLOTHES_CATEGORIES = [
  { id: 'men', name: 'رجالي وكاجوال', icon: '👔', desc: 'بدل، كاجوال، ملابس شبابية مستوردة' },
  { id: 'women', name: 'حريمي وعبايات', icon: '👗', desc: 'أزياء راقية، فساتين، عبايات وشيلان' },
  { id: 'kids', name: 'أطفال ومواليد', icon: '👶', desc: 'ملابس أطفال من أحدث الماركات' },
  { id: 'freezone', name: 'المنطقة الحرة والبالة', icon: '🏷️', desc: 'ماركات أصلية واستيراد أوروبي مميز' },
  { id: 'sports', name: 'ملابس وأحذية رياضية', icon: '👟', desc: 'ترنجات ومستلزمات الرياضة الأصلية' },
  { id: 'fabrics', name: 'أقمشة ومفروشات', icon: '🧵', desc: 'أجود أنواع الأقمشة البورسعيدية' },
];

const FAMOUS_MARKETS = [
  { name: 'سوق الحميدي التجاري', area: 'حي العرب', tag: 'ملابس جملة وقطاعي' },
  { name: 'شارع التجاري (الثلاثيني)', area: 'حي العرب / الشرق', tag: 'محلات وماركات شهيرة' },
  { name: 'سوق البازار التاريخي', area: 'حي الشرق', tag: 'استيراد وهدايا وملابس' },
  { name: 'شارع محمد علي والجيش', area: 'حي المناخ', tag: 'بوتيكات شبابية وماركات' },
  { name: 'سوق القنال الداخلي (البالة)', area: 'حي العرب', tag: 'براندات أوروبية واستيراد' },
];

export const ClothesView: React.FC<ClothesViewProps> = ({ onNavigate, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setSubscribed(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#3b0764] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-sand-300">
              <Shirt className="w-3.5 h-3.5 text-sand-300" />
              <span>دليل تسوق الأزياء والملابس في بورسعيد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              الملابس في بورسعيد
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              عاصمة التجارة الحرة والماركات المستوردة. بنجهز لك الدليل الشامل لأشهر محلات الملابس والأسواق التجارية في بورسعيد بعروض وكوبونات حصرية.
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition"
            >
              <span>العودة للرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Coming Soon Hero Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-6 sm:p-10 text-center shadow-lg border border-sand-300 dark:border-[#1d2d3e] relative overflow-hidden">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 grid place-items-center mx-auto shadow-inner">
            <Shirt className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-xs font-black">
              جاري التجهيز والإضافة
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ocean-900 dark:text-white">
              محتوى الملابس جاي قريب
            </h2>
            <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/70 leading-relaxed">
              فريق Port Said Hub يعمل حالياً على توثيق محلات الملابس المعتمدة، أسواق البالة والمنطقة الحرة، وتوفير كوبونات خصم خاصة بالزوار والطلاب.
            </p>
          </div>

          {/* Notify Me Form */}
          <div className="pt-2">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="أدخل بريدك أو رقم هاتفك لإشعارك فور الإطلاق"
                  className="w-full px-4 py-3 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white placeholder:text-ocean-700/50 dark:placeholder:text-white/40 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>إشعارني</span>
                </button>
              </form>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تم تسجيل طلبك بنجاح! سنقوم بإشعارك بمجرد تدشين قسم الملابس.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planned Categories Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-indigo-600 inline-block" />
            <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white">
              الأقسام التي ستتوفر في الدليل
            </h3>
          </div>
          <span className="text-xs text-ocean-700/60 dark:text-white/50 font-bold">معاينة أولية</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CLOTHES_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1622] border border-sand-300/80 dark:border-[#1d2d3e] shadow-sm flex items-start gap-3.5 hover:border-indigo-400 transition"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xl grid place-items-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/40">
                {cat.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="font-black text-sm text-ocean-900 dark:text-white truncate">{cat.name}</h4>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 leading-relaxed font-medium">
                  {cat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Famous Markets in Port Said */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-teal2-600 inline-block" />
            <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white">
              أشهر شوارع وأسواق الملابس ببورسعيد
            </h3>
          </div>
          <span className="text-xs text-ocean-700/60 dark:text-white/50 font-bold">بورسعيد الباسلة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {FAMOUS_MARKETS.map((market, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-sm text-ocean-900 dark:text-white">{market.name}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand-100 dark:bg-[#1a2739] text-ocean-700 dark:text-sand-300">
                  {market.area}
                </span>
              </div>
              <p className="text-xs text-ocean-700/70 dark:text-white/60 font-medium">
                {market.tag}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation to Other Sections */}
      <div className="p-5 rounded-2xl bg-sand-100 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-right">
          <p className="font-black text-sm text-ocean-900 dark:text-white">تحب تستكشف خدمات تانية شغالة دلوقتي؟</p>
          <p className="text-xs text-ocean-700/70 dark:text-white/60">تصفح الفنادق، المطاعم، المواصلات أو اسأل مساعد الذكاء الاصطناعي</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('hotels')}
                type="button"
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a2739] text-ocean-900 dark:text-white font-bold text-xs border border-sand-300 dark:border-[#2a3a4f] hover:border-ocean-500 transition"
              >
                الفنادق والأوتيلات
              </button>
              <button
                onClick={() => onNavigate('shop')}
                type="button"
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a2739] text-ocean-900 dark:text-white font-bold text-xs border border-sand-300 dark:border-[#2a3a4f] hover:border-ocean-500 transition"
              >
                المراكز التجارية
              </button>
              <button
                onClick={() => onNavigate('ai')}
                type="button"
                className="px-3.5 py-2 rounded-xl bg-ocean-900 text-white font-bold text-xs shadow hover:bg-ocean-800 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sand-300" />
                <span>المساعد الذكي</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
