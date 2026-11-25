// صوت بحر طبيعي مولّد برمجياً عبر Web Audio API — بدون أي ملف صوتي.
// طبقتان من ضجيج مُرشَّح (أمواج + رغوة) مع تموّج بطيء يحاكي المد والجزر.
// الصوت متوقف افتراضياً؛ يشتغل فقط لو المستخدم فعّله من الإعدادات
// (seaSoundEnabled) وأثناء وجوده في الصفحة الرئيسية فقط.

const PREFS_STORAGE_KEY = 'ps_user_preferences';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let nodes: AudioNode[] = [];
let playing = false;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2; // حلقة ثانيتين
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    // ضجيج أبيض مُمَوَّه قليلاً نحو البُنّي ليكون أهدأ على الأذن
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

/** هل فعّل المستخدم صوت البحر من الإعدادات؟ (يُقرأ من نفس مفتاح التفضيلات) */
export function readSeaSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!stored) return false;
    return (JSON.parse(stored) as { seaSoundEnabled?: boolean }).seaSoundEnabled === true;
  } catch {
    return false;
  }
}

export function isSeaSoundPlaying(): boolean {
  return playing;
}

export function startSeaSound(): void {
  if (playing) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (fadeTimer) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
  }

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const noise = createNoiseBuffer(ctx);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 2.5); // دخول تدريجي هادئ
    master.connect(ctx.destination);

    // الطبقة 1: الأمواج — ضجيج يمر بمرشّح منخفض يتأرجح ببطء (المد والجزر)
    const surfSrc = ctx.createBufferSource();
    surfSrc.buffer = noise;
    surfSrc.loop = true;
    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 420;
    surfFilter.Q.value = 0.6;
    const surfGain = ctx.createGain();
    surfGain.gain.value = 0.6;
    const swellLfo = ctx.createOscillator();
    swellLfo.frequency.value = 0.08; // موجة كل ~12 ثانية
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 260;
    swellLfo.connect(swellDepth);
    swellDepth.connect(surfFilter.frequency);
    const swellGainLfo = ctx.createOscillator();
    swellGainLfo.frequency.value = 0.05;
    const swellGainDepth = ctx.createGain();
    swellGainDepth.gain.value = 0.25;
    swellGainLfo.connect(swellGainDepth);
    swellGainDepth.connect(surfGain.gain);
    surfSrc.connect(surfFilter);
    surfFilter.connect(surfGain);
    surfGain.connect(master);

    // الطبقة 2: الرغوة — همس عالي خفيف يتلاشى ويعود
    const foamSrc = ctx.createBufferSource();
    foamSrc.buffer = noise;
    foamSrc.loop = true;
    foamSrc.playbackRate.value = 1.7;
    const foamFilter = ctx.createBiquadFilter();
    foamFilter.type = 'bandpass';
    foamFilter.frequency.value = 2400;
    foamFilter.Q.value = 0.8;
    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.05;
    const foamLfo = ctx.createOscillator();
    foamLfo.frequency.value = 0.11;
    const foamDepth = ctx.createGain();
    foamDepth.gain.value = 0.03;
    foamLfo.connect(foamDepth);
    foamDepth.connect(foamGain.gain);
    foamSrc.connect(foamFilter);
    foamFilter.connect(foamGain);
    foamGain.connect(master);

    surfSrc.start();
    foamSrc.start();
    swellLfo.start();
    swellGainLfo.start();
    foamLfo.start();

    masterGain = master;
    nodes = [surfSrc, foamSrc, swellLfo, swellGainLfo, foamLfo, surfFilter, surfGain, foamFilter, foamGain];
    playing = true;
  } catch {
    // لو المتصفح رفض الصوت (مثلاً بلا تفاعل سابق)، نتجاهل بصمت — لا نكسر الصفحة
    playing = false;
  }
}

export function stopSeaSound(): void {
  if (!playing) return;
  playing = false;
  const ctx = audioCtx;
  const master = masterGain;
  const liveNodes = nodes;
  masterGain = null;
  nodes = [];
  if (!ctx || !master) return;
  try {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8); // خروج تدريجي
    fadeTimer = setTimeout(() => {
      try {
        liveNodes.forEach((n) => {
          try {
            (n as OscillatorNode).stop?.();
          } catch {}
          try {
            n.disconnect();
          } catch {}
        });
        master.disconnect();
      } catch {}
    }, 900);
  } catch {}
}
