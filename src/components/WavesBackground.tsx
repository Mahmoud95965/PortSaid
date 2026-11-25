'use client';

import React from 'react';

/**
 * شريط أمواج متحرك في نهاية الصفحة الرئيسية — طبقات موج SVG تنساب أفقياً
 * بسرعات مختلفة فوق تدرّج بحري، كأنها شط البحر في آخر الصفحة.
 * - زخرفي فقط: pointer-events-none و aria-hidden فلا يعيق أي زر أو محتوى.
 * - تحريك خفيف على خاصية transform فقط (GPU) فلا يؤثر على الأداء أو التمرير.
 * - يتوقف تماماً مع prefers-reduced-motion (انظر globals.css).
 */
export const WavesBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative overflow-hidden rounded-3xl border border-sky-200/60 dark:border-[#1d3a52] h-44 sm:h-52 select-none"
    >
      {/* سماء/بحر متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200/70 via-cyan-100/50 to-blue-300/60 dark:from-[#0a2740] dark:via-[#0d3555] dark:to-[#0e4a6b]" />
      {/* شمس صغيرة خافتة */}
      <div className="absolute top-4 right-6 w-10 h-10 rounded-full bg-amber-300/80 dark:bg-amber-400/50 blur-[1px] shadow-[0_0_32px_10px_rgba(251,191,36,0.35)]" />

      {/* الموجة الخلفية — أبطأ وأخف */}
      <div className="absolute bottom-0 left-0 right-0 h-[70%] sea-wave-bob">
        <svg
          className="sea-wave-drift-slow absolute bottom-0 left-0 h-full w-[200%] max-w-none"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 C1680,90 1920,30 2160,60 C2400,90 2640,30 2880,60 L2880,120 L0,120 Z"
            className="fill-sky-300/50 dark:fill-[#155e85]/60"
          />
        </svg>
      </div>

      {/* الموجة الوسطى */}
      <div className="absolute bottom-0 left-0 right-0 h-[52%]">
        <svg
          className="sea-wave-drift absolute bottom-0 left-0 h-full w-[200%] max-w-none"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,50 C240,20 480,80 720,50 C960,20 1200,80 1440,50 C1680,20 1920,80 2160,50 C2400,20 2640,80 2880,50 L2880,120 L0,120 Z"
            className="fill-sky-400/60 dark:fill-[#0e7490]/70"
          />
        </svg>
      </div>

      {/* الموجة الأمامية — الأقرب والأوضح */}
      <div className="absolute bottom-0 left-0 right-0 h-[36%] sea-wave-bob">
        <svg
          className="sea-wave-drift-fast absolute bottom-0 left-0 h-full w-[200%] max-w-none"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,55 C240,85 480,25 720,55 C960,85 1200,25 1440,55 C1680,85 1920,25 2160,55 C2400,85 2640,25 2880,55 L2880,120 L0,120 Z"
            className="fill-blue-500/70 dark:fill-[#0369a1]/80"
          />
        </svg>
      </div>
    </div>
  );
};
