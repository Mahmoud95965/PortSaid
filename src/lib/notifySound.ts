/**
 * إشعارات الأماكن الجديدة: صوت تنبيه قصير + تخزين الإشعارات محلياً.
 *
 * الصوت مُصنَّع بـ Web Audio (نغمتان) — مفيش ملف صوتي، زي صوت البحر.
 * الإشعارات بتتخزن في localStorage وبيسمعها جرس الإشعارات في الـ Header
 * عن طريق حدث 'ps:notifications'.
 */

const PREFS_STORAGE_KEY = 'ps_user_preferences';
const NOTIFICATIONS_KEY = 'ps_notifications';
const LAST_SEEN_KEY = 'ps_last_seen_place_at';

export interface NewPlaceNotification {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  read: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
  explore: 'استكشف بورسعيد',
  fun: 'معالم وترفيه',
  food: 'مطاعم',
  cafe: 'كافيهات',
  sweets: 'حلويات',
  shop: 'تسوق',
  sport: 'رياضة',
  clothes: 'ملابس',
  hotels: 'فنادق',
  housing: 'سكن',
  bus: 'مواصلات',
};

/** صوت الإشعار شغال افتراضياً (محمود طلبه بصوت)؛ يُكتم من الإعدادات. */
export function readNewPlaceSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!stored) return true;
    const parsed = JSON.parse(stored) as { newPlaceSoundEnabled?: boolean };
    return parsed.newPlaceSoundEnabled !== false;
  } catch {
    return true;
  }
}

export function readNotifications(): NewPlaceNotification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as NewPlaceNotification[]) : [];
  } catch {
    return [];
  }
}

export function addNotifications(items: NewPlaceNotification[]): void {
  try {
    const existing = readNotifications();
    const seen = new Set(existing.map((n) => n.id));
    const fresh = items.filter((n) => !seen.has(n.id));
    if (fresh.length === 0) return;
    const next = [...fresh, ...existing].slice(0, 30);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('ps:notifications'));
  } catch {
    /* تجاهل — الإشعار مش أساسي */
  }
}

export function markAllNotificationsRead(): void {
  try {
    const next = readNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('ps:notifications'));
  } catch {
    /* تجاهل */
  }
}

export function clearNotifications(): void {
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    window.dispatchEvent(new CustomEvent('ps:notifications'));
  } catch {
    /* تجاهل */
  }
}

export function readLastSeenPlaceAt(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function writeLastSeenPlaceAt(value: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, value);
  } catch {
    /* تجاهل */
  }
}

// --- صوت التنبيه ---

let audioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  try {
    if (audioCtx) return audioCtx;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

/** المتصفح بيمنع الصوت قبل أول تفاعل — نفعّل الصوت عند أول لمسة/ضغطة. */
export function unlockNotificationAudio(): void {
  const unlock = () => {
    try {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    } catch {
      /* تجاهل */
    }
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** نغمة قصيرة لطيفة (نغمتان: مي ثم سي) عند إضافة مكان جديد. */
export function playNewPlaceChime(): void {
  if (!readNewPlaceSoundEnabled()) return;
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
      return; // هتشتغل من التنبيه الجاي بعد أول تفاعل
    }
    const now = ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* الصوت اختياري — أي فشل يتجاهل بصمت */
  }
}
