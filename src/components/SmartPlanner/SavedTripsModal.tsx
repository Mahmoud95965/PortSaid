'use client';

import React from 'react';
import { PlanResult } from '@/lib/plannerUtils';
import { X, Trash2, MapPin, Clock, DollarSign, Calendar, Compass, ArrowRight } from 'lucide-react';

interface SavedTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTrips: PlanResult[];
  onLoadTrip: (trip: PlanResult) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const SavedTripsModal: React.FC<SavedTripsModalProps> = ({
  isOpen,
  onClose,
  savedTrips,
  onLoadTrip,
  onDeleteTrip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-sand-200 dark:border-[#1d2d3e] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal2-100 dark:bg-teal2-950 text-teal2-700 dark:text-teal2-400 grid place-items-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-ocean-950 dark:text-white">
                رحلاتي وخططي المحفوظة ({savedTrips.length})
              </h3>
              <p className="text-[11px] text-ocean-700/70 dark:text-white/60">
                يمكنك إعادة فتح أي رحلة سابقة على الخريطة ومتابعتها في أي وقت
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl bg-sand-100 dark:bg-[#162738] text-ocean-700 dark:text-white/70 hover:bg-sand-200 grid place-items-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {savedTrips.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-sand-100 dark:bg-[#152332] grid place-items-center mx-auto text-ocean-400">
                <Compass className="w-8 h-8" />
              </div>
              <h4 className="font-black text-sm text-ocean-900 dark:text-white">
                لا توجد رحلات محفوظة بعد
              </h4>
              <p className="text-xs text-ocean-700/70 dark:text-white/60 max-w-sm mx-auto">
                عند تخطيط أي خروجة بالذكاء الاصطناعي، اضغط على زر «حفظ الخطة» لتجدها هنا دائماً.
              </p>
            </div>
          ) : (
            savedTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500/40 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white">
                      {trip.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-ocean-700/70 dark:text-white/60 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal2-600" />
                        <span>{trip.totalDurationHours} ساعات</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{trip.stops.length} محطات</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {trip.totalCost} ج.م
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteTrip(trip.id)}
                    type="button"
                    title="حذف هذه الرحلة"
                    className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stops preview */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {trip.stops.map((s, idx) => (
                    <span
                      key={s.order}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#162738] text-[10px] font-bold text-ocean-800 dark:text-white/80 border border-sand-200 dark:border-[#22354a]"
                    >
                      {idx + 1}. {s.name}
                    </span>
                  ))}
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => {
                      onLoadTrip(trip);
                      onClose();
                    }}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-ocean-900 text-sand-300 hover:bg-ocean-800 font-black text-xs flex items-center gap-1.5 transition"
                  >
                    <span>فتح وعرض الخطة على الخريطة 🗺️</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
