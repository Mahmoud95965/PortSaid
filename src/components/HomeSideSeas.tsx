'use client';

import React from 'react';

/**
 * بحر جانبي متحرك يملأ الفراغين الفارغين يمين وشمال محتوى الصفحة الرئيسية
 * على الشاشات العريضة (ديسكتوب).
 * - طبقتان ثابتتان (يمين/يسار) بعرض الفراغ بالظبط: calc((100vw - 72rem) / 2)
 *   لأن محتوى الصفحة محدد بـ max-w-6xl (72rem) ومتمركز — فلا تغطي المحتوى أبداً.
 * - تظهر فقط من مقاس xl فأعلى (حيث يوجد فراغ أصلاً) وتختفي على الموبايل والتابلت.
 * - داخل كل جانب: تدرّج بحري + 3 شرائط موج تنساب أفقياً بسرعات مختلفة
 *   + فقاعات تتصاعد ببطء — كلها transform/opacity فقط (GPU) فلا تؤثر على الأداء.
 * - زخرفية فقط: pointer-events-none و aria-hidden، وتتوقف مع prefers-reduced-motion.
 */

const WAVE_PATH =
  'M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 C1680,90 1920,30 2160,60 C2400,90 2640,30 2880,60 L2880,120 L0,120 Z';
const WAVE_PATH_ALT =
  'M0,50 C240,20 480,80 720,50 C960,20 1200,80 1440,50 C1680,20 1920,80 2160,50 C2400,20 2640,80 2880,50 L2880,120 L0,120 Z';

const BUBBLES = [
  { left: '18%', size: 8, duration: 11, delay: 0 },
  { left: '55%', size: 5, duration: 14, delay: 3 },
  { left: '78%', size: 10, duration: 16, delay: 6 },
  { left: '35%', size: 6, duration: 12, delay: 8 },
  { left: '68%', size: 4, duration: 10, delay: 2 },
];

const WaveBand: React.FC<{
  top: string;
  driftClass: string;
  path: string;
  fillClass: string;
}> = ({ top, driftClass, path, fillClass }) => (
  <div className="absolute left-0 right-0 h-16 sm:h-20" style={{ top }}>
    <svg
      className={`${driftClass} absolute bottom-0 left-0 h-full w-[200%] max-w-none`}
      viewBox="0 0 2880 120"
      preserveAspectRatio="none"
      fill="none"
    >
      <path d={path} className={fillClass} />
    </svg>
  </div>
);

const SidePanel: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <div
    aria-hidden="true"
    className={`absolute inset-y-0 ${
      side === 'left' ? 'left-0' : 'right-0'
    } w-[calc((100vw-72rem)/2)] overflow-hidden`}
    style={
      side === 'left'
        ? {
            maskImage: 'linear-gradient(to right, black 55%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to right, black 55%, transparent 98%)',
          }
        : {
            maskImage: 'linear-gradient(to left, black 55%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 98%)',
          }
    }
  >
    {/* تدرّج بحري خفيف يملأ الجانب */}
    <div className="absolute inset-0 bg-gradient-to-b from-sky-300/25 via-cyan-200/15 to-blue-400/25 dark:from-[#0a2c4d]/60 dark:via-[#0d3a5c]/45 dark:to-[#0a2c4d]/60" />

    {/* شرائط موج منسابة على ارتفاعات مختلفة */}
    <WaveBand
      top="14%"
      driftClass="sea-wave-drift-slow"
      path={WAVE_PATH}
      fillClass="fill-sky-400/50 dark:fill-[#155e85]/60"
    />
    <WaveBand
      top="44%"
      driftClass="sea-wave-drift"
      path={WAVE_PATH_ALT}
      fillClass="fill-sky-500/45 dark:fill-[#0e7490]/55"
    />
    <WaveBand
      top="72%"
      driftClass="sea-wave-drift-fast"
      path={WAVE_PATH}
      fillClass="fill-blue-500/50 dark:fill-[#0369a1]/60"
    />

    {/* فقاعات تتصاعد */}
    {BUBBLES.map((b, i) => (
      <span
        key={i}
        className="sea-bubble-rise absolute bottom-[-12px] rounded-full bg-white/50 dark:bg-cyan-200/40"
        style={{
          left: b.left,
          width: b.size,
          height: b.size,
          animationDuration: `${b.duration}s`,
          animationDelay: `${b.delay}s`,
        }}
      />
    ))}
  </div>
);

export const HomeSideSeas: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-0 hidden select-none xl:block"
  >
    <SidePanel side="left" />
    <SidePanel side="right" />
  </div>
);
