'use client';

import React from 'react';

/**
 * بحر جانبي يملأ الفراغين يمين وشمال محتوى الصفحة الرئيسية على الشاشات العريضة.
 * - طبقتان ثابتتان (يمين/يسار) بعرض الفراغ بالظبط: calc((100vw - 72rem) / 2)
 *   لأن محتوى الصفحة محدد بـ max-w-6xl (72rem) ومتمركز — فلا تغطي المحتوى أبداً.
 * - تظهر فقط من مقاس xl فأعلى (حيث يوجد فراغ أصلاً) وتختفي على الموبايل والتابلت.
 * - كل جانب بحر كامل الارتفاع: تدرّج مائي + 4 طبقات موج متداخلة مثبّتة من الأسفل
 *   (مثل شط البحر — الطبقات فوق بعض فتقرأ كمياه متصلة، لا كشرائط عائمة منفصلة)
 *   تنساب أفقياً بسرعات مختلفة + فقاعات تتصاعد — كلها transform/opacity فقط (GPU).
 * - زخرفية فقط: pointer-events-none و aria-hidden، وتتوقف مع prefers-reduced-motion.
 */

// مسار موجة: القمة متموّجة في الثلث العلوي من الـ viewBox والجسم ممتد للأسفل
// (viewBox بارتفاع 400 حتى لا تتمطط الموجة رأسياً داخل الطبقات الطويلة)
const WAVE_PATH =
  'M0,90 C240,140 480,40 720,90 C960,140 1200,40 1440,90 C1680,140 1920,40 2160,90 C2400,140 2640,40 2880,90 L2880,400 L0,400 Z';
const WAVE_PATH_ALT =
  'M0,80 C240,30 480,130 720,80 C960,30 1200,130 1440,80 C1680,30 1920,130 2160,80 C2400,30 2640,130 2880,80 L2880,400 L0,400 Z';

const BUBBLES = [
  { left: '18%', size: 10, duration: 11, delay: 0 },
  { left: '55%', size: 7, duration: 14, delay: 3 },
  { left: '78%', size: 12, duration: 16, delay: 6 },
  { left: '35%', size: 8, duration: 12, delay: 8 },
  { left: '68%', size: 6, duration: 10, delay: 2 },
];

const WaveLayer: React.FC<{
  height: string;
  driftClass: string;
  bob?: boolean;
  path: string;
  fillClass: string;
}> = ({ height, driftClass, bob, path, fillClass }) => (
  <div
    className={`absolute bottom-0 left-0 right-0 ${bob ? 'sea-wave-bob' : ''}`}
    style={{ height }}
  >
    <svg
      className={`${driftClass} absolute bottom-0 left-0 h-full w-[200%] max-w-none`}
      viewBox="0 0 2880 400"
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
    {/* تدرّج مائي يملأ الجانب كله */}
    <div className="absolute inset-0 bg-gradient-to-b from-sky-300/50 via-cyan-200/40 to-blue-400/50 dark:from-[#0a2c4d]/70 dark:via-[#0d3a5c]/55 dark:to-[#0a2c4d]/70" />

    {/* طبقات موج متداخلة من الأسفل — الخلفية أعلى وأخف، الأمامية أقصر وأوضح */}
    <WaveLayer
      height="88%"
      driftClass="sea-wave-drift-slow"
      path={WAVE_PATH}
      fillClass="fill-sky-300/45 dark:fill-[#155e85]/55"
    />
    <WaveLayer
      height="68%"
      driftClass="sea-wave-drift"
      path={WAVE_PATH_ALT}
      fillClass="fill-sky-400/50 dark:fill-[#0e7490]/60"
    />
    <WaveLayer
      height="48%"
      driftClass="sea-wave-drift-fast"
      bob
      path={WAVE_PATH}
      fillClass="fill-sky-500/55 dark:fill-[#0369a1]/65"
    />
    <WaveLayer
      height="30%"
      driftClass="sea-wave-drift-slow"
      bob
      path={WAVE_PATH_ALT}
      fillClass="fill-blue-500/60 dark:fill-[#075985]/70"
    />

    {/* فقاعات تتصاعد */}
    {BUBBLES.map((b, i) => (
      <span
        key={i}
        className="sea-bubble-rise absolute bottom-[-12px] rounded-full bg-white/80 dark:bg-cyan-200/40"
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
