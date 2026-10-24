'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('جارٍ توثيق بريدك الإلكتروني...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('الرابط غير صحيح أو مفقود.');
      return;
    }

    const timer = setTimeout(() => {
      setStatus('success');
      setMessage('تم توثيق بريدك الإلكتروني بنجاح!');
    }, 1200);

    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1a242d] border border-sand-200 dark:border-[#2a2a2a] rounded-3xl overflow-hidden shadow-2xl text-center">
      <div className="hero-bg waves-pattern text-white p-6 flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-[#f8f4ea] border-2 border-white/60 shadow flex items-center justify-center overflow-hidden">
          <img src="/assets/logo/icon-192.png" alt="" className="w-[84%] h-[84%] object-contain" />
        </div>
        <b dir="ltr" className="text-xl font-black">
          Port Said Hub
        </b>
      </div>

      <div className="p-8 space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-teal2-600">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-sm font-bold text-ocean-900 dark:text-white">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 text-teal2-600">
            <CheckCircle2 className="w-14 h-14" />
            <p className="text-base font-black text-ocean-900 dark:text-white">{message}</p>
            <Link
              href="/"
              className="mt-4 px-8 py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold text-sm shadow transition"
            >
              الذهاب للموقع
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 text-coral-500">
            <XCircle className="w-14 h-14" />
            <p className="text-sm font-bold text-ocean-900 dark:text-white">{message}</p>
            <Link
              href="/"
              className="mt-4 px-8 py-3 rounded-2xl bg-ocean-900 hover:bg-ocean-700 text-white font-extrabold text-sm shadow transition"
            >
              العودة للرئيسية
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-sand-50 dark:bg-[#07162b] grid place-items-center p-4">
      <Suspense fallback={<div className="text-sm font-bold">جارٍ التحميل...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
