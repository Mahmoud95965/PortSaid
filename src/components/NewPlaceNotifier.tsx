'use client';

/**
 * مراقب الأماكن الجديدة: طول ما الموقع مفتوح، يفحص كل دقيقتين لو فيه
 * مكان جديد اتضاف (في أي قسم — حسب طلب محمود "كل الأماكن عادي جداً")،
 * ولو لقى: تنبيه (toast) + نغمة قصيرة (لو الصوت مفعّل) + إضافة لجرس
 * الإشعارات. أول مرة بيحط خط أساس بس من غير تنبيه للأماكن القديمة.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  CATEGORY_LABELS,
  addNotifications,
  playNewPlaceChime,
  readLastSeenPlaceAt,
  unlockNotificationAudio,
  writeLastSeenPlaceAt,
  type NewPlaceNotification,
} from '@/lib/notifySound';

const POLL_MS = 120_000; // فحص كل دقيقتين

export function NewPlaceNotifier() {
  const [toastItems, setToastItems] = useState<NewPlaceNotification[] | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    unlockNotificationAudio();
    lastSeenRef.current = readLastSeenPlaceAt();
    let cancelled = false;

    const check = async () => {
      if (cancelled || checkingRef.current) return;
      if (!isSupabaseConfigured() || !supabase) return;
      checkingRef.current = true;
      try {
        const { data, error } = await supabase
          .from('places')
          .select('id, name_ar, created_at, categories(code)')
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled || error || !data || data.length === 0) return;
        const newest = data[0].created_at as string;
        const baseline = lastSeenRef.current;
        if (!baseline) {
          // أول تشغيل: خط أساس بس، من غير تنبيه للأماكن الموجودة أصلاً.
          lastSeenRef.current = newest;
          writeLastSeenPlaceAt(newest);
          return;
        }
        const fresh = (data as any[]).filter((p) => (p.created_at as string) > baseline);
        if (fresh.length === 0) return;
        lastSeenRef.current = newest;
        writeLastSeenPlaceAt(newest);
        const items: NewPlaceNotification[] = fresh.map((p) => ({
          id: String(p.id),
          name: p.name_ar as string,
          category: p.categories?.code || 'fun',
          createdAt: p.created_at as string,
          read: false,
        }));
        addNotifications(items);
        // التبويب مخفي: يتسجل في الجرس بس، من غير صوت ولا toast.
        if (!document.hidden) {
          playNewPlaceChime();
          setToastItems(items);
        }
      } catch {
        /* فشل الفحص يتجاهل — المحاولة الجاية بعد دقيقتين */
      } finally {
        checkingRef.current = false;
      }
    };

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!toastItems) return;
    const t = window.setTimeout(() => setToastItems(null), 8000);
    return () => window.clearTimeout(t);
  }, [toastItems]);

  const first = toastItems?.[0];
  const extra = (toastItems?.length || 0) - 1;

  return (
    <AnimatePresence>
      {first && (
        <motion.button
          key={first.id}
          type="button"
          onClick={() => setToastItems(null)}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-[70] flex items-center gap-3 rounded-2xl bg-ocean-900 dark:bg-surface-2 text-white dark:text-ink border border-white/20 dark:border-line shadow-2xl px-4 py-3 text-right"
          aria-label="إشعار مكان جديد"
        >
          <span className="w-9 h-9 shrink-0 rounded-xl bg-sand-400 text-ocean-950 grid place-items-center">
            <Bell className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-black">مكان جديد في {CATEGORY_LABELS[first.category] || 'بورسعيد'}</span>
            <span className="block text-xs font-bold opacity-90 truncate">
              {first.name}
              {extra > 0 ? ` و${extra} ${extra === 1 ? 'مكان آخر' : 'أماكن أخرى'}` : ''}
            </span>
          </span>
          <X className="w-4 h-4 shrink-0 opacity-70" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
