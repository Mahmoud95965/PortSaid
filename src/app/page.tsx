'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// Declarations for window-level libraries (qrcode)
declare global {
  interface Window {
    qrcode?: (typeNumber: number, errorCorrectionLevel: string) => any;
  }
}

// Transit Network data from legacy
const HOME_STOP = 'المعدية / السكن الجامعي';
const NET: Record<string, string[]> = {
  'الأمين': ['المعدية / السكن الجامعي', 'قصر الثقافة', 'كلية التكنولوجيا والحقوق', 'بنك الإسكان', 'السلام', 'قسم الضواحي', 'الحريتين', 'شارع التلاتيني', 'المنشية'],
  'الزهور': ['قصر الثقافة', 'كلية الطب والعلاج الطبيعي', 'كلية الصيدلة', 'شارع النصر', 'الزهور', 'عمر بن عبد العزيز'],
  'الـ 5000': ['المعدية / السكن الجامعي', 'كلية التربية النوعية', 'حي العرب', 'حي المناخ', 'التعاونيات', 'منطقة الـ 5000'],
  'التلاتيني': ['منطقة الـ 5000', 'شارع الجمهورية'],
  'السلام': ['حي العرب', 'شارع أسوان', 'فاطمة الزهراء', 'نفيسة'],
  'أسوان': ['كلية الطب والعلاج الطبيعي', 'قصر الثقافة', 'شارع أسوان']
};
const NOTE: Record<string, string> = {
  'الزهور|كلية الطب والعلاج الطبيعي': 'انزل عند عجوة جنب الكلية على طول',
  'الـ 5000|كلية التربية النوعية': 'انزل قدام الكلية بالظبط',
  'الأمين|كلية التكنولوجيا والحقوق': 'انزل قدام الكلية (ولو رايح الصيدلة: انزل هنا وامشي لحد الكلية)'
};
const BAN: Record<string, number> = {
  'الزهور|كلية الطب والعلاج الطبيعي>قصر الثقافة': 1,
  'أسوان|قصر الثقافة>كلية الطب والعلاج الطبيعي': 1
};
const AREA_STOP: Record<string, string> = {
  'العرب': 'حي العرب',
  'المناخ': 'حي المناخ',
  'الزهور': 'الزهور',
  'الضواحي': 'قسم الضواحي'
};
const STOPS = Array.from(new Set(Object.values(NET).flat()));

function planTransit(a: string, b: string) {
  if (a === b) return [];
  const q: { s: string; path: { l: string; f: string; t: string }[]; used: Record<string, boolean> }[] = [
    { s: a, path: [], used: {} }
  ];
  const seen: Record<string, boolean> = { [a]: true };

  while (q.length > 0) {
    const cur = q.shift()!;
    for (const l in NET) {
      if (cur.used[l] || !NET[l].includes(cur.s)) continue;
      for (let i = 0; i < NET[l].length; i++) {
        const t = NET[l][i];
        if (t === cur.s || BAN[`${l}|${cur.s}>${t}`]) continue;
        const np = cur.path.concat([{ l, f: cur.s, t }]);
        if (t === b) return np;
        if (!seen[t]) {
          seen[t] = true;
          const u = { ...cur.used, [l]: true };
          q.push({ s: t, path: np, used: u });
        }
      }
    }
  }
  return null;
}

const CATS: Record<string, { t: string; i: string; c: string }> = {
  explore: { t: 'استكشف بورسعيد', i: 'fa-compass', c: 'bg-sand-200 text-ocean-900' },
  fun:  { t: 'معالم وترفيه', i: 'fa-star', c: 'bg-sand-400 text-ocean-900' },
  food: { t: 'مطاعم', i: 'fa-utensils', c: 'bg-teal2-600 text-white' },
  cafe: { t: 'كافيهات', i: 'fa-mug-hot', c: 'bg-ocean-900 text-white' },
  sweets: { t: 'حلويات', i: 'fa-ice-cream', c: 'bg-coral-500 text-white' },
  shop: { t: 'تسوق', i: 'fa-bag-shopping', c: 'bg-ocean-500 text-white' },
  sport: { t: 'رياضة', i: 'fa-dumbbell', c: 'bg-teal2-500 text-white' },
  housing: { t: 'سكن (شقق)', i: 'fa-bed', c: 'bg-coral-500 text-white' },
  hotels: { t: 'الأوتيلات والفنادق', i: 'fa-hotel', c: 'bg-coral-500 text-white' },
  bus:  { t: 'مواصلات', i: 'fa-bus', c: 'bg-ocean-700 text-white' }
};

const TINT: Record<string, string> = {
  explore: '#0f6fb8',
  fun: '#c77d00',
  food: '#c9391f',
  cafe: '#7a5230',
  sweets: '#c93d78',
  shop: '#13809c',
  sport: '#2b8a57',
  housing: '#6f55c4',
  hotels: '#b0489a',
  bus: '#1559b7'
};

const IC_PATHS: Record<string, React.ReactNode> = {
  explore: (
    <>
      <circle cx="12" cy="12" r="10"/>
      <path d="m16.2 7.8-1.8 5.4a2 2 0 0 1-1.3 1.3L7.8 16.2l1.8-5.4a2 2 0 0 1 1.3-1.3z"/>
    </>
  ),
  fun: (
    <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 7h18z"/>
  ),
  food: (
    <>
      <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>
    </>
  ),
  cafe: (
    <>
      <path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1zM17 12h1a3 3 0 0 1 0 6h-1"/>
    </>
  ),
  sweets: (
    <>
      <path d="m7 11 4.1 10.3a1 1 0 0 0 1.8 0L17 11M17 7A5 5 0 0 0 7 7"/>
      <path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/>
    </>
  ),
  shop: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>
    </>
  ),
  sport: (
    <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>
  ),
  hotels: (
    <>
      <path d="M10 22v-6.57M12 11h.01M12 7h.01M14 15.43V22M15 16a5 5 0 0 0-6 0M16 11h.01M16 7h.01M8 11h.01M8 7h.01"/>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
    </>
  ),
  housing: (
    <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>
  ),
  bus: (
    <>
      <path d="M8 6v6M16 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2s-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M9 18h5"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="16" cy="18" r="2"/>
    </>
  )
};

const BOT_FAQ = [
  { q: 'إزاي أكسب نقاط؟', a: 'بتكسب نقط لما تسجّل زيارتك لمعلم سياحي أو مكان ترفيه من صفحته (لازم تفعّل الموقع عشان نتأكد إنك في المكان)، وكمان زر "شير واكسب" في الصفحة الرئيسية بيدّيك نقاط مرة واحدة لما تشارك الموقع على واتساب.' },
  { q: 'إزاي أستخدم كوبون الخصم؟', a: 'من صفحة المكان دوس "اطلب كوبون"، هيطلعلك كود QR، وريه للمحل وقت الدفع عشان ياخد خصمه على طول.' },
  { q: 'عندي محل وعاوز أنضم كتاجر', a: 'تمام! دوس على زر "سجل متجرك" تحت الصفحة الرئيسية، هيتعمل لمتجرك حساب خاص بيك تقدر منه تحدد نسبة الخصم والعمولة، وفريقنا هيراجع طلبك ويرد عليك.' },
  { q: 'عندي شكوى أو اقتراح', a: 'استخدم زر "شكاوى واقتراحات" فوق الصفحة، اكتب رسالتك وإحنا بنقرا كل رسالة وبنرد بأسرع وقت 🙏' },
  { q: 'إزاي أروح أماكن تانية (مواصلات)؟', a: 'من قسم "مواصلات" في الصفحة الرئيسية هتلاقي خطوط المينى باص والفيري بين أحياء بورسعيد المختلفة.' },
  { q: 'نسيت كلمة المرور أو عاوز أعدّل بياناتي', a: 'من أيقونة المستخدم فوق اختار "معلومات الحساب"، من هناك تقدر تغيّر كلمة مرورك وتتابع بياناتك وصورتك الشخصية.' },
  { q: 'مين فريق Alpha؟', a: 'إحنا فريق Alpha Team، بنحب بورسعيد وعايزين كل واحد يحس إنه في بيته فيها 💙' }
];

const RX_MAP: Record<string, [string, string]> = {
  like: ['👍', 'أعجبني'],
  love: ['❤️', 'أحببته'],
  haha: ['😂', 'هاهاها'],
  wow: ['😮', 'واو'],
  sad: ['😢', 'حزين'],
  fire: ['🔥', 'نار']
};

export default function App() {
  // Screens & Navigation
  const [screen, setScreen] = useState<'welcome' | 'auth' | 'app'>('welcome');
  const [currentView, setCurrentView] = useState<{ view: string; arg: string | null }>({ view: 'home', arg: null });
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [wizardStep, setWizardStep] = useState(1);
  const [showIntro, setShowIntro] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botQuickOpen, setBotQuickOpen] = useState(true);
  const [botMessages, setBotMessages] = useState<{ who: 'bot' | 'me'; text: string }[]>([
    { who: 'bot', text: 'أهلًا بيك في Port Said Hub 👋 اسألني أي سؤال، أو اختار من الأسئلة الجاهزة تحت.' }
  ]);
  const [botInput, setBotInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // User & Data State
  const [user, setUser] = useState<any>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [exploreItems, setExploreItems] = useState<any[]>([]);
  const [communityUploads, setCommunityUploads] = useState<any[]>([]);
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Gallery slideshow
  const [heroIndex, setHeroIndex] = useState(0);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);

  // QR Modal State
  const [qrModal, setQrModal] = useState<{ show: boolean; place: string; discount: number; payload: string; expiresAt: number } | null>(null);
  const [qrTimer, setQrTimer] = useState('');

  // Lightbox
  const [lightbox, setLightbox] = useState<{ show: boolean; src: string; cap: string; desc?: string } | null>(null);

  // Auth Forms
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupAcct, setSignupAcct] = useState<'user' | 'merchant'>('user');
  const [signupName, setSignupName] = useState('');
  const [signupGender, setSignupGender] = useState<'male' | 'female'>('male');
  const [signupType, setSignupType] = useState<'student' | 'visitor' | 'local'>('visitor');
  const [signupInst, setSignupInst] = useState('');
  const [signupGov, setSignupGov] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupPass2, setSignupPass2] = useState('');
  const [signupErr, setSignupErr] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Merchant Extra Fields
  const [merchBiz, setMerchBiz] = useState('');
  const [merchCat, setMerchCat] = useState('food');
  const [merchCatOther, setMerchCatOther] = useState('');
  const [merchArea, setMerchArea] = useState('حي الشرق');
  const [merchDisc, setMerchDisc] = useState(10);
  const [merchComm, setMerchComm] = useState(5);
  const [merchTax, setMerchTax] = useState('');
  const [merchNotes, setMerchNotes] = useState('');

  // Transport State
  const [transFrom, setTransFrom] = useState(HOME_STOP);
  const [transTo, setTransTo] = useState('كلية الطب والعلاج الطبيعي');

  // Feedback State
  const [feedbackKind, setFeedbackKind] = useState<'suggestion' | 'complaint'>('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Account State
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Memories Form
  const [memFile, setMemFile] = useState<File | null>(null);
  const [memPrev, setMemPrev] = useState<string | null>(null);
  const [memCap, setMemCap] = useState('');
  const [memVis, setMemVis] = useState<'private' | 'public'>('public');
  const [memUploading, setMemUploading] = useState(false);

  const botEndRef = useRef<HTMLDivElement>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Check login on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data?.user) {
          setUser(d.data.user);
          setScreen('app');
          document.body.classList.add('entered');
        }
      })
      .catch(() => {});

    // Fetch places
    fetch('/api/places')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data?.places) setPlaces(d.data.places);
        else if (Array.isArray(d.data)) setPlaces(d.data);
      })
      .catch(() => {});

    // Fetch gallery
    fetch('/api/gallery')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data?.gallery) setGalleryItems(d.data.gallery);
      })
      .catch(() => {});

    // Fetch explore
    fetch('/api/explore')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) {
          setExploreItems(d.data.items || []);
          setCommunityUploads(d.data.community || []);
          setMyUploads(d.data.mine || []);
        }
      })
      .catch(() => {});

    // Check theme
    try {
      if (localStorage.getItem('ps_theme') === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch {}
  }, []);

  // Hero slideshow auto timer
  useEffect(() => {
    const t = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % 3);
    }, 6500);
    return () => clearInterval(t);
  }, []);

  // QR Modal countdown
  useEffect(() => {
    if (!qrModal?.show) return;
    const updateTime = () => {
      const s = Math.max(0, Math.floor((qrModal.expiresAt - Date.now()) / 1000));
      const pad = (n: number) => (n < 10 ? '0' : '') + n;
      if (s <= 0) {
        setQrTimer('انتهى');
      } else {
        setQrTimer(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [qrModal]);

  // Handle Theme Toggle
  const toggleTheme = () => {
    document.documentElement.classList.add('theme-anim');
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('ps_theme', isDark ? 'dark' : 'light');
    } catch {}
    setTimeout(() => {
      document.documentElement.classList.remove('theme-anim');
    }, 600);
  };

  // Short Arabic name for hero greeting
  const getShortName = (nameStr: string) => {
    const parts = (nameStr || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'صديقي';
    const glue = ['عبد', 'عبدال', 'ابو', 'أبو', 'ام', 'أم', 'ابن', 'بن'];
    const names = [];
    for (let i = 0; i < parts.length; i++) {
      let w = parts[i];
      while (glue.includes(w) && i + 1 < parts.length) {
        w += ' ' + parts[++i];
      }
      names.push(w);
    }
    return names.slice(0, 2).join(' ');
  };

  // Navigations
  const go = (view: string, arg: string | null = null) => {
    setCurrentView({ view, arg });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setUserMenuOpen(false);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    if (!loginId.trim()) {
      setLoginErr('اكتب رقم الهاتف أو البريد الإلكتروني.');
      return;
    }
    if (!loginPass) {
      setLoginErr('اكتب كلمة المرور.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPass })
      });
      const data = await res.json();
      setLoginLoading(false);

      if (!data.ok) {
        setLoginErr(data.error?.message || 'بيانات الدخول غير صحيحة.');
        return;
      }

      setUser(data.data.user);
      setScreen('app');
      document.body.classList.add('entered');
      showToast('مرحبًا بك في دليلك في بورسعيد! 🌊');
    } catch {
      setLoginLoading(false);
      setLoginErr('حدث خطأ في الاتصال بالخادم.');
    }
  };

  // Signup wizard handler
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErr('');

    if (wizardStep < 3) {
      if (wizardStep === 1) {
        if (!signupName.trim()) {
          setSignupErr('اكتب اسمك.');
          return;
        }
        if (signupAcct === 'merchant' && !merchBiz.trim()) {
          setSignupErr('اكتب اسم المتجر.');
          return;
        }
      }
      if (wizardStep === 2) {
        if (!signupPhone.trim() || signupPhone.length < 11) {
          setSignupErr('رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 01.');
          return;
        }
      }
      setWizardStep(prev => prev + 1);
      return;
    }

    // Final step submission
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setSignupErr('البريد الإلكتروني غير صحيح.');
      return;
    }
    if (signupPass.length < 8) {
      setSignupErr('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (signupPass !== signupPass2) {
      setSignupErr('كلمتا المرور غير متطابقتين.');
      return;
    }

    setSignupLoading(true);
    try {
      const endpoint = signupAcct === 'merchant' ? '/api/partners/apply' : '/api/auth/register';
      const body = signupAcct === 'merchant'
        ? {
            name: signupName.trim(),
            email: signupEmail.trim(),
            password: signupPass,
            phone: signupPhone.trim(),
            business_name: merchBiz.trim(),
            category: merchCat,
            area: merchArea,
            discount: merchDisc,
            commission: merchComm,
            tax_number: merchTax,
            notes: merchNotes
          }
        : {
            name: signupName.trim(),
            email: signupEmail.trim(),
            password: signupPass,
            phone: signupPhone.trim(),
            gender: signupGender,
            user_type: signupType,
            institution: signupType === 'student' ? signupInst : null,
            governorate: signupType === 'local' ? 'بورسعيد' : signupGov
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setSignupLoading(false);

      if (!data.ok) {
        setSignupErr(data.error?.message || 'حدث خطأ أثناء التسجيل.');
        return;
      }

      setUser(data.data.user);
      if (signupAcct === 'merchant') {
        setScreen('app');
        document.body.classList.add('entered');
        showToast('تم إنشاء حساب التاجر بنجاح 🎉');
      } else {
        setShowIntro(true);
      }
    } catch {
      setSignupLoading(false);
      setSignupErr('حدث خطأ في الاتصال بالسيرفر.');
    }
  };

  // Bot Ask handler
  const sendBotMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userMsg = textToSend.trim();
    setBotMessages(prev => [...prev, { who: 'me', text: userMsg }]);
    setBotInput('');

    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const d = await res.json();
      const reply = d.ok && d.data?.reply ? d.data.reply : 'أهلًا بك! يمكنك سؤالي عن أماكن بورسعيد ومواصلاتها وعروضها.';
      setBotMessages(prev => [...prev, { who: 'bot', text: reply }]);
    } catch {
      setBotMessages(prev => [...prev, { who: 'bot', text: 'شكرًا لسؤالك! يمكنك تصفح دليل المواصلات والأماكن بسهولة من القائمة الرئيسية.' }]);
    }
  };

  // Share claim points
  const handleShareClaim = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://portsaidhub.com';
    const txt = `اكتشف بورسعيد مع Port Said Hub 🌊 أماكن وخصومات ومواصلات ونقاط على كل زيارة: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');

    try {
      const res = await fetch('/api/share/claim', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setUser((prev: any) => ({ ...prev, points_balance: data.data.balance, share_claimed: true }));
        showToast(`+${data.data.points_awarded} نقطة 🎉 شكرًا على المشاركة`);
      }
    } catch {}
  };

  // QR Code trigger
  const requestCoupon = async (p: any) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: p.id })
      });
      const d = await res.json();
      if (!d.ok) {
        showToast(d.error?.message || 'تعذر استخراج الكوبون');
        return;
      }
      const cp = d.data.coupon || d.data;
      setUser((prev: any) => ({ ...prev, points_balance: d.data.balance ?? prev?.points_balance }));
      setQrModal({
        show: true,
        place: p.name_ar || p.n,
        discount: p.discount_percent || p.disc || 10,
        payload: cp.payload || `PSC.${p.id}.${user?.id || 'guest'}`,
        expiresAt: Date.now() + 3600 * 1000
      });
      showToast('تم استخراج كود الخصم بنجاح 🎉');
    } catch {
      showToast('حدث خطأ أثناء طلب الكوبون');
    }
  };

  // Checkin for GPS points
  const handleCheckin = async (p: any) => {
    if (!navigator.geolocation) {
      showToast('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    showToast('جاري التحقق من موقعك الحالي...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/visits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              place_id: p.id,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            })
          });
          const d = await res.json();
          if (d.ok) {
            setUser((prev: any) => ({ ...prev, points_balance: d.data.balance }));
            showToast(`+${d.data.points_awarded || 20} نقطة 🎉 تم تسجيل زيارتك بنجاح!`);
          } else {
            showToast(d.error?.message || 'يجب أن تكون بالقرب من المكان لتسجيل الزيارة');
          }
        } catch {
          showToast('حدث خطأ في الاتصال بالخادم');
        }
      },
      () => {
        showToast('يرجى تفعيل صلاحية تحديد الموقع (Location) لتسجيل الزيارة');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Feedback Submit
  const handleFeedbackSubmit = async () => {
    if (feedbackText.trim().length < 5) {
      showToast('اكتب رسالة من 5 أحرف على الأقل');
      return;
    }
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: feedbackKind, message: feedbackText.trim() })
      });
      const d = await res.json();
      setFeedbackLoading(false);
      if (d.ok) {
        setFeedbackText('');
        showToast(feedbackKind === 'complaint' ? 'وصلتنا شكوتك، سنراجعها بأسرع وقت 🙏' : 'شكرًا على اقتراحك 💡 وصلنا وسندرسه بعناية');
        go('home');
      } else {
        showToast(d.error?.message || 'حدث خطأ أثناء الإرسال');
      }
    } catch {
      setFeedbackLoading(false);
      showToast('حدث خطأ في الاتصال بالخادم');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (!curPass) {
      setPassMsg({ text: 'اكتب كلمة المرور الحالية', error: true });
      return;
    }
    if (newPass.length < 8) {
      setPassMsg({ text: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', error: true });
      return;
    }
    if (newPass !== newPass2) {
      setPassMsg({ text: 'كلمتا المرور غير متطابقتين', error: true });
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: curPass, new_password: newPass })
      });
      const d = await res.json();
      if (d.ok) {
        setPassMsg({ text: 'تم تغيير كلمة المرور بنجاح ✓', error: false });
        setCurPass('');
        setNewPass('');
        setNewPass2('');
        showToast('تم تغيير كلمة المرور');
      } else {
        setPassMsg({ text: d.error?.message || 'تعذر تغيير كلمة المرور', error: true });
      }
    } catch {
      setPassMsg({ text: 'حدث خطأ في الاتصال بالسيرفر', error: true });
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    document.body.classList.remove('entered');
    setScreen('welcome');
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Skyline SVG markup
  const SkylineSvg = (
    <svg viewBox="0 0 400 90" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 w-full h-12 sm:h-16 text-white" aria-hidden="true">
      <path d="M0 70c40-10 60 10 100 0s60-10 100 0 60 10 100 0 70-10 100 0v20H0z" fill="currentColor" opacity=".12"/>
      <path d="M0 80c50-8 70 8 120 0s70-8 120 0 70 8 160 0v10H0z" fill="currentColor" opacity=".18"/>
      <g fill="currentColor" opacity=".35">
        <path d="M330 20h10l3 40h-16z"/>
        <path d="M328 16h14l-7-9z"/>
        <rect x="326" y="58" width="18" height="6"/>
        <path d="M200 52h70l-8 12h-56zM222 40h22v12h-22zM230 32h6v8h-6z"/>
      </g>
    </svg>
  );

  return (
    <>
      {/* ========== 1. WELCOME SCREEN (Initial Splash Screen) ========== */}
      {screen === 'welcome' && (
        <div id="welcome" className="fixed inset-0 z-[60] text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="تبديل الوضع الليلي والنهاري"
            className="theme-fab absolute left-3 top-3 z-10 w-11 h-11 rounded-2xl bg-white/25 border-2 border-white/60 text-white backdrop-blur grid place-items-center hover:bg-white/35 transition shadow-lg"
          >
            <span className="theme-moon"><i className="fa-solid fa-moon"></i></span>
            <span className="theme-sun"><i className="fa-solid fa-sun"></i></span>
          </button>

          {/* 3 Background Zooming Photos */}
          <div className="wl-bg" aria-hidden="true">
            <div className="ph"><img src="/assets/port-said/port-said-lighthouse.webp" alt="Lighthouse" decoding="async" /></div>
            <div className="ph"><img src="/assets/port-said/port-said-port-night.webp" alt="Port Night" decoding="async" /></div>
            <div className="ph"><img src="/assets/port-said/port-said-mosque.webp" alt="Mosque" decoding="async" /></div>
          </div>
          <div className="wl-shade" aria-hidden="true"></div>

          {/* Center Card */}
          <div className="wl-card pop-in">
            <span className="brand-logo welcome-logo w-20 h-20 sm:w-24 sm:h-24 mx-auto float-card" role="img" aria-label="Port Said Hub"></span>
            <p dir="ltr" className="wl-brand">Port Said Hub</p>
            <div className="wl-rule"></div>
            <h2 className="wl-title">مرحبًا بك <em>يا صديقي</em></h2>
            <p className="wl-sub">كل بورسعيد في مكان واحد: مواصلات، مطاعم، فنادق، وأماكن تستاهل تزورها.</p>
            <div className="wl-chips">
              <span className="wl-chip"><i className="fa-solid fa-bus"></i>مواصلات</span>
              <span className="wl-chip"><i className="fa-solid fa-utensils"></i>مطاعم وكافيهات</span>
              <span className="wl-chip"><i className="fa-solid fa-hotel"></i>فنادق وسكن</span>
              <span className="wl-chip"><i className="fa-solid fa-star"></i>نقاط على المعالم</span>
            </div>
            <button
              id="welcome-btn"
              type="button"
              onClick={() => {
                if (user) {
                  setScreen('app');
                  document.body.classList.add('entered');
                } else {
                  setScreen('auth');
                }
              }}
              className="wl-cta"
            >
              هيا نبدأ <i className="fa-solid fa-arrow-left"></i>
            </button>
            <p className="wl-foot">بورسعيد.. المدينة الباسلة · فريق Alpha Team</p>
          </div>
        </div>
      )}

      {/* ========== 2. AUTH SCREEN (Slide-in Modal) ========== */}
      {screen === 'auth' && (
        <div id="auth" className="fixed inset-0 z-50 overflow-y-auto hero-bg waves-pattern">
          <div className="relative min-h-full grid place-items-center px-3 pb-4 pt-16">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="تبديل الوضع الليلي والنهاري"
              className="theme-fab absolute left-3 top-3 z-10 w-11 h-11 rounded-2xl bg-white/25 border-2 border-white/60 text-white backdrop-blur grid place-items-center hover:bg-white/35 transition shadow-lg"
            >
              <span className="theme-moon"><i className="fa-solid fa-moon"></i></span>
              <span className="theme-sun"><i className="fa-solid fa-sun"></i></span>
            </button>

            <div id="auth-card" className="w-full max-w-md md:max-w-4xl bg-sand-50 rounded-2xl shadow-2xl overflow-hidden md:grid md:grid-cols-5">
              {/* Left Brand Banner on Desktop */}
              <aside className="hidden md:flex md:col-span-2 hero-bg waves-pattern text-white p-8 flex-col justify-center gap-5">
                <span className="brand-logo w-20 h-20 rounded-3xl shadow-xl" role="img" aria-label="Port Said Hub"></span>
                <div>
                  <p dir="ltr" className="text-2xl font-black">Port Said Hub</p>
                  <p className="text-white/85 font-semibold">دليلك في بورسعيد</p>
                </div>
                <ul className="space-y-3 text-white/90 font-semibold">
                  <li><i className="fa-solid fa-bus ml-2 text-sand-400"></i>مواصلات من السكن للكلية</li>
                  <li><i className="fa-solid fa-utensils ml-2 text-sand-400"></i>مطاعم وكافيهات وحلويات</li>
                  <li><i className="fa-solid fa-hotel ml-2 text-sand-400"></i>فنادق وسكن وأماكن قريبة منك</li>
                  <li><i className="fa-solid fa-star ml-2 text-sand-400"></i>نقط على زيارة المعالم السياحية</li>
                </ul>
              </aside>

              {/* Right Form Container */}
              <div className="p-6 sm:p-8 md:col-span-3">
                <div className="flex items-center gap-3 font-extrabold text-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setScreen('welcome')}
                    aria-label="رجوع"
                    className="w-10 h-10 shrink-0 rounded-2xl bg-sand-100 text-ocean-700 grid place-items-center hover:bg-sand-200 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                  <span className="brand-logo w-12 h-12 shrink-0 rounded-2xl shadow-md" role="img" aria-label="Port Said Hub"></span>
                  <span dir="ltr">Port Said Hub</span>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-sand-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setAuthTab('login')}
                    className={`py-2.5 rounded-xl font-bold transition ${authTab === 'login' ? 'bg-white shadow text-ocean-700' : 'text-ocean-700/70'}`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`py-2.5 rounded-xl font-bold transition ${authTab === 'signup' ? 'bg-white shadow text-ocean-700' : 'text-ocean-700/70'}`}
                  >
                    إنشاء حساب
                  </button>
                </div>

                {/* Login Form */}
                {authTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    <div>
                      <label className="block font-semibold mb-1.5 text-base">رقم الهاتف / البريد الإلكتروني</label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="01xxxxxxxxx أو name@example.com"
                        value={loginId}
                        onChange={e => setLoginId(e.target.value)}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1.5 text-base">كلمة المرور</label>
                      <input
                        type="password"
                        dir="ltr"
                        value={loginPass}
                        onChange={e => setLoginPass(e.target.value)}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                      />
                    </div>
                    {loginErr && <p className="text-sm text-red-600 min-h-[1.25rem]">{loginErr}</p>}
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition disabled:opacity-60"
                    >
                      {loginLoading ? 'جارٍ التحقق...' : 'دخول'}
                    </button>
                  </form>
                )}

                {/* Signup Form Wizard */}
                {authTab === 'signup' && (
                  <form onSubmit={handleSignupSubmit} className="space-y-3" noValidate>
                    {/* Account Type Toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="signupAcct"
                          checked={signupAcct === 'user'}
                          onChange={() => setSignupAcct('user')}
                          className="peer sr-only"
                        />
                        <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-3 text-sm font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                          <i className="fa-solid fa-user text-lg"></i>زائر عادي
                        </span>
                      </label>
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="signupAcct"
                          checked={signupAcct === 'merchant'}
                          onChange={() => setSignupAcct('merchant')}
                          className="peer sr-only"
                        />
                        <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-3 text-sm font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                          <i className="fa-solid fa-store text-lg"></i>تاجر / صاحب بيزنس
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between text-sm font-bold text-ocean-700">
                      <span>الخطوة {wizardStep} من 3</span>
                      <div className="flex gap-1.5">
                        <span className={`w-6 h-1.5 rounded-full ${wizardStep >= 1 ? 'bg-teal2-600' : 'bg-sand-200'}`}></span>
                        <span className={`w-6 h-1.5 rounded-full ${wizardStep >= 2 ? 'bg-teal2-600' : 'bg-sand-200'}`}></span>
                        <span className={`w-6 h-1.5 rounded-full ${wizardStep >= 3 ? 'bg-teal2-600' : 'bg-sand-200'}`}></span>
                      </div>
                    </div>

                    {/* Step 1 */}
                    {wizardStep === 1 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block font-semibold mb-1 text-base">{signupAcct === 'merchant' ? 'اسمك (صاحب المتجر)' : 'الاسم'}</label>
                          <input
                            type="text"
                            value={signupName}
                            onChange={e => setSignupName(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>

                        {signupAcct === 'merchant' ? (
                          <>
                            <div>
                              <label className="block font-semibold mb-1 text-base">اسم المتجر</label>
                              <input
                                type="text"
                                placeholder="مثال: مطعم سمك البحر"
                                value={merchBiz}
                                onChange={e => setMerchBiz(e.target.value)}
                                className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1 text-base">نوع النشاط</label>
                              <select
                                value={merchCat}
                                onChange={e => setMerchCat(e.target.value)}
                                className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                              >
                                <option value="food">مطاعم</option>
                                <option value="cafe">كافيهات</option>
                                <option value="sweets">حلويات</option>
                                <option value="shop">تسوق</option>
                                <option value="sport">رياضة</option>
                                <option value="fun">معالم وترفيه</option>
                                <option value="other">أخرى</option>
                              </select>
                            </div>
                            {merchCat === 'other' && (
                              <div>
                                <label className="block font-semibold mb-1 text-base">اكتب نوع نشاطك</label>
                                <input
                                  type="text"
                                  placeholder="مثال: محل تصوير فوتوغرافي"
                                  value={merchCatOther}
                                  onChange={e => setMerchCatOther(e.target.value)}
                                  className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block font-semibold mb-1 text-base">الجنس</label>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="gender"
                                    checked={signupGender === 'male'}
                                    onChange={() => setSignupGender('male')}
                                    className="peer sr-only"
                                  />
                                  <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-2.5 text-sm font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                                    <i className="fa-solid fa-mars"></i>ذكر
                                  </span>
                                </label>
                                <label className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="gender"
                                    checked={signupGender === 'female'}
                                    onChange={() => setSignupGender('female')}
                                    className="peer sr-only"
                                  />
                                  <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-2.5 text-sm font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                                    <i className="fa-solid fa-venus"></i>أنثى
                                  </span>
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block font-semibold mb-1 text-base">أنت؟</label>
                              <div className="grid grid-cols-3 gap-2">
                                <label className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="signupType"
                                    checked={signupType === 'student'}
                                    onChange={() => setSignupType('student')}
                                    className="peer sr-only"
                                  />
                                  <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-2.5 text-xs font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                                    <i className="fa-solid fa-graduation-cap"></i>طالب
                                  </span>
                                </label>
                                <label className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="signupType"
                                    checked={signupType === 'visitor'}
                                    onChange={() => setSignupType('visitor')}
                                    className="peer sr-only"
                                  />
                                  <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-2.5 text-xs font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                                    <i className="fa-solid fa-suitcase-rolling"></i>سائح / مغترب
                                  </span>
                                </label>
                                <label className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="signupType"
                                    checked={signupType === 'local'}
                                    onChange={() => setSignupType('local')}
                                    className="peer sr-only"
                                  />
                                  <span className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sand-200 bg-white py-2.5 text-xs font-bold transition peer-checked:border-teal2-500 peer-checked:bg-teal2-100 peer-checked:text-teal2-600">
                                    <i className="fa-solid fa-house"></i>من بورسعيد
                                  </span>
                                </label>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 2 */}
                    {wizardStep === 2 && (
                      <div className="space-y-3">
                        {signupAcct === 'merchant' ? (
                          <>
                            <div>
                              <label className="block font-semibold mb-1 text-base">المنطقة</label>
                              <input
                                type="text"
                                placeholder="مثال: حي الشرق"
                                value={merchArea}
                                onChange={e => setMerchArea(e.target.value)}
                                className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold mb-1 text-sm">نسبة الخصم للعميل %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={merchDisc}
                                  onChange={e => setMerchDisc(Number(e.target.value))}
                                  className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold mb-1 text-sm">عمولة Alpha (ج)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={merchComm}
                                  onChange={e => setMerchComm(Number(e.target.value))}
                                  className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block font-semibold mb-1 text-base">الرقم الضريبي</label>
                              <input
                                type="text"
                                placeholder="مثال: 123-456-789"
                                value={merchTax}
                                onChange={e => setMerchTax(e.target.value)}
                                className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            {signupType === 'student' && (
                              <div>
                                <label className="block font-semibold mb-1 text-base">الكلية / المدرسة</label>
                                <select
                                  value={signupInst}
                                  onChange={e => setSignupInst(e.target.value)}
                                  className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                                >
                                  <option value="">اختر الكلية أو المدرسة</option>
                                  <option value="كلية الهندسة — جامعة بورسعيد">كلية الهندسة — جامعة بورسعيد</option>
                                  <option value="كلية الطب البشري — جامعة بورسعيد">كلية الطب البشري — جامعة بورسعيد</option>
                                  <option value="كلية التجارة — جامعة بورسعيد">كلية التجارة — جامعة بورسعيد</option>
                                  <option value="كلية الصيدلة — جامعة بورسعيد">كلية الصيدلة — جامعة بورسعيد</option>
                                  <option value="كلية التكنولوجيا والحقوق">كلية التكنولوجيا والحقوق</option>
                                  <option value="كلية التربية النوعية">كلية التربية النوعية</option>
                                  <option value="جامعة شرق بورسعيد الأهلية">جامعة شرق بورسعيد الأهلية</option>
                                </select>
                              </div>
                            )}

                            {signupType !== 'local' && (
                              <div>
                                <label className="block font-semibold mb-1 text-base">المحافظة</label>
                                <select
                                  value={signupGov}
                                  onChange={e => setSignupGov(e.target.value)}
                                  className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                                >
                                  <option value="">اختر المحافظة</option>
                                  <option>القاهرة</option>
                                  <option>الإسكندرية</option>
                                  <option>الجيزة</option>
                                  <option>الدقهلية</option>
                                  <option>الشرقية</option>
                                  <option>الإسماعيلية</option>
                                  <option>السويس</option>
                                  <option>دمياط</option>
                                </select>
                              </div>
                            )}
                          </>
                        )}

                        <div>
                          <label className="block font-semibold mb-1 text-base">رقم الهاتف</label>
                          <input
                            type="tel"
                            dir="ltr"
                            placeholder="01xxxxxxxxx"
                            maxLength={11}
                            value={signupPhone}
                            onChange={e => setSignupPhone(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 3 */}
                    {wizardStep === 3 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block font-semibold mb-1 text-base">البريد الإلكتروني <span className="text-red-600">*</span></label>
                          <input
                            type="email"
                            dir="ltr"
                            placeholder="name@example.com"
                            value={signupEmail}
                            onChange={e => setSignupEmail(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-base">كلمة المرور (8 أحرف على الأقل)</label>
                          <input
                            type="password"
                            dir="ltr"
                            value={signupPass}
                            onChange={e => setSignupPass(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-base">تأكيد كلمة المرور</label>
                          <input
                            type="password"
                            dir="ltr"
                            value={signupPass2}
                            onChange={e => setSignupPass2(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                      </div>
                    )}

                    {signupErr && <p className="text-sm text-red-600 min-h-[1.25rem]">{signupErr}</p>}

                    <div className="flex gap-2 pt-2">
                      {wizardStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setWizardStep(prev => prev - 1)}
                          className="px-5 rounded-2xl bg-sand-200 text-ocean-700 font-bold hover:bg-sand-100 transition"
                        >
                          السابق
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={signupLoading}
                        className="flex-1 bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3 rounded-2xl shadow-lg transition disabled:opacity-60"
                      >
                        {signupLoading ? 'جارٍ المعالجة...' : wizardStep === 3 ? (signupAcct === 'merchant' ? 'تسجيل حساب التاجر' : 'إنشاء الحساب') : 'التالي'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== 3. INTRO DIALOG (After User Registration) ========== */}
      {showIntro && (
        <div id="intro" className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl bg-sand-50 text-ocean-900 shadow-2xl">
            <div className="hero-bg waves-pattern text-white p-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-black">أهلًا بيك في بورسعيد</h2>
              <p className="mt-1 text-white/85">مدينة البحر والقناة</p>
            </div>
            <div className="p-6 space-y-4 leading-loose">
              <p>بورسعيد مدينة على البحر المتوسط ومدخل قناة السويس، فيها الحي الإفرنجي بشرفاته الخشب، والفنار، والممشى السياحي، وناس طيبين بيرحبوا بأي حد جديد.</p>
              <p><b>Port Said Hub</b> اتعمل عشانك: تعرف تروح كليتك من السكن بالمواصلات، وتلاقي المطاعم والكافيهات والحلويات والفنادق والأماكن، وكل ده بالعربي وبسهولة، سواء طالب أو مغترب أو زائر.</p>
              <p>إحنا فريق Alpha Team بنحب بورسعيد وعايزين كل واحد يحس إنه في بيته فيها. وتقدر تكسب نقط لما تزور المعالم السياحية.</p>
              <button
                type="button"
                onClick={() => {
                  setShowIntro(false);
                  setScreen('app');
                  document.body.classList.add('entered');
                  showToast('أهلًا بك في دليلك في بورسعيد!');
                }}
                className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition"
              >
                يلا نبدأ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 4. MAIN APP INTERFACE ========== */}
      {screen === 'app' && (
        <div className="min-h-screen flex flex-col justify-between">
          <div>
            {/* Header / Navbar */}
            <header className="hero-bg waves-pattern text-white">
              {/* Decorative side graphics */}
              <div className="hdr-deco pointer-events-none absolute inset-0 overflow-hidden hidden 2xl:block" aria-hidden="true">
                <svg viewBox="0 0 100 220" width="64" height="141" style={{ left: '3rem' }} fill="currentColor">
                  <path d="M0 70 L38 36 M100 70 L62 36" stroke="currentColor" strokeWidth="3" opacity=".6"/>
                  <path d="M38 34 Q50 6 62 34Z"/>
                  <rect x="40" y="34" width="20" height="18" rx="2"/>
                  <rect x="33" y="52" width="34" height="6" rx="2"/>
                  <path d="M40 58h20l9 142H31z"/>
                  <rect x="20" y="200" width="60" height="16" rx="3"/>
                </svg>
              </div>

              <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
                {/* Brand Logo & Title */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => go('home')}
                  className="flex items-center gap-3 min-w-0 font-extrabold cursor-pointer select-none hover:opacity-90 active:scale-95 transition"
                >
                  <span className="brand-logo header-logo w-11 h-11 sm:w-12 sm:h-12 shrink-0" role="img" aria-label="Port Said Hub"></span>
                  <div className="leading-tight min-w-0">
                    <p dir="ltr" className="text-sm min-[400px]:text-base sm:text-lg font-extrabold truncate text-right">Port Said Hub</p>
                    <p className="text-[11px] min-[400px]:text-xs sm:text-sm font-semibold text-white/80 truncate">بورسعيد.. المدينة الباسلة</p>
                  </div>
                </div>

                {/* Center Action */}
                <div className="hidden md:flex flex-1 items-center justify-center gap-2 lg:gap-3 min-w-0 px-2">
                  <button
                    type="button"
                    onClick={() => go('feedback')}
                    className="hdr-act teal"
                  >
                    <span className="ic-bub"><i className="fa-solid fa-comment-dots"></i></span>
                    شكاوى واقتراحات
                  </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Points Pill */}
                  <span id="pts-pill" className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/15 border border-white/30 rounded-full px-3 sm:px-3.5 py-2 font-bold text-sm">
                    <i className="fa-solid fa-star text-sand-400"></i>
                    <span>{user?.points_balance ?? 0}</span>
                    <span className="hidden sm:inline">نقطة</span>
                  </span>

                  {/* Theme Button */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label="تبديل الوضع الليلي والنهاري"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/25 border-2 border-white/60 text-white grid place-items-center hover:bg-white/35 transition shadow-lg"
                  >
                    <span className="theme-moon"><i className="fa-solid fa-moon"></i></span>
                    <span className="theme-sun"><i className="fa-solid fa-sun"></i></span>
                  </button>

                  {/* Notifications Bell */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBellOpen(prev => !prev)}
                      aria-label="الإشعارات"
                      className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/25 border-2 border-white/60 text-white grid place-items-center hover:bg-white/35 transition shadow-lg"
                    >
                      <i className="fa-solid fa-bell"></i>
                      {unreadNotifs > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-coral-500 text-white text-[11px] font-black grid place-items-center border-2 border-white">
                          {unreadNotifs}
                        </span>
                      )}
                    </button>

                    {bellOpen && (
                      <div className="absolute left-0 top-12 sm:top-14 z-50 w-80 bg-sand-50 text-ocean-900 rounded-2xl shadow-2xl overflow-hidden drop-in" style={{ maxWidth: 'calc(100vw - 1.5rem)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-200">
                          <p className="font-extrabold">الإشعارات</p>
                          <button
                            type="button"
                            onClick={() => setUnreadNotifs(0)}
                            className="text-xs font-bold text-teal2-600 hover:underline"
                          >
                            تعليم الكل كمقروء
                          </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm text-center text-ocean-700/80">
                          مرحبًا بك في Port Said Hub! لا توجد إشعارات جديدة حاليًا.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen(prev => !prev)}
                      aria-label="حسابي"
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sand-400 text-ocean-900 grid place-items-center hover:bg-sand-200 transition shadow-lg"
                    >
                      <i className="fa-solid fa-user"></i>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute left-0 top-12 sm:top-14 z-50 w-64 bg-sand-50 text-ocean-900 rounded-2xl shadow-2xl p-4 drop-in">
                        <div className="flex items-center gap-3 pb-3 border-b border-sand-200">
                          <span className="w-11 h-11 shrink-0 rounded-2xl bg-ocean-100 text-ocean-700 grid place-items-center">
                            <i className="fa-solid fa-user"></i>
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{user?.name || 'صديقي'}</p>
                            <p dir="ltr" className="text-sm text-ocean-700/70 truncate text-right">{user?.email || ''}</p>
                            {user?.role_id === 1 && (
                              <span className="mt-1 inline-block rounded-full bg-red-100 text-red-600 text-xs font-bold px-2.5 py-0.5">
                                مسؤول النظام
                              </span>
                            )}
                          </div>
                        </div>

                        {user?.role_id === 1 && (
                          <a
                            href="/admin"
                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-ocean-900 text-white font-bold py-2.5 hover:bg-ocean-700 transition"
                          >
                            <i className="fa-solid fa-gauge-high"></i> لوحة التحكم
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => go('partner')}
                          className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-teal2-600 text-white font-bold py-2.5 hover:bg-teal2-500 transition"
                        >
                          <i className="fa-solid fa-store"></i> لوحة التاجر
                        </button>

                        <button
                          type="button"
                          onClick={() => go('account')}
                          className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-sand-100 text-ocean-700 font-bold py-2.5 hover:bg-teal2-100 transition"
                        >
                          <i className="fa-solid fa-id-card"></i> معلومات الحساب
                        </button>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-ocean-100 text-ocean-700 font-bold py-2.5 hover:bg-teal2-100 transition"
                        >
                          <i className="fa-solid fa-right-from-bracket"></i> تسجيل الخروج
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </nav>
              <div className="h-6 sm:h-8"></div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-8 min-h-[60vh]">
              {/* ===== HOME VIEW ===== */}
              {currentView.view === 'home' && (
                <div className="pop-in space-y-4">
                  {/* Hero Slideshow Card */}
                  <div className="relative overflow-hidden rounded-2xl hero-bg text-white p-4 sm:p-6 pb-14 sm:pb-16 mb-4 shadow-xl">
                    <div className="absolute inset-0" aria-hidden="true">
                      {['/assets/port-said/hero-01.webp', '/assets/port-said/hero-02.webp', '/assets/port-said/hero-03.webp'].map((src, i) => (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1800ms] ${heroIndex === i ? 'opacity-60' : 'opacity-0'}`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/70 to-ocean-900/20"></div>
                    <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold">
                      أهلًا يا <span>{getShortName(user?.name || '')}</span>
                    </h2>
                    <p className="relative z-10 mt-1 text-lg text-white/90">عايز تروح فين النهاردة؟</p>
                    {SkylineSvg}
                  </div>

                  {/* 10 Category Tiles Grid */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                    {Object.keys(CATS).map((k) => {
                      const c = CATS[k];
                      const wide = k === 'bus' ? ' col-span-3' : '';
                      const tint = TINT[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            if (k === 'bus' || k === 'housing' || k === 'explore') go(k);
                            else go('list', k);
                          }}
                          className={`group bg-white${wide} rounded-2xl p-2.5 sm:p-4 text-center min-h-[5.5rem] sm:min-h-[7rem] flex flex-col items-center justify-center gap-2 shadow-md shadow-ocean-700/10 border-b-4 hover:-translate-y-1 hover:shadow-xl transition`}
                          style={{ borderColor: tint }}
                        >
                          <span
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl grid place-items-center"
                            style={{ background: `${tint}1a`, color: tint }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              {IC_PATHS[k]}
                            </svg>
                          </span>
                          <span className="text-sm sm:text-base font-extrabold leading-tight text-ocean-900">
                            {c.t}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Memories Card */}
                  <button
                    type="button"
                    onClick={() => go('memories')}
                    className="mt-4 w-full rounded-2xl p-4 text-right text-white flex items-center gap-4 shadow-lg hover:-translate-y-1 transition"
                    style={{ background: 'linear-gradient(120deg,#6f55c4,#c9391f)' }}
                  >
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 grid place-items-center text-2xl">
                      <i className="fa-solid fa-camera-retro"></i>
                    </span>
                    <span className="min-w-0">
                      <b className="block text-lg font-extrabold">ذكرياتك في بورسعيد 📸</b>
                      <span className="text-sm text-white/90">ارفع الصور اللي صورتها في بورسعيد وشارك لحظاتك.</span>
                    </span>
                  </button>

                  {/* WhatsApp Share Card */}
                  <button
                    type="button"
                    onClick={handleShareClaim}
                    className="mt-4 w-full rounded-2xl p-4 text-right text-white flex items-center gap-4 shadow-lg hover:-translate-y-1 transition"
                    style={{ background: 'linear-gradient(120deg,#128c7e,#25d366)' }}
                  >
                    <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/20 grid place-items-center text-2xl">
                      <i className="fa-brands fa-whatsapp"></i>
                    </span>
                    <span className="min-w-0">
                      <b className="block text-lg font-extrabold">شير واكسب +50 نقطة</b>
                      <span className="text-sm text-white/90">شارك الموقع مع صحابك على واتساب وخد نقاطك فورًا (مرة واحدة بس).</span>
                    </span>
                  </button>

                  {/* Photo Gallery Carousel */}
                  <section className="mt-5">
                    <h3 className="mb-2 text-lg font-extrabold">
                      <i className="fa-solid fa-image text-teal2-600 ml-2"></i>لمحات من بورسعيد
                    </h3>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3">
                      {(galleryItems.length ? galleryItems : [
                        { src: '/assets/port-said/gallery/balconies-street.webp', cap: 'شرفات الحي الإفرنجي' },
                        { src: '/assets/port-said/gallery/martyrs-square.webp', cap: 'ميدان الشهداء' },
                        { src: '/assets/port-said/gallery/ship.webp', cap: 'سفن القناة' },
                        { src: '/assets/port-said/port-said-lighthouse.webp', cap: 'فنار بورسعيد' },
                        { src: '/assets/port-said/port-said-mosque.webp', cap: 'مسجد السلام' }
                      ]).map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightbox({ show: true, src: item.src, cap: item.cap || '' })}
                          className="relative shrink-0 w-36 sm:w-48 aspect-[4/3] rounded-2xl overflow-hidden shadow-md"
                        >
                          <img src={item.src} alt={item.cap || ''} className="w-full h-full object-cover" />
                          {item.cap && (
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs font-bold p-2 text-right">
                              {item.cap}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Feedback Card Button */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => go('feedback')}
                      className="w-full bg-white rounded-2xl p-3 sm:p-4 shadow-md shadow-ocean-700/10 border-b-4 border-teal2-500 hover:-translate-y-1 hover:shadow-xl transition flex items-center justify-center gap-3 font-extrabold text-ocean-900"
                    >
                      <i className="fa-solid fa-comment-dots text-teal2-600 text-xl"></i>
                      <span>شكاوى واقتراحات</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ===== LIST VIEW (Places in Category) ===== */}
              {currentView.view === 'list' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                    {CATS[currentView.arg || '']?.t || 'الأماكن'}
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {places
                      .filter(p => {
                        const catKey = currentView.arg;
                        return p.category?.code === catKey || p.cat === catKey;
                      })
                      .map((p) => {
                        const tint = TINT[currentView.arg || ''] || '#0b2a5b';
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => go('place', p.id)}
                            className="bg-white rounded-2xl p-3 sm:p-4 text-right shadow-md shadow-ocean-700/5 hover:shadow-xl hover:-translate-y-1 transition"
                          >
                            <span
                              className="w-10 h-10 rounded-xl grid place-items-center mb-2"
                              style={{ background: `${tint}1a`, color: tint }}
                            >
                              <i className={`fa-solid ${CATS[currentView.arg || '']?.i || 'fa-location-dot'}`}></i>
                            </span>
                            <p className="text-base font-extrabold leading-snug">{p.name_ar || p.n}</p>
                            <p className="text-sm text-ocean-700/80 mt-1">بورسعيد · {p.area_ar || p.a}</p>
                            {p.discount_percent > 0 && (
                              <span className="mt-2 inline-block rounded-full bg-coral-50 text-coral-500 font-bold text-xs px-2.5 py-0.5">
                                خصم {p.discount_percent}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ===== PLACE DETAILS VIEW ===== */}
              {currentView.view === 'place' && (() => {
                const p = places.find(x => x.id === currentView.arg) || places[0];
                if (!p) return null;
                const catCode = p.category?.code || p.cat || 'food';
                return (
                  <div className="pop-in">
                    <button
                      type="button"
                      onClick={() => go('list', catCode)}
                      className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                    >
                      <i className="fa-solid fa-arrow-right"></i> رجوع
                    </button>
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-2xl">
                      <span className="inline-block rounded-full bg-ocean-900 text-white text-sm font-bold px-4 py-1.5">
                        {CATS[catCode]?.t || 'مكان'}
                      </span>
                      <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">{p.name_ar || p.n}</h2>
                      <p className="text-ocean-700/80">بورسعيد · {p.area_ar || p.a}</p>
                      {p.description_ar && (
                        <p className="mt-3 whitespace-pre-line text-sm sm:text-base leading-relaxed text-ocean-900/90">
                          {p.description_ar}
                        </p>
                      )}

                      {/* Map & Direction Buttons */}
                      <div className="mt-5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.name_ar || p.n) + ' بورسعيد')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-2xl bg-sand-400 text-ocean-900 font-extrabold text-center py-3.5 hover:bg-sand-200 transition"
                        >
                          اعرض على الخريطة
                        </a>
                        <button
                          type="button"
                          onClick={() => go('bus')}
                          className="btn-outline rounded-2xl font-extrabold py-3.5 transition"
                        >
                          أروح إزاي؟
                        </button>
                      </div>

                      {/* Checkin / Visit Point */}
                      <div className="mt-4 rounded-2xl border border-sand-200 bg-sand-50 p-5">
                        <p className="font-extrabold">زيارة المكان</p>
                        <p className="text-sm text-ocean-700/80 mb-3">
                          سجّل حضورك في المكان واكسب ({p.visit_points || 20} نقطة) بتحديد موقعك الجغرافي.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCheckin(p)}
                          className="w-full rounded-2xl bg-sand-400 text-ocean-900 font-extrabold py-3 hover:bg-sand-200 transition"
                        >
                          <i className="fa-solid fa-location-crosshairs ml-2"></i>سجّل حضورك واكسب النقاط
                        </button>
                      </div>

                      {/* Discount Coupon Card */}
                      {(p.discount_percent || 10) > 0 && (
                        <div className="mt-4 rounded-2xl border-2 border-coral-500/50 bg-white p-5">
                          <p className="font-extrabold text-lg">
                            <i className="fa-solid fa-ticket text-coral-500 ml-2"></i>
                            خصم {p.discount_percent || 10}% في المكان ده
                          </p>
                          <p className="text-sm text-ocean-700/80 mt-1 mb-3">
                            اضغط على الزر وهيطلعلك كود QR بنسبة الخصم، والتاجر يمسحه من حسابه.
                          </p>
                          <button
                            type="button"
                            onClick={() => requestCoupon(p)}
                            className="w-full rounded-2xl bg-coral-500 text-white font-extrabold py-3 hover:opacity-90 transition"
                          >
                            <i className="fa-solid fa-qrcode ml-2"></i>احصل على كود الخصم الآن
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ===== BUS / TRANSPORT PLANNER VIEW ===== */}
              {currentView.view === 'bus' && (() => {
                const planResult = planTransit(transFrom, transTo);
                return (
                  <div className="pop-in">
                    <button
                      type="button"
                      onClick={() => go('home')}
                      className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                    >
                      <i className="fa-solid fa-arrow-right"></i> رجوع
                    </button>
                    <h2 className="text-2xl sm:text-3xl font-extrabold">مواصلات</h2>
                    <p className="mt-1 text-ocean-700/80">اختار رايح منين ولفين، وهنقولك تركب إيه. المسارات من تجارب الطلبة.</p>

                    <div className="mt-4 max-w-3xl rounded-2xl bg-white shadow-xl p-4 sm:p-5">
                      <div className="grid min-[480px]:grid-cols-[1fr_auto_1fr] gap-2 items-end">
                        <div>
                          <label className="block text-sm font-bold text-ocean-700 mb-1">من</label>
                          <select
                            value={transFrom}
                            onChange={e => setTransFrom(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          >
                            {STOPS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const prevFrom = transFrom;
                            setTransFrom(transTo);
                            setTransTo(prevFrom);
                          }}
                          className="mx-auto w-10 h-10 rounded-full bg-sand-100 text-ocean-700 grid place-items-center hover:bg-sand-200 transition"
                        >
                          <i className="fa-solid fa-arrow-right-arrow-left"></i>
                        </button>

                        <div>
                          <label className="block text-sm font-bold text-ocean-700 mb-1">إلى</label>
                          <select
                            value={transTo}
                            onChange={e => setTransTo(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          >
                            {STOPS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Shortcuts */}
                      <p className="mt-3 text-sm font-bold text-ocean-700">اختصارات من السكن الجامعي</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['كلية الطب والعلاج الطبيعي', 'كلية التكنولوجيا والحقوق', 'كلية التربية النوعية', 'كلية الصيدلة'].map(dest => (
                          <button
                            key={dest}
                            type="button"
                            onClick={() => {
                              setTransFrom(HOME_STOP);
                              setTransTo(dest);
                            }}
                            className="rounded-full bg-white border border-sand-200 text-ocean-700 font-bold text-sm px-4 py-2 hover:bg-teal2-100 transition"
                          >
                            {dest.replace('كلية ', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Results Box */}
                    <div className="mt-3 max-w-3xl rounded-2xl bg-white shadow-md p-5 sm:p-6">
                      {transFrom === transTo ? (
                        <p className="text-ocean-700/80">أنت أصلًا في نفس المكان.</p>
                      ) : !planResult || planResult.length === 0 ? (
                        <p className="text-ocean-700/80">مفيش مسار متاح بين النقطتين دول لسه. اسأل السواق أو زمايلك.</p>
                      ) : (
                        <>
                          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal2-100 text-teal2-600 font-bold text-sm px-3 py-1">
                            {planResult.length === 1 ? 'رحلة مباشرة' : `تغيير ${planResult.length - 1} مرة`}
                          </p>
                          <ol>
                            {planResult.map((x, i) => (
                              <li key={i} className="relative pe-0 ps-0 flex gap-3">
                                <span className="flex flex-col items-center">
                                  <span className="w-9 h-9 shrink-0 rounded-full bg-teal2-600 text-white grid place-items-center font-extrabold">
                                    {i + 1}
                                  </span>
                                  {i < planResult.length - 1 && <span className="flex-1 w-0.5 bg-sand-200 my-1"></span>}
                                </span>
                                <div className="pb-5 min-w-0">
                                  <p className="font-extrabold">
                                    اركب خط <span className="rounded-lg bg-ocean-900 text-white px-2 py-0.5 text-base">{x.l}</span>
                                  </p>
                                  <p className="text-ocean-700/80">من {x.f}</p>
                                  <p className="font-bold">وانزل عند {x.t}</p>
                                  {NOTE[`${x.l}|${x.t}`] && (
                                    <p className="mt-1 text-sm font-bold text-coral-500">
                                      <i className="fa-solid fa-circle-info ml-1"></i>{NOTE[`${x.l}|${x.t}`]}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ===== EXPLORE VIEW ===== */}
              {currentView.view === 'explore' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">استكشف بورسعيد</h2>
                  <p className="mt-1 text-lg text-ocean-700/80">تعرّف على بورسعيد وشوف أهم اللقطات السياحية.</p>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6">
                    {[
                      { t: 'فنار بورسعيد التاريخي', src: '/assets/port-said/port-said-lighthouse.webp' },
                      { src: '/assets/port-said/port-said-port-night.webp', t: 'ميناء بورسعيد وقناة السويس' },
                      { src: '/assets/port-said/port-said-mosque.webp', t: 'مسجد السلام الكبير' },
                      { src: '/assets/port-said/gallery/balconies-street.webp', t: 'شرفات الحي الإفرنجي الخشبية' },
                      { src: '/assets/port-said/gallery/martyrs-square.webp', t: 'ميدان الشهداء والمسلة' },
                      { src: '/assets/port-said/gallery/ship.webp', t: 'سفن القناة والممشى السياحي' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightbox({ show: true, src: item.src, cap: item.t })}
                        className="group relative block overflow-hidden rounded-2xl shadow-md bg-white text-right"
                      >
                        <img src={item.src} alt={item.t} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition duration-500" />
                        <span className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/70 to-transparent text-white font-bold text-sm">
                          {item.t}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== MEMORIES VIEW ===== */}
              {currentView.view === 'memories' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">
                    <i className="fa-solid fa-camera-retro text-coral-500 ml-2"></i>ذكرياتك في بورسعيد
                  </h2>
                  <p className="mt-1 text-lg text-ocean-700/80">
                    ارفع صورك من بورسعيد وشارك ذكرياتك ولحظاتك الجميلة على الكورنيش والممشى السياحي.
                  </p>

                  <div className="mt-4 rounded-2xl bg-white p-4 sm:p-5 shadow-md max-w-2xl grid gap-3">
                    <div>
                      <label className="block font-semibold mb-1.5">الصورة</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMemFile(file);
                            setMemPrev(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3"
                      />
                      {memPrev && <img src={memPrev} alt="preview" className="mt-2 w-full max-h-64 object-cover rounded-2xl" />}
                    </div>
                    <div>
                      <label className="block font-semibold mb-1.5">تعليق (اختياري)</label>
                      <input
                        type="text"
                        placeholder="مثال: غروب ساحر على كورنيش بورسعيد"
                        value={memCap}
                        onChange={e => setMemCap(e.target.value)}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={memUploading}
                      onClick={() => {
                        if (!memFile) {
                          showToast('اختر صورة أولاً');
                          return;
                        }
                        setMemUploading(true);
                        setTimeout(() => {
                          setMemUploading(false);
                          setMemFile(null);
                          setMemPrev(null);
                          setMemCap('');
                          showToast('تم رفع الصورة للمراجعة بنجاح 📸');
                        }, 1200);
                      }}
                      className="w-full bg-coral-500 hover:opacity-90 text-white font-extrabold py-3 rounded-2xl shadow-lg transition"
                    >
                      <i className="fa-solid fa-cloud-arrow-up ml-2"></i>{memUploading ? 'جارٍ الرفع...' : 'ارفع الصورة'}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== ACCOUNT VIEW ===== */}
              {currentView.view === 'account' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <section className="hero-bg waves-pattern text-white rounded-2xl shadow-lg p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                    <span className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sand-400 text-ocean-900 text-2xl font-black grid place-items-center ring-2 ring-white/40">
                      {(user?.name || 'م').charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-2xl font-black truncate">{user?.name || 'صديقي'}</h2>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="inline-block rounded-full bg-white/20 border border-white/30 text-xs font-bold px-2.5 py-0.5">
                          {user?.role_id === 1 ? 'مسؤول' : 'عضو نشط'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white/15 border border-white/30 px-3 py-1.5 text-center leading-tight">
                      <p className="text-xl sm:text-2xl font-black">
                        <i className="fa-solid fa-star text-sand-400 text-base ml-1"></i>{user?.points_balance || 0}
                      </p>
                      <p className="text-xs text-white/80 font-semibold">نقطة</p>
                    </div>
                  </section>

                  <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
                    {/* Personal Info */}
                    <section className="bg-white rounded-3xl shadow-xl p-6 sm:p-7">
                      <h3 className="text-xl font-extrabold mb-4">
                        <i className="fa-solid fa-id-card text-teal2-600 ml-2"></i>البيانات الشخصية
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 py-2 border-b border-sand-200">
                          <span className="w-10 h-10 rounded-xl bg-ocean-100 text-ocean-700 grid place-items-center">
                            <i className="fa-solid fa-user"></i>
                          </span>
                          <div>
                            <p className="text-xs text-ocean-700/70">الاسم</p>
                            <p className="font-bold">{user?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2 border-b border-sand-200">
                          <span className="w-10 h-10 rounded-xl bg-ocean-100 text-ocean-700 grid place-items-center">
                            <i className="fa-solid fa-envelope"></i>
                          </span>
                          <div>
                            <p className="text-xs text-ocean-700/70">البريد الإلكتروني</p>
                            <p className="font-bold" dir="ltr">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <span className="w-10 h-10 rounded-xl bg-ocean-100 text-ocean-700 grid place-items-center">
                            <i className="fa-solid fa-phone"></i>
                          </span>
                          <div>
                            <p className="text-xs text-ocean-700/70">رقم الهاتف</p>
                            <p className="font-bold" dir="ltr">{user?.phone || 'غير مسجل'}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Change Password */}
                    <section className="bg-white rounded-3xl shadow-xl p-6 sm:p-7">
                      <h3 className="text-xl font-extrabold mb-1">
                        <i className="fa-solid fa-shield-halved text-teal2-600 ml-2"></i>الأمان وكلمة المرور
                      </h3>
                      <p className="text-sm text-ocean-700/80 mb-4">
                        كلمة المرور تُحفظ مشفرة في قاعدة البيانات Supabase ومحمية بأعلى معايير الأمان.
                      </p>
                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                          <label className="block font-semibold mb-1 text-sm">كلمة المرور الحالية</label>
                          <input
                            type="password"
                            dir="ltr"
                            value={curPass}
                            onChange={e => setCurPass(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-sm">كلمة المرور الجديدة</label>
                          <input
                            type="password"
                            dir="ltr"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-sm">تأكيد كلمة المرور الجديدة</label>
                          <input
                            type="password"
                            dir="ltr"
                            value={newPass2}
                            onChange={e => setNewPass2(e.target.value)}
                            className="w-full rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                          />
                        </div>

                        {passMsg && (
                          <p className={`text-sm font-bold ${passMsg.error ? 'text-red-600' : 'text-teal2-600'}`}>
                            {passMsg.text}
                          </p>
                        )}

                        <button
                          type="submit"
                          className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3 rounded-2xl shadow-lg transition"
                        >
                          <i className="fa-solid fa-lock ml-2"></i>حفظ كلمة المرور
                        </button>
                      </form>
                    </section>
                  </div>
                </div>
              )}

              {/* ===== FEEDBACK VIEW ===== */}
              {currentView.view === 'feedback' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">شكاوى واقتراحات</h2>
                  <p className="mt-1 text-ocean-700/80">رأيك بيطوّر Port Said Hub. قولنا إيه اللي مضايقك أو إيه اللي نضيفه، وإحنا بنقرا كل رسالة.</p>

                  <div className="mt-5 rounded-2xl bg-white p-4 sm:p-5 shadow-md max-w-2xl">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-sand-200 mb-4">
                      <button
                        type="button"
                        onClick={() => setFeedbackKind('suggestion')}
                        className={`py-2.5 rounded-xl font-bold transition ${feedbackKind === 'suggestion' ? 'bg-white shadow text-ocean-700' : 'text-ocean-700/70'}`}
                      >
                        <i className="fa-solid fa-lightbulb ml-1"></i>اقتراح
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackKind('complaint')}
                        className={`py-2.5 rounded-xl font-bold transition ${feedbackKind === 'complaint' ? 'bg-white shadow text-ocean-700' : 'text-ocean-700/70'}`}
                      >
                        <i className="fa-solid fa-triangle-exclamation ml-1"></i>شكوى
                      </button>
                    </div>

                    <label className="block font-semibold mb-1.5">رسالتك</label>
                    <textarea
                      rows={5}
                      maxLength={1000}
                      placeholder="اكتب هنا بالتفصيل..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal2-500"
                    ></textarea>
                    <div className="flex items-center justify-between text-sm text-ocean-700/70 mt-1 mb-4">
                      <span>{feedbackText.length} / 1000</span>
                      <span>الحد الأدنى 5 حروف</span>
                    </div>

                    <button
                      type="button"
                      disabled={feedbackLoading}
                      onClick={handleFeedbackSubmit}
                      className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition disabled:opacity-60"
                    >
                      <i className="fa-solid fa-paper-plane ml-2"></i>{feedbackLoading ? 'جارٍ الإرسال...' : 'إرسال'}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== PARTNER VIEW ===== */}
              {currentView.view === 'partner' && (
                <div className="pop-in">
                  <button
                    type="button"
                    onClick={() => go('home')}
                    className="mb-5 inline-flex items-center gap-2 font-bold text-ocean-700 hover:text-teal2-600 transition"
                  >
                    <i className="fa-solid fa-arrow-right"></i> رجوع
                  </button>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">سجل متجرك</h2>
                  <p className="mt-1 text-ocean-700/80">انضم لشبكة شركائنا في بورسعيد ووصل مكانك لآلاف الزوار والطلاب مع إمكانية تقديم كوبونات خصم خاصة.</p>

                  <div className="mt-5 rounded-2xl bg-white p-6 shadow-md max-w-2xl space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">اسم المتجر / الكافيه</label>
                      <input
                        type="text"
                        placeholder="مثال: أسماك الشاطئ"
                        value={merchBiz}
                        onChange={e => setMerchBiz(e.target.value)}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">المنطقة</label>
                      <input
                        type="text"
                        placeholder="مثال: حي الشرق"
                        value={merchArea}
                        onChange={e => setMerchArea(e.target.value)}
                        className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">نسبة الخصم %</label>
                        <input
                          type="number"
                          value={merchDisc}
                          onChange={e => setMerchDisc(Number(e.target.value))}
                          className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">عمولة المنصة (ج)</label>
                        <input
                          type="number"
                          value={merchComm}
                          onChange={e => setMerchComm(Number(e.target.value))}
                          className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        showToast('تم استلام طلبك بنجاح! سيتواصل معك فريق Alpha قريبًا');
                        go('home');
                      }}
                      className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition"
                    >
                      <i className="fa-solid fa-store ml-2"></i>إرسال طلب الانضمام
                    </button>
                  </div>
                </div>
              )}
            </main>

            {/* Partner CTA Section (Visible on Home view) */}
            {currentView.view === 'home' && (
              <section className="max-w-5xl mx-auto px-5 pb-16">
                <div id="partner" className="rounded-2xl bg-gradient-to-l from-ocean-900 via-ocean-700 to-teal2-600 text-white p-8 sm:p-10 shadow-2xl shadow-ocean-700/30 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-xs font-bold mb-2">
                      <i className="fa-solid fa-sparkles text-sand-400"></i> تسجيل فوري — حسابك الخاص جاهز في دقيقة
                    </span>
                    <p className="text-xl sm:text-2xl font-bold leading-loose">
                      عندك مطعم أو كافيه في بورسعيد؟ انضم لشبكة شركائنا ووصل مكانك لآلاف الزوار.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => go('partner')}
                    className="shrink-0 inline-flex items-center gap-3 bg-sand-400 text-ocean-900 font-extrabold px-8 py-4 rounded-2xl shadow-xl hover:bg-sand-100 hover:-translate-y-1 transition"
                  >
                    <i className="fa-solid fa-store"></i> سجل متجرك
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-sand-200 py-10 bg-white/50">
            <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-6 text-ocean-700 text-center sm:text-right">
              <div className="flex flex-col items-center sm:items-start gap-2">
                <p className="font-semibold">إعداد وتطوير: فريق Alpha Team © 2026</p>
                <nav aria-label="روابط قانونية" className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-sm">
                  <span className="text-ocean-700/70">Port Said Hub · دليلك الشامل في المدينة الباسلة</span>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className="w-11 h-11 rounded-2xl bg-white shadow-md grid place-items-center hover:bg-ocean-700 hover:text-white hover:-translate-y-1 transition">
                  <i className="fa-brands fa-facebook-f"></i>
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="إنستجرام" className="w-11 h-11 rounded-2xl bg-white shadow-md grid place-items-center hover:bg-ocean-700 hover:text-white hover:-translate-y-1 transition">
                  <i className="fa-brands fa-instagram"></i>
                </a>
                <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="تيك توك" className="w-11 h-11 rounded-2xl bg-white shadow-md grid place-items-center hover:bg-ocean-700 hover:text-white hover:-translate-y-1 transition">
                  <i className="fa-brands fa-tiktok"></i>
                </a>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========== 5. CHATBOT ASSISTANT FAB & PANEL ========== */}
      {screen === 'app' && (
        <>
          <button
            type="button"
            onClick={() => setBotOpen(prev => !prev)}
            aria-label="مساعد بورسعيد"
            className="chat-fab"
          >
            <span className="dot"></span>
            <i className="fa-solid fa-comment-dots"></i>
          </button>

          {botOpen && (
            <div className="chat-panel drop-in">
              {/* Header */}
              <div className="hero-bg waves-pattern text-white p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-white/20 grid place-items-center">
                    <i className="fa-solid fa-robot"></i>
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm truncate">مساعد بورسعيد</p>
                    <p className="text-[11px] text-white/80">بيجاوبك على طول، من غير انتظار</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBotOpen(false)}
                  aria-label="إغلاق"
                  className="w-8 h-8 shrink-0 rounded-xl bg-white/15 grid place-items-center hover:bg-white/25 transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Messages Body */}
              <div className="chat-body">
                {botMessages.map((m, idx) => (
                  <div key={idx} className={`chat-msg ${m.who}`}>
                    {m.text}
                  </div>
                ))}
                <div ref={botEndRef} />
              </div>

              {/* Quick Questions Toggle */}
              <button
                type="button"
                onClick={() => setBotQuickOpen(prev => !prev)}
                className={`chat-quick-toggle ${botQuickOpen ? '' : 'closed'}`}
              >
                <i className="fa-solid fa-chevron-up"></i>
                <span>{botQuickOpen ? 'إخفاء الأسئلة الجاهزة' : 'أسئلة جاهزة'}</span>
              </button>

              {/* Quick Chips */}
              {botQuickOpen && (
                <div className="chat-quick-row">
                  {BOT_FAQ.map((f, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendBotMessage(f.q)}
                      className="chat-q"
                    >
                      {f.q}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <div className="flex items-center gap-2 p-3 border-t border-sand-200">
                <input
                  type="text"
                  placeholder="اكتب سؤالك هنا..."
                  value={botInput}
                  onChange={e => setBotInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') sendBotMessage(botInput);
                  }}
                  className="flex-1 min-w-0 rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal2-500"
                />
                <button
                  type="button"
                  onClick={() => sendBotMessage(botInput)}
                  aria-label="إرسال"
                  className="w-9 h-9 shrink-0 rounded-full bg-teal2-600 text-white grid place-items-center hover:bg-teal2-500 transition"
                >
                  <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== 6. QR CODE MODAL ========== */}
      {qrModal?.show && (
        <div id="qr-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm bg-sand-50 rounded-2xl shadow-2xl p-6 text-center pop-in">
            <p className="text-3xl font-extrabold text-coral-500">خصم {qrModal.discount}%</p>
            <p className="text-xl font-extrabold mt-1">{qrModal.place}</p>
            <p className="text-sm text-ocean-700/80 mb-4 mt-2">
              قدّم الكود للمحل عشان يمسحه. صالح لمرة واحدة، ولو انتهى من غير ما يتستخدم نقاطك بترجعلك تلقائيًا.
            </p>
            <div className="bg-white rounded-2xl p-3 inline-block max-w-full shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModal.payload)}`}
                alt="QR Code"
                className="w-56 max-w-full h-auto aspect-square mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <p className="mt-4 font-bold text-ocean-900">
              ينتهي بعد: <span dir="ltr" className="text-teal2-600">{qrTimer}</span>
            </p>
            <button
              type="button"
              onClick={() => setQrModal(null)}
              className="mt-4 w-full rounded-2xl bg-teal2-600 text-white font-extrabold py-3 hover:bg-teal2-500 transition"
            >
              تمام
            </button>
          </div>
        </div>
      )}

      {/* ========== 7. LIGHTBOX MODAL ========== */}
      {lightbox?.show && (
        <div
          id="lb"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 sm:p-6"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-3 left-3 sm:top-5 sm:left-5 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <figure className="w-full max-w-3xl max-h-full flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt="" className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl" />
            <figcaption className="text-white text-center font-extrabold text-lg px-12 mt-2">
              {lightbox.cap}
            </figcaption>
          </figure>
        </div>
      )}

      {/* ========== 8. TOAST NOTIFICATION ========== */}
      {toastMsg && (
        <div id="toast" className="fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[90%] z-50 rounded-2xl bg-ocean-900 text-white px-5 py-3 font-bold shadow-xl text-center pop-in">
          {toastMsg}
        </div>
      )}
    </>
  );
}
