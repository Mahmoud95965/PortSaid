'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bed,
  MapPin,
  ArrowRight,
  Clock,
  Sparkles,
  Building,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Home,
  Compass,
} from 'lucide-react';

import { Place } from '@/types';

interface HousingViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onRequestCoupon?: (place: Place) => void;
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

const DISTRICTS = [
  { name: 'حي الشرق', desc: 'بالقرب من الكليات والممشى والخدمات', available: false },
  { name: 'بورفؤاد', desc: 'هدوء تام وقريب من كليات بورفؤاد والمعدية', available: false },
  { name: 'حي العرب', desc: 'وسط البلد والأسواق والأسعار الاقتصادية', available: false },
  { name: 'حي الزهور', desc: 'سكن عائلي وقريب من كليات الطب والتمريض', available: false },
  { name: 'حي المناخ', desc: 'موقع مركزي يتوسط خطوط المواصلات', available: false },
  { name: 'حي الضواحي', desc: 'بالقرب من الميناء البري والمحطة الجديدة', available: false },
];

export const HousingView: React.FC<HousingViewProps> = ({ onBack, onNavigate }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-4" dir="rtl">
      {/* 1. Header & Navigation */}
      <div>
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition group py-1"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          <span>رجوع للرئيسية</span>
        </button>

        <div className="flex items-center gap-2.5 mt-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 grid place-items-center">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              السكن وشقق الطلاب والمغتربين
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              دليل شقق الإيجار، السكن الجامعي، والإقامة الشهرية لطلاب ومغتربي بورسعيد
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Coming Soon Hero Card (بأسلوب بورسعيد هب القديم مع الهوية الحديثة) */}
      <motion.div
        className="rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-blue-50/40 dark:from-[#131d2b] dark:via-[#0c1622] dark:to-[#101b2a] border border-amber-200/70 dark:border-amber-900/40 p-6 sm:p-10 text-center space-y-4 shadow-sm"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 grid place-items-center shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-2xs">
            قيد الإعداد والتوثيق
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            محتوى السكن جاي قريب
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            فريق العمل بيجمع ويوثق حالياً عروض شقق الإيجار وسكن الطلاب الموثوقة في أحياء بورسعيد، للتأكد من الأسعار وتوفير أرقام اتصال حقيقية ومباشرة بدون سماسرة أو بيانات وهمية.
          </p>
        </div>

        {/* أوتيلات وفنادق بورسعيد البديلة */}
        {onNavigate && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('hotels')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition"
            >
              <Building className="w-4 h-4" />
              <span>بتدور على إقامة فندقية أو منتجعات؟ شوف قسم الفنادق</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* 3. اختيار المناطق المستهدفة (عايز السكن فين؟ على طريقة بورسعيد هب القديمة) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>عايز السكن في أي منطقة؟</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold">المناطق المخططة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DISTRICTS.map((district, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedDistrict(district.name)}
              className={`p-4 rounded-2xl border transition-all text-right cursor-pointer ${
                selectedDistrict === district.name
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {district.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  قريباً
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {district.desc}
              </p>
            </div>
          ))}
        </div>

        {selectedDistrict && (
          <p className="text-xs text-center text-amber-700 dark:text-amber-400 font-bold p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            سجلنا اهتمامك بـ «{selectedDistrict}»، وسيتم إشعارك فور توفر شقق موثقة في هذه المنطقة!
          </p>
        )}
      </div>

      {/* 4. معايير سكن الطلاب والمغتربين في بورسعيد هب */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>معايير توثيق السكن التي نعمل عليها:</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">1. أمان وموقع حيوي</span>
            <p className="text-slate-500">القرب من الشوارع الرئيسية وخطوط سير السرفيس والمواصلات الجامعية.</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">2. أسعار عادلة ومباشرة</span>
            <p className="text-slate-500">التعامل المباشر مع أصحاب الشقق بدون وسطاء أو عمولات مبالغ فيها.</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">3. معاينة حقيقية</span>
            <p className="text-slate-500">صور حديثة وتفاصيل موثوقة لحالة الأثاث والمرافق والإنترنت.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
