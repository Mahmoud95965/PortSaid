'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Place } from '@/types';
import { X, Clock, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QRModalProps {
  place: Place;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ place, onClose }) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState('03:00:00');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch (e) {}

    const payload = place.coupon?.payload || `PSC.${place.id}.${Date.now()}`;
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0b2a5b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrSrc(url))
      .catch((err) => console.error(err));

    const expiresAt = place.coupon?.expires_at
      ? new Date(place.coupon.expires_at).getTime()
      : Date.now() + 3 * 3600 * 1000;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      if (diff <= 0) {
        setTimeLeft('انتهى الكود');
        clearInterval(interval);
      } else {
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [place]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 30 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="w-full max-w-sm bg-white dark:bg-[#0f1a28] text-ocean-900 dark:text-white rounded-3xl shadow-2xl p-6 text-center border border-sand-200/90 dark:border-[#1d2d3e] relative overflow-hidden"
      >
        {/* Decorative Ticket Perforations on sides */}
        <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-black/70" />
        <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-black/70" />

        <div className="flex justify-between items-center mb-3">
          <span className="inline-flex items-center gap-1 bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300 rounded-full px-3 py-1 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>كوبون خصم {place.disc}%</span>
          </span>

          <motion.button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-sand-100 dark:bg-[#1a2d42] grid place-items-center hover:bg-sand-200 transition"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <h3 className="text-xl font-black">{place.n}</h3>
        <p className="text-xs text-ocean-700/80 dark:text-white/70 mt-1 mb-4 font-semibold leading-relaxed">
          قدّم كود الـ QR للمحل عند الحساب لتطبيق الخصم فوراً.
        </p>

        {/* QR Image with subtle pulse glow */}
        <motion.div
          className="bg-white rounded-2xl p-3 inline-block shadow-inner mx-auto border-2 border-sand-200"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {qrSrc ? (
            <img src={qrSrc} alt="QR Code" className="w-52 h-52 aspect-square object-contain mx-auto" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-xs text-gray-400 font-bold">
              جارٍ إنشاء الكود...
            </div>
          )}
        </motion.div>

        {/* Countdown Timer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-ocean-900 dark:text-white">
          <Clock className="w-4 h-4 text-sand-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>ينتهي بعد:</span>
          <span dir="ltr" className="font-mono text-teal2-600 dark:text-teal2-400 bg-sand-100 dark:bg-[#152335] px-2.5 py-1 rounded-lg">
            {timeLeft}
          </span>
        </div>

        <motion.button
          onClick={onClose}
          type="button"
          className="mt-5 w-full rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black py-3.5 shadow-lg shadow-teal2-600/30 transition text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          تم، فهمت
        </motion.button>
      </motion.div>
    </div>
  );
};
