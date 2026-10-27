'use client';

import React from 'react';
import { Place } from '@/types';
import { Bed, ArrowRight } from 'lucide-react';

export interface HousingViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onRequestCoupon?: (place: Place) => void;
  onBack: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

export const HousingView: React.FC<HousingViewProps> = ({ onBack }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-3 sm:px-4 py-4 min-h-[50vh] flex flex-col justify-center" dir="rtl">
      {/* Navigation Back */}
      <div>
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition py-1"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع للرئيسية</span>
        </button>
      </div>

      {/* Completely Empty State as requested */}
      <div className="rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] p-8 sm:p-14 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
          <Bed className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            السكن
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            لا توجد بيانات سكن معروضة حالياً.
          </p>
        </div>
      </div>
    </div>
  );
};
