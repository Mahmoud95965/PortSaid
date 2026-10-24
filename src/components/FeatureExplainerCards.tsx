'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  MapPin,
  Star,
  Ticket,
  QrCode,
  Bus,
  Bed,
  Bot,
  Store,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Info,
  ShieldCheck,
  TrendingUp,
  Navigation,
} from 'lucide-react';

interface FeatureExplainerCardsProps {
  onOpenGuideModal?: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

interface StepCard {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: any;
  colorScheme: {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    arrowColor: string;
  };
  features: string[];
  actionLabel?: string;
  targetView?: string;
  targetArg?: string | null;
  arrowNextText: string;
  proTip: string;
  details: {
    title: string;
    points: { label: string; desc: string }[];
  };
}

const STEPS_DATA: StepCard[] = [
  {
    id: 'explore-places',
    stepNumber: 1,
    badge: 'الخطوة 1: الاستكشاف',
    title: 'استكشف معالم ومطاعم بورسعيد',
    shortDesc: 'دليل شامل لجميع مطاعم المأكولات البحرية، الكافيهات، والأنشطة السياحية مع تفاصيل ومواقع دقيقة.',
    fullDesc:
      'جمعنا لك أهم الأماكن التي تميز محافظة بورسعيد: مطاعم الأسماك الشهيرة (كاستن، الجندي، البورصة)، كافيهات شارع طرح البحر والممشى السياحي، جبال الملح الساحرة في الملاحات، وحديقة فريال التاريخية وفنار بورسعيد القديم. كل مكان مدعوم بالصور الحقيقية، أوقات العمل، وخريطة للوصول.',
    icon: Compass,
    colorScheme: {
      bg: 'from-teal2-900/40 via-teal2-950/20 to-[#071320]',
      border: 'border-teal2-500/40 hover:border-teal2-400',
      iconBg: 'bg-teal2-500/20 text-teal2-400 border border-teal2-400/30',
      iconColor: 'text-teal2-400',
      badgeBg: 'bg-teal2-500/20 text-teal2-300 border border-teal2-400/30',
      badgeText: 'text-teal2-300',
      arrowColor: 'text-teal2-400',
    },
    features: [
      'فئات مصنفة بدقة: طعام، كافيهات، معالم، حلويات، وتسوق.',
      'خرائط تفاعلية وحساب المسافة لموقعك بالكيلومتر.',
      'تقييمات حقيقية وتوصيات زوار بورسعيد الموثوقة.',
    ],
    actionLabel: 'استكشف الأماكن الآن',
    targetView: 'list',
    arrowNextText: 'اخترت مكانك؟ ➔ انتقل للخطوة التالية لتسجيل الزيارة',
    proTip: 'اضغط على بطاقة أي مكان لرؤية موقعه الجغرافي وقائمة الكوبونات المتاحة له.',
    details: {
      title: 'ما الذي ستجده داخل قسم الاستكشاف؟',
      points: [
        {
          label: 'مطاعم المأكولات البحرية:',
          desc: 'تعرف على أفضل محلات السمك الطازج والشوربة البورسعيدية المعتمدة.',
        },
        {
          label: 'حلويات بورسعيد الأصيلة:',
          desc: 'كاساتا سيلفر الشهيرة، التمرية السخنة، وأطباق أم علي البورسعيدية.',
        },
        {
          label: 'معالم وسياحة حرة:',
          desc: 'فنار بورسعيد، جبال الملح، شاطئ بورسعيد، وحديقة فريال التاريخية.',
        },
      ],
    },
  },
  {
    id: 'gps-checkin',
    stepNumber: 2,
    badge: 'الخطوة 2: جمع النقاط',
    title: 'سجّل حضورك بالـ GPS واكسب نقاطك',
    shortDesc: 'اكسب نقاطاً حقيقية فورية عند وصولك لأي مكان في بورسعيد بدون أي تلاعب أو مشاركات وهمية.',
    fullDesc:
      'النظام يعتمد فقط على الزيارات الفعلية الموثقة! عند وصولك لأي مطعم أو كافيه أو معلم شريك، افتح صفحة المكان واضغط على زر "سجّل حضورك الآن". يقوم النظام بالتحقق الآلي من إحداثياتك عبر الـ GPS وإضافة النقاط مباشرة إلى محفظتك وسجل حركاتك الدائم.',
    icon: MapPin,
    colorScheme: {
      bg: 'from-amber-900/40 via-amber-950/20 to-[#120e06]',
      border: 'border-amber-500/40 hover:border-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-400/30',
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
      badgeText: 'text-amber-300',
      arrowColor: 'text-amber-400',
    },
    features: [
      'هدية ترحيبية فورية: +20 نقطة بمجرد إنشاء حسابك الجديد.',
      'نقاط حقيقية للزيارات: من +20 إلى +50 نقطة لكل زيارة موثقة.',
      'أمان عالي: نظام يمنع التكرار الوهمي أو تزوير المواقع الجغرافية.',
    ],
    actionLabel: 'اعرف رصيد نقاطك وسجلك',
    targetView: 'points',
    arrowNextText: 'جمعت نقاطك؟ ➔ استبدلها بكوبونات خصم فورية',
    proTip: 'تأكد من تفعيل صلاحية الموقع (Location) في متصفحك لسرعة التحقق الجغرافي عند الزيارة.',
    details: {
      title: 'كيف يعمل نظام احتساب النقاط الحقيقي؟',
      points: [
        {
          label: 'تحقق جغرافي دقيق:',
          desc: 'يقيس الخادم المسافة بينك وبين إحداثيات المكان للتأكد من وجودك الفعلي.',
        },
        {
          label: 'سجل حركات دائم (Ledger):',
          desc: 'كل نقطة تكسبها أو تستبدلها تسجل بالوقت والتاريخ وسبب العملية.',
        },
        {
          label: 'منع النقاط الوهمية:',
          desc: 'تم إيقاف نظام نقاط المشاركة العشوائية بالكامل لضمان عدالة ومصداقية الرصيد.',
        },
      ],
    },
  },
  {
    id: 'redeem-coupons',
    stepNumber: 3,
    badge: 'الخطوة 3: استبدال النقاط',
    title: 'استبدل نقاطك بكوبونات خصم فورية',
    shortDesc: 'حوّل نقاطك إلى خصومات حقيقية تبدأ من 10% وتصل إلى 20% في مطاعم ومتاجر بورسعيد.',
    fullDesc:
      'رصيد نقاطك في Port Said Hub له قيمة مادية حقيقية! يمكنك في أي وقت الدخول إلى قسم "Hubs Rewards"، واختيار المطعم أو الكافيه الذي ترغب بزيارته، ثم الضغط على "استبدال النقاط". سينشئ لك النظام فوراً كود خصم رسمي ورمز QR صالح للاستخدام.',
    icon: Ticket,
    colorScheme: {
      bg: 'from-coral-900/40 via-coral-950/20 to-[#150a0a]',
      border: 'border-coral-500/40 hover:border-coral-400',
      iconBg: 'bg-coral-500/20 text-coral-400 border border-coral-400/30',
      iconColor: 'text-coral-400',
      badgeBg: 'bg-coral-500/20 text-coral-300 border border-coral-400/30',
      badgeText: 'text-coral-300',
      arrowColor: 'text-coral-400',
    },
    features: [
      'خصومات حقيقية: 10%، 12%، 15%، وحتى 20% على إجمالي الفاتورة.',
      'كود خصم فوري ورمز QR فريد لكل عملية استبدال.',
      'صلاحية الكوبون: سارٍ لمدة 30 يوماً من تاريخ إصداره.',
    ],
    actionLabel: 'شاهد الكوبونات المتاحة',
    targetView: 'points',
    arrowNextText: 'حصلت على الكود والـ QR؟ ➔ أظهره عند الدفع',
    proTip: 'يمكنك استبدال الكوبون وحفظه، وسيظل مسجلاً في حسابك حتى تذهب للمطعم وتستخدمه.',
    details: {
      title: 'أمثلة على الكوبونات الشائعة في بورسعيد:',
      points: [
        {
          label: 'مطعم كاستن للأسماك:',
          desc: 'كوبون خصم 15% على الفاتورة مقابل 60 نقطة فقط.',
        },
        {
          label: 'مطعم الجندي للأسماك:',
          desc: 'كوبون خصم 12% على الفاتورة مقابل 50 نقطة.',
        },
        {
          label: 'حلويات سيلفر وكاساتا:',
          desc: 'كوبون خصم 10% على الحلويات مقابل 40 نقطة.',
        },
      ],
    },
  },
  {
    id: 'cashier-discount',
    stepNumber: 4,
    badge: 'الخطوة 4: التوفير عند الكاشير',
    title: 'وفّر فلوسك وأظهر الـ QR عند الكاشير',
    shortDesc: 'افتح صفحة الكوبون المستبدل وأظهر كود الخصم أو الـ QR لموظف الكاشير للاستفادة من الخصم مباشرة.',
    fullDesc:
      'عند طلب الفاتورة أو الحساب في المطعم أو المتجر، افتح هاتفك على صفحة الكوبونات وأظهر رمز الـ QR أو الكود المكون من 6 أرقام وحروف للكاشير. يقوم الكاشير بتطبيق الخصم فوراً على إجمالي فاتورتك وتستمتع بأفضل توفير في خروجتك.',
    icon: QrCode,
    colorScheme: {
      bg: 'from-emerald-900/40 via-emerald-950/20 to-[#07150f]',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30',
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
      badgeText: 'text-emerald-300',
      arrowColor: 'text-emerald-400',
    },
    features: [
      'تطبيق فوري للخصم بدون خطوات معقدة أو انتظار.',
      'يعمل على الهواتف الذكية مع شاشة QR واضحة وسريعة القراءة.',
      'إمكانية تقييم المكان بعد استخدام الكوبون لمساعدة باقي الزوار.',
    ],
    actionLabel: 'فتح صفحة الكوبونات',
    targetView: 'points',
    arrowNextText: 'تحتاج مواصلات أو سكن؟ ➔ دليل الطلبة والجامعة',
    proTip: 'تأكد من إظهار الكود للكاشير قبل طباعة الفاتورة النهائية لتطبيق الخصم بسهولة.',
    details: {
      title: 'خطوات تقديم الكوبون في المحل:',
      points: [
        {
          label: '1. فتح الكوبون:',
          desc: 'ادخل على قسم النقاط ثم "كوبوناتي الحالية" واضغط على الكوبون.',
        },
        {
          label: '2. إظهار الـ QR:',
          desc: 'أظهر الشاشة للكاشير لمسح الرمز أو كتابة الكود الموضح.',
        },
        {
          label: '3. مراجعة الخصم:',
          desc: 'تأكد من نزول الخصم (10% - 20%) في إجمالي الحساب قبل السداد.',
        },
      ],
    },
  },
  {
    id: 'transit-housing',
    stepNumber: 5,
    badge: 'الخطوة 5: المواصلات والسكن',
    title: 'شبكة مواصلات وسكن كليات جامعة بورسعيد',
    shortDesc: 'دليل شامل لخطوط السرفيس، المينى باص، محطات النزول أمام الكليات، وشقق وسكن الطلبة المغتربين.',
    fullDesc:
      'قسم مخصص لخدمة طلبة جامعة بورسعيد والمغتربين! يوضح خطوط المينى باص بين أحياء بورسعيد المختلفة (الأمين، الزهور، الـ 5000، الضواحي، العرب، الشرق، وبورفؤاد)، مع المحطة الدقيقة لكل كلية (الهندسة، الطب، الصيدلة، التكنولوجيا، والتربية)، بالإضافة لقسم كامل للسكن الطلابي المعتمد.',
    icon: Bus,
    colorScheme: {
      bg: 'from-ocean-800/40 via-ocean-950/30 to-[#071322]',
      border: 'border-ocean-400/40 hover:border-ocean-300',
      iconBg: 'bg-ocean-500/20 text-ocean-300 border border-ocean-400/30',
      iconColor: 'text-ocean-300',
      badgeBg: 'bg-ocean-500/20 text-ocean-200 border border-ocean-400/30',
      badgeText: 'text-ocean-200',
      arrowColor: 'text-ocean-300',
    },
    features: [
      'خطوط المينى باص الرسمية: الأمين، الزهور، الـ 5000، والمحطة المباشرة.',
      'محطات نزول أمام بوابات كل كلية مع أسماء الشوارع الحقيقية.',
      'دليل السكن والخدمات: مغاسل، مكتبات، وصيدليات قريبة من مجمعات الكليات.',
    ],
    actionLabel: 'عرض دليل المواصلات والسكن',
    targetView: 'bus',
    arrowNextText: 'عندك أي استفسار؟ ➔ مساعد بورسعيد الذكي يجيبك',
    proTip: 'المعدية بين بورسعيد وبورفؤاد مجانية تماماً للمشاة وتعمل على مدار 24 ساعة يومياً.',
    details: {
      title: 'أهم خطوط السرفيس للجامعة:',
      points: [
        {
          label: 'خط الأمين:',
          desc: 'يخدم كليات التكنولوجيا والتعليم الصناعي والحقوق والتجارة.',
        },
        {
          label: 'خط الزهور:',
          desc: 'يصل مباشرة إلى المجمع الطبي (كليات الطب البشري، الصيدلة، والتمريض).',
        },
        {
          label: 'خط الـ 5000 ومساكن الإفرنج:',
          desc: 'يربط حي الشرق وبورفؤاد بباقي الكليات ومحطة قطار بورسعيد.',
        },
      ],
    },
  },
  {
    id: 'ai-assistant',
    stepNumber: 6,
    badge: 'الخطوة 6: المساعد الذكي',
    title: 'مساعد بورسعيد الذكي 24/7',
    shortDesc: 'مرشدك البورسعيدي الخاص يفهم لهجتك ويجيبك فوراً عن المطاعم، المواصلات، وأرصدة النقاط.',
    fullDesc:
      'اضغط على الأيقونة الزرقاء العائمة أسفل يمين الشاشة في أي وقت. "مساعد بورسعيد" هو محرك ذكاء اصطناعي محلي يفهم طبيعة المدينة بدقة: يرشحلك أحسن وجبة سمك حسب ميزانيتك، يشرحلك إزاي تروح أي مشوار، ويعرفك رصيدك وكيفية استبداله بضغطة زر واحدة.',
    icon: Bot,
    colorScheme: {
      bg: 'from-violet-900/40 via-purple-950/20 to-[#100720]',
      border: 'border-purple-500/40 hover:border-purple-400',
      iconBg: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
      iconColor: 'text-purple-300',
      badgeBg: 'bg-purple-500/20 text-purple-200 border border-purple-400/30',
      badgeText: 'text-purple-200',
      arrowColor: 'text-purple-300',
    },
    features: [
      'إجابات بورسعيدية فورية عن أفضل الأكلات والمعالم وأوقات الزيارة.',
      'أزرار ومقترحات سريعة تفتح صفحات النقاط والكوبونات مباشرة.',
      'متاح دائماً 24 ساعة في أي وقت تحتاجه على هاتفك أو حاسوبك.',
    ],
    actionLabel: 'اسأل المساعد الآن',
    targetView: 'home',
    arrowNextText: 'صاحب محل أو كافيه؟ ➔ انضم لشبكة شركاء بورسعيد',
    proTip: 'جرب أن تسأل المساعد: "عاوز أحسن مطعم سمك"، أو "إزاي أروح كلية الهندسة بالمينى باص".',
    details: {
      title: 'ما الذي يمكن أن تطلبه من مساعد بورسعيد؟',
      points: [
        {
          label: 'ترشيحات الأكل والخروجات:',
          desc: 'اطلب خطة يوم كامل للتنزه في بورسعيد مع أفضل الكافيهات والحلويات.',
        },
        {
          label: 'إرشادات المواصلات:',
          desc: 'حدد كليتك أو وجهتك وسيشرح لك المساعد أسرع خط مينى باص ورقم الأجرة.',
        },
        {
          label: 'إدارة النقاط والخصومات:',
          desc: 'يوجهك فوراً لأعلى الكوبونات خصماً وكيفية تجميع المزيد من النقاط.',
        },
      ],
    },
  },
  {
    id: 'merchant-partner',
    stepNumber: 7,
    badge: 'الخطوة 7: للتجار والشركاء',
    title: 'انضمام التجار وأصحاب الأنشطة',
    shortDesc: 'لوحة تحكم شريك مخصصة لأصحاب المطاعم والمحلات لجذب آلاف الزوار وتقديم العروض.',
    fullDesc:
      'إذا كنت صاحب كافيه، مطعم، محل حلويات، أو متجر في بورسعيد، يمكنك تقديم طلب انضمام مجاني من خلال قسم "سجل متجرك كشريك". ستحصل على صفحة تسويقية خاصة بنشاطك وتحدد نسبة الخصم والعمولة المناسبة لك، مع لوحة تحكم لمتابعة الزيارات والطلبات.',
    icon: Store,
    colorScheme: {
      bg: 'from-sand-900/40 via-amber-950/20 to-[#191107]',
      border: 'border-sand-400/40 hover:border-sand-300',
      iconBg: 'bg-sand-400/20 text-sand-300 border border-sand-400/30',
      iconColor: 'text-sand-300',
      badgeBg: 'bg-sand-400/20 text-sand-200 border border-sand-400/30',
      badgeText: 'text-sand-200',
      arrowColor: 'text-sand-300',
    },
    features: [
      'وصول مباشر لآلاف طلاب جامعة بورسعيد وزوار وسكان المحافظة.',
      'تحديد نسب الخصم (10% - 20%) لجذب المزيد من الزبائن في الأوقات الهادئة.',
      'لوحة تحكم مستقلة لمتابعة الأداء وطلبات الكوبونات وتفاصيل المتجر.',
    ],
    actionLabel: 'سجّل متجرك كشريك الآن',
    targetView: 'partner',
    arrowNextText: 'اكتملت الدورة! ➔ بورسعيد كلها في جيبك',
    proTip: 'يمكن للتاجر التحكم في مواعيد عمله ونسبة الخصم في أي وقت من لوحة التحكم.',
    details: {
      title: 'مزايا الانضمام لشبكة Hubs:',
      points: [
        {
          label: 'تسويق رقمي مستمر:',
          desc: 'ظهور مميز في أعلى القوائم وفئات الاستكشاف حسب منطقتك الجغرافية.',
        },
        {
          label: 'زيادة الإقبال والولاء:',
          desc: 'العملاء يزورون مكانك لتسجيل الـ GPS واستبدال كوبونات الخصم.',
        },
        {
          label: 'تفعيل سريع ومعتمد:',
          desc: 'مراجعة بيانات نشاطك واعتماد المتجر في أقل من 24 ساعة.',
        },
      ],
    },
  },
];

export const FeatureExplainerCards: React.FC<FeatureExplainerCardsProps> = ({
  onOpenGuideModal,
  onNavigate,
}) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'all'>('roadmap');

  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (targetView?: string, targetArg?: string | null) => {
    if (targetView && onNavigate) {
      onNavigate(targetView, targetArg);
    }
  };

  return (
    <section className="w-full py-6 sm:py-10 space-y-6 sm:space-y-8 relative">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto px-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal2-500/20 via-amber-500/20 to-ocean-500/20 border border-sand-300/40 dark:border-teal2-500/30 text-xs sm:text-sm font-black text-ocean-900 dark:text-sand-300 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>خريطة وشرح تفاصيل موقع Port Said Hub</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ocean-900 dark:text-white leading-tight">
          كيف يعمل الموقع؟ بطاقات وأسهم تشرح كل خطوة
        </h2>

        <p className="text-xs sm:text-sm md:text-base text-ocean-700/80 dark:text-white/75 font-medium leading-relaxed">
          دليلك التفاعلي خطوة بخطوة: استكشف أفضل الأماكن، سجّل زيارتك بالـ GPS، واجمع نقاطك الحقيقية
          لتستبدلها بكوبونات خصم 10% إلى 20% فورية، بالإضافة لشبكة المواصلات والمساعد الذكي.
        </p>

        {/* View Switcher & Modal Launcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
          <div className="inline-flex p-1 rounded-2xl bg-sand-200/70 dark:bg-[#111e2d] border border-sand-300 dark:border-[#1d2d3e]">
            <button
              onClick={() => setActiveTab('roadmap')}
              type="button"
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                activeTab === 'roadmap'
                  ? 'bg-ocean-900 text-sand-300 shadow-md'
                  : 'text-ocean-700/80 dark:text-white/70 hover:text-ocean-900'
              }`}
            >
              🔄 مسار الرحلة بالأسهم
            </button>
            <button
              onClick={() => setActiveTab('all')}
              type="button"
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                activeTab === 'all'
                  ? 'bg-ocean-900 text-sand-300 shadow-md'
                  : 'text-ocean-700/80 dark:text-white/70 hover:text-ocean-900'
              }`}
            >
              📋 تفاصيل كل بطاقة
            </button>
          </div>

          {onOpenGuideModal && (
            <motion.button
              onClick={onOpenGuideModal}
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-ocean-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 hover:shadow-lg transition"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>جولة الشرح التفاعلية خطوة بخطوة</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* ROADMAP FLOW VIEW: Connected Cards with Animated Directional Arrows */}
      {activeTab === 'roadmap' && (
        <div className="space-y-4 sm:space-y-6">
          {STEPS_DATA.map((step, index) => {
            const Icon = step.icon;
            const isExpanded = expandedCardId === step.id;
            const isLast = index === STEPS_DATA.length - 1;

            return (
              <React.Fragment key={step.id}>
                {/* Step Card */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className={`rounded-3xl p-5 sm:p-6 lg:p-7 bg-gradient-to-br ${step.colorScheme.bg} bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border ${step.colorScheme.border} shadow-xl relative overflow-hidden transition-all duration-300`}
                >
                  {/* Subtle Background Glow Blob */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
                    {/* Right side: Icon + Titles */}
                    <div className="flex items-start gap-3.5 sm:gap-5 flex-1 min-w-0">
                      {/* Animated Step Icon */}
                      <motion.div
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${step.colorScheme.iconBg} grid place-items-center shrink-0 shadow-md`}
                        whileHover={{ rotate: 10, scale: 1.08 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                      </motion.div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide ${step.colorScheme.badgeBg}`}
                          >
                            {step.badge}
                          </span>
                          <span className="text-[10px] sm:text-xs text-ocean-700/70 dark:text-white/60 font-semibold">
                            (خطوة {step.stepNumber} من {STEPS_DATA.length})
                          </span>
                        </div>

                        <h3 className="text-base sm:text-xl lg:text-2xl font-black text-ocean-900 dark:text-white leading-snug">
                          {step.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/80 font-medium leading-relaxed">
                          {step.shortDesc}
                        </p>
                      </div>
                    </div>

                    {/* Left side: Interactive Buttons */}
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 justify-end">
                      {step.actionLabel && (
                        <motion.button
                          onClick={() => handleActionClick(step.targetView, step.targetArg)}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-ocean-900 text-sand-300 dark:bg-white dark:text-ocean-950 font-black text-xs sm:text-sm shadow-md hover:opacity-90 transition text-center"
                        >
                          {step.actionLabel}
                        </motion.button>
                      )}

                      <button
                        onClick={() => toggleExpand(step.id)}
                        type="button"
                        aria-expanded={isExpanded}
                        className="px-3 py-2.5 rounded-xl bg-sand-200/80 dark:bg-[#152332] hover:bg-sand-300 dark:hover:bg-[#1a2c3f] text-ocean-900 dark:text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <span>{isExpanded ? 'إخفاء الشرح' : 'الشرح الكامل'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Deep Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden pt-4 mt-4 border-t border-sand-300/60 dark:border-white/10 space-y-4"
                      >
                        {/* Paragraph full explanation */}
                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#111e2d] border border-sand-300/40 dark:border-[#1d2d3e] space-y-2">
                          <h4 className="font-black text-xs sm:text-sm text-ocean-900 dark:text-sand-300 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-teal2-500" />
                            <span>تفاصيل هذه الميزة وكيف تستفيد منها:</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-ocean-700/85 dark:text-white/80 leading-relaxed font-medium">
                            {step.fullDesc}
                          </p>
                        </div>

                        {/* Two Columns Grid: Features & Deep Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* Key Features */}
                          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-[#111e2d] border border-sand-300/40 dark:border-[#1d2d3e] space-y-2">
                            <h5 className="font-black text-xs text-ocean-900 dark:text-white flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal2-500" />
                              <span>مميزات رئيسية:</span>
                            </h5>
                            <ul className="space-y-1.5 text-xs text-ocean-700/80 dark:text-white/70">
                              {step.features.map((feat, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 shrink-0 mt-1.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Deep Points */}
                          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-[#111e2d] border border-sand-300/40 dark:border-[#1d2d3e] space-y-2">
                            <h5 className="font-black text-xs text-ocean-900 dark:text-white flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span>{step.details.title}</span>
                            </h5>
                            <div className="space-y-1.5">
                              {step.details.points.map((pt, pIdx) => (
                                <div key={pIdx} className="text-xs">
                                  <span className="font-bold text-ocean-900 dark:text-sand-300 ml-1">
                                    {pt.label}
                                  </span>
                                  <span className="text-ocean-700/80 dark:text-white/70">{pt.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Pro Tip Callout */}
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-ocean-900 dark:text-sand-200">
                          <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            <strong className="font-black ml-1">نصيحة مهمة:</strong>
                            {step.proTip}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ANIMATED DIRECTIONAL FLOW ARROW CONNECTOR */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center py-1 sm:py-2 relative">
                    {/* Glowing flow line */}
                    <div className="w-0.5 h-4 sm:h-6 bg-gradient-to-b from-sand-300/80 via-amber-400 to-teal2-400/80 dark:from-sand-400/30 dark:to-teal2-500/30" />

                    {/* Animated Arrow Badge with Horizontal/Vertical Motion */}
                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="px-4 py-1.5 rounded-full bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-800 text-sand-300 border border-amber-400/40 shadow-md flex items-center gap-2 text-[11px] sm:text-xs font-black z-10"
                    >
                      <motion.div
                        animate={{ x: [0, -4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </motion.div>
                      <span>{step.arrowNextText}</span>
                      <motion.div
                        animate={{ x: [0, -4, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </motion.div>
                    </motion.div>

                    <div className="w-0.5 h-4 sm:h-6 bg-gradient-to-b from-teal2-400/80 via-amber-400 to-sand-300/80 dark:from-teal2-500/30 dark:to-sand-400/30" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ALL CARDS GRID VIEW: Comprehensive Overview */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {STEPS_DATA.map((step) => {
            const Icon = step.icon;
            const isExpanded = expandedCardId === step.id;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className={`rounded-3xl p-5 bg-gradient-to-br ${step.colorScheme.bg} bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border ${step.colorScheme.border} shadow-lg flex flex-col justify-between space-y-4`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${step.colorScheme.badgeBg}`}
                    >
                      {step.badge}
                    </span>
                    <div className={`w-9 h-9 rounded-xl ${step.colorScheme.iconBg} grid place-items-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black leading-snug">{step.title}</h3>

                  <p className="text-xs text-ocean-700/80 dark:text-white/75 line-clamp-3 leading-relaxed">
                    {step.shortDesc}
                  </p>

                  <ul className="space-y-1.5 text-[11px] text-ocean-700/70 dark:text-white/60">
                    {step.features.slice(0, 2).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 shrink-0 mt-1" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-sand-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                  {step.actionLabel && (
                    <button
                      onClick={() => handleActionClick(step.targetView, step.targetArg)}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-ocean-900 text-sand-300 dark:bg-white dark:text-ocean-900 font-bold text-xs hover:opacity-90 transition"
                    >
                      {step.actionLabel}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab('roadmap');
                      setExpandedCardId(step.id);
                    }}
                    type="button"
                    className="text-xs font-bold text-teal2-600 dark:text-teal2-400 hover:underline flex items-center gap-1"
                  >
                    <span>الشرح المفصل</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Summary Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-ocean-900 via-teal2-800 to-ocean-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right border border-white/20"
      >
        <div className="space-y-1">
          <h4 className="text-base sm:text-lg font-black flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-sand-300" />
            <span>نظام موثوق 100% بدون إعلانات مزعجة أو نقاط وهمية</span>
          </h4>
          <p className="text-xs text-white/80 max-w-xl">
            كل زيارة يتم التحقق منها عبر موقعك الجغرافي الحقيقي، ونقاطك مسجلة في قاعدة بيانات مشفرة وآمنة
            تمكنك من الحصول على خصومات فورية عند زيارة شركائنا في بورسعيد.
          </p>
        </div>

        {onOpenGuideModal && (
          <motion.button
            onClick={onOpenGuideModal}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 rounded-2xl bg-sand-400 hover:bg-sand-300 text-ocean-950 font-black text-xs sm:text-sm shadow-md transition shrink-0"
          >
            🧭 افتح جولة الشرح الكاملة
          </motion.button>
        )}
      </motion.div>
    </section>
  );
};
