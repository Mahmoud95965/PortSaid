'use client';

import { useEffect } from 'react';
import { readSeaSoundEnabled, startSeaSound, stopSeaSound } from '@/lib/seaSound';

/**
 * مشغّل صوت البحر: يشتغل فقط عندما تكون الصفحة الرئيسية معروضة
 * ويكون المستخدم قد فعّل الصوت من الإعدادات، ويتوقف تلقائياً
 * عند مغادرة الرئيسية أو إخفاء التبويب.
 */
export const SeaSoundPlayer: React.FC<{ active: boolean }> = ({ active }) => {
  useEffect(() => {
    if (!active || !readSeaSoundEnabled()) {
      stopSeaSound();
      return;
    }
    startSeaSound();

    const onVisibility = () => {
      if (document.hidden) {
        stopSeaSound();
      } else if (readSeaSoundEnabled()) {
        startSeaSound();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopSeaSound();
    };
  }, [active]);

  return null;
};
