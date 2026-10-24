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
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Eye,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface SiteGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: string) => void;
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  arrowText: string;
  tip: string;
  icon: any;
  accentColor: string;
  bgGradient: string;
  targetView?: string;
  visualPreview: {
    title: string;
    items: { label: string; value: string; icon: any }[];
  };
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'explore',
    badge: 'الخطوة الأولى',
    title: 'استكشف بورسعيد ومعالمها',
    subtitle: 'دليلك السياحي والخدمي المتكامل',
    description:
      'جمعنا لك أفضل مطاعم الأسماك والمأكولات البحرية، كافيهات الممشى السياحي، الفنار، جبال الملح، والأنشطة الترفيهية في مكان واحد، مع مواعيد العمل وموقع المكان على الخريطة.',
    features: [
      'فئات مصنفة: مطاعم، كافيهات، معالم، حلويات، وتسوق.',
      'خرائط دقيقة وحساب المسافة لموقعك الحالي.',
      'صور حقيقية وتقييمات زوار بورسعيد الموثوقة.',
    ],
    arrowText: 'تصفح المكان ➔ ثم انتقل للخطوة التالية لتسجيل الحضور',
    tip: 'نصيحة: اضغط على أي مكان لفتح تفاصيله الكاملة والتقييمات وكوبونات الخصم.',
    icon: Compass,
    accentColor: 'text-teal2-500',
    bgGradient: 'from-teal2-600 via-teal2-700 to-ocean-900',
    targetView: 'list',
    visualPreview: {
      title: 'أقسام الاستكشاف الرئيسية',
      items: [
        { label: 'مطاعم وكافيهات', value: 'كاستن، الجندي، بينوس', icon: Compass },
        { label: 'معالم سياحية', value: 'الفنار، فريال، جبال الملح', icon: MapPin },
        { label: 'حلويات بورسعيد', value: 'كاساتا سيلفر، التمرية', icon: Sparkles },
      ],
    },
  },
  {
    id: 'checkin',
    badge: 'الخطوة الثانية',
    title: 'سجّل حضورك بالـ GPS واكسب نقاطك',
    subtitle: 'نظام النقاط الحقيقي المعتمد',
    description:
      'عند وصولك لأي مكان في بورسعيد، افتح صفحته في الموقع واضغط "سجّل حضورك الآن". يتحقق النظام تلقائيًا من موقعك الجغرافي عبر الـ GPS ويضيف لحسابك فورًا من +20 إلى +50 نقطة.',
    features: [
      'حساب النقاط يتم بشكل حقيقي وموثق على الخادم.',
      'مسموح بزيارة واحدة لكل مكان في اليوم لمنع التكرار.',
      'تحصل على +20 نقطة هدية ترحيبية فور إنشاء حسابك الجديد.',
    ],
    arrowText: 'اجمع نقاط الزيارات ➔ ثم استبدلها بخصومات وكوبونات',
    tip: 'نصيحة: تأكد من تفعيل خدمة الموقع الجغرافي (GPS) في متصفحك لسرعة التحقق.',
    icon: MapPin,
    accentColor: 'text-amber-400',
    bgGradient: 'from-amber-600 via-amber-700 to-ocean-900',
    targetView: 'points',
    visualPreview: {
      title: 'كيف تُحتسب النقاط؟',
      items: [
        { label: 'هدية التسجيل', value: '+20 نقطة فورية', icon: Sparkles },
        { label: 'زيارة المعالم والمطاعم', value: '+20 إلى +50 نقطة', icon: Star },
        { label: 'أمان الحساب', value: 'منع التكرار الآلي', icon: CheckCircle2 },
      ],
    },
  },
  {
    id: 'rewards',
    badge: 'الخطوة الثالثة',
    title: 'استبدل نقاطك بكوبونات خصم فورية',
    subtitle: 'وفر 10% إلى 20% في مطاعم ومحلات بورسعيد',
    description:
      'النقاط التي جمعتها ليست مجرد أرقام! اضغط على رصيد النقاط أعلى الصفحة لفتح صفحة "Hubs Rewards"، واختر المطعم أو الكافيه الذي تريده، واستبدل نقاطك بكود خصم فوري ورمز QR.',
    features: [
      'خصومات حقيقية تبدأ من 10% وحتى 20% على الفاتورة.',
      'كود الكوبون يظهر لك فوراً مع رمز QR صالح للاستخدام.',
      'سجل كامل يوضح رصيدك وحركات الخصم والإضافة بالتاريخ والوقت.',
    ],
    arrowText: 'استخرج الكود والـ QR ➔ أظهره للكاشير عند الدفع',
    tip: 'نصيحة: الكوبون المستبدل صالح لمدة 30 يومًا، ويمكنك استبداله وقتما تحب.',
    icon: Ticket,
    accentColor: 'text-coral-500',
    bgGradient: 'from-coral-600 via-coral-700 to-ocean-900',
    targetView: 'points',
    visualPreview: {
      title: 'كوبونات الخصم المتاحة',
      items: [
        { label: 'مطعم كاستن', value: 'خصم 15% بـ 60 نقطة', icon: Ticket },
        { label: 'مطعم الجندي', value: 'خصم 12% بـ 50 نقطة', icon: Ticket },
        { label: 'حلويات سيلفر', value: 'خصم 10% بـ 40 نقطة', icon: Ticket },
      ],
    },
  },
  {
    id: 'transport_housing',
    badge: 'الخطوة الرابعة',
    title: 'شبكة المواصلات وسكن الطلبة',
    subtitle: 'كل كليات جامعة بورسعيد والمينى باص بين يديك',
    description:
      'قسم مخصص لطلبة ومغتربي بورسعيد! اعرف أسهل خط مينى باص يوصلك لكليتك (الأمين، الزهور، الـ 5000)، ومحطات النزول الدقيقة، مع دليل لسكن الطلبة القريب من الكليات.',
    features: [
      'خطوط المينى باص بين أحياء الشرق، العرب، المناخ، الضواحي، والزهور.',
      'محطات النزول الدقيقة أمام كليات الطب، الصيدلة، الهندسة، والتكنولوجيا.',
      'دليل السكن الطلابي المعتمد ووسائل الراحة القريبة.',
    ],
    arrowText: 'اختر كليتك ➔ اعرف خطك ومحطة النزول المناسبة',
    tip: 'نصيحة: المعدية بين بورسعيد وبورفؤاد مجانية للمشاة والركاب وتعمل 24 ساعة.',
    icon: Bus,
    accentColor: 'text-ocean-400',
    bgGradient: 'from-ocean-700 via-ocean-800 to-teal2-950',
    targetView: 'bus',
    visualPreview: {
      title: 'أشهر خطوط المواصلات',
      items: [
        { label: 'خط الأمين', value: 'كليات التكنولوجيا والحقوق', icon: Bus },
        { label: 'خط الزهور', value: 'كليات الطب والصيدلة والعلاج', icon: Bus },
        { label: 'خط الـ 5000', value: 'كلية التربية النوعية والإفرنج', icon: Bus },
      ],
    },
  },
  {
    id: 'assistant',
    badge: 'الخطوة الخامسة',
    title: 'مساعد بورسعيد الذكي 24/7',
    subtitle: 'مرشدك البورسعيدي الخاص في أي وقت',
    description:
      'اضغط على الزر الدائري الأزرق أسفل الشاشة للتحدث مع "مساعد بورسعيد". يفهمك بلهجة مصرية بورسعيدية ودودة، ويجيبك فوراً عن أي سؤال: أحسن أكل سمك، إزاي تروح مشوار، أو كيف تستفيد من نقاطك.',
    features: [
      'إجابات سريعة وذكية عن معالم وأسعار ومطاعم بورسعيد.',
      'أزرار ومقترحات سريعة لفتح صفحات النقاط بضغطة واحدة.',
      'مساعدتك في ترتيب يوم خروجة كامل في المدينة.',
    ],
    arrowText: 'اسأل البوت في أي وقت ➔ يجاوبك ويرشحلك الأفضل',
    tip: 'نصيحة: جرب تضغط على أحد الأسئلة المقترحة السريعة داخل الشات بوت.',
    icon: Bot,
    accentColor: 'text-teal2-400',
    bgGradient: 'from-teal2-600 via-ocean-800 to-[#061426]',
    visualPreview: {
      title: 'أمثلة لأسئلة المساعد',
      items: [
        { label: 'النقاط', value: 'إزاي أستفيد من النقط والكوبونات؟', icon: Star },
        { label: 'الأكل', value: 'أحسن مطعم سمك وسي فود فين؟', icon: Compass },
        { label: 'المواصلات', value: 'إزاي أروح كلية الهندسة بالمينى باص؟', icon: Bus },
      ],
    },
  },
  {
    id: 'merchants',
    badge: 'الخطوة السادسة',
    title: 'انضمام التجار وأصحاب الأنشطة',
    subtitle: 'لوحة تحكم شريك وعروض لآلاف الزوار',
    description:
      'إذا كنت صاحب مطعم، كافيه، أو متجر في بورسعيد، يمكنك الانضمام لمنصة Port Said Hub من خلال قسم "سجل متجرك". ستحصل على صفحة خاصة لمتجرك وتحدد نسبة الخصم والعمولة لجذب المزيد من الزبائن.',
    features: [
      'ظهور متجرك لآلاف الطلبة وزوار وسكان بورسعيد.',
      'لوحة تحكم مخصصة لإدارة العروض ونسب الخصم والعمولة.',
      'مراجعة سريعة وتفعيل للمتجر من قِبل إدارة المنصة.',
    ],
    arrowText: 'سجل متجرك ➔ انضم لشبكة تجار وشركاء بورسعيد',
    tip: 'نصيحة: يمكنك التسجيل ببيانات متجرك من الرابط أسفل الصفحة الرئيسية.',
    icon: Store,
    accentColor: 'text-sand-400',
    bgGradient: 'from-[#4a1d6e] via-[#2c1d58] to-ocean-950',
    targetView: 'partner',
    visualPreview: {
      title: 'مزايا انضمام التجار',
      items: [
        { label: 'زيادة المبيعات', value: 'جذب الطلبة وزوار المحافظة', icon: TrendingUp },
        { label: 'إدارة العروض', value: 'تحديد نسب الخصم والعمولة', icon: Zap },
        { label: 'لوحة خاصة', value: 'متابعة الطلبات والإحصائيات', icon: Store },
      ],
    },
  },
];

export const SiteGuideModal: React.FC<SiteGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleTryNow = () => {
    if (currentStep.targetView && onNavigateToView) {
      onNavigateToView(currentStep.targetView);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-3xl rounded-3xl bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div
          className={`p-5 sm:p-6 text-white bg-gradient-to-r ${currentStep.bgGradient} relative overflow-hidden transition-all duration-500`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                key={currentStep.id}
                initial={{ rotate: -20, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 grid place-items-center shadow-lg"
              >
                <StepIcon className="w-6 h-6 text-sand-300" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-sand-300 text-xs font-black">
                    {currentStep.badge}
                  </span>
                  <span className="text-xs text-white/80 font-bold">
                    ({currentStepIndex + 1} من {GUIDE_STEPS.length})
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1">{currentStep.title}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center transition text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sand-300 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / GUIDE_STEPS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Modal Body with Animated Step Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 min-h-0 bg-sand-50/40 dark:bg-[#07111c]/60">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Subtitle & Main Explanation */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-base sm:text-lg text-ocean-900 dark:text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-teal2-500`} />
                  <span>{currentStep.subtitle}</span>
                </h3>
                <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/80 leading-relaxed font-medium">
                  {currentStep.description}
                </p>
              </div>

              {/* Animated Direction Flow Arrow Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-teal2-500/10 to-ocean-500/10 border border-sand-300 dark:border-teal2-900/60 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-ocean-900 dark:text-sand-300">
                  <motion.div
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowLeft className="w-5 h-5 text-amber-500 shrink-0" />
                  </motion.div>
                  <span>{currentStep.arrowText}</span>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-1 rounded bg-amber-500 text-ocean-900">
                  مسار الخطوة
                </span>
              </div>

              {/* Two-Column Grid: Key Features & Visual Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Features List */}
                <div className="rounded-2xl bg-white dark:bg-[#111e2d] p-4 border border-sand-200/80 dark:border-[#1d2d3e] space-y-2.5 shadow-sm">
                  <h4 className="font-black text-xs sm:text-sm text-ocean-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal2-600" />
                    <span>أبرز المميزات:</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-ocean-700/80 dark:text-white/70">
                    {currentStep.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 shrink-0 mt-1.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual Preview Card */}
                <div className="rounded-2xl bg-white dark:bg-[#111e2d] p-4 border border-sand-200/80 dark:border-[#1d2d3e] space-y-2.5 shadow-sm">
                  <h4 className="font-black text-xs sm:text-sm text-ocean-900 dark:text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-500" />
                    <span>{currentStep.visualPreview.title}:</span>
                  </h4>
                  <div className="space-y-2">
                    {currentStep.visualPreview.items.map((item, idx) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-sand-50 dark:bg-[#172535] text-xs font-semibold"
                        >
                          <span className="flex items-center gap-1.5 text-ocean-700/80 dark:text-white/70">
                            <ItemIcon className="w-3.5 h-3.5 text-teal2-500" />
                            <span>{item.label}</span>
                          </span>
                          <span className="font-bold text-ocean-900 dark:text-sand-300">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tip Box */}
              <div className="p-3.5 rounded-2xl bg-sand-100/70 dark:bg-[#142333] border border-sand-200 dark:border-[#1c2e42] flex items-center gap-2.5 text-xs text-ocean-800 dark:text-white/80">
                <HelpCircle className="w-4 h-4 text-teal2-600 shrink-0" />
                <span>{currentStep.tip}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#0c1622] border-t border-sand-200/80 dark:border-[#1d2d3e] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              type="button"
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                isFirst
                  ? 'opacity-40 cursor-not-allowed bg-sand-100 dark:bg-[#152332] text-ocean-700 dark:text-white/50'
                  : 'bg-sand-100 dark:bg-[#152332] hover:bg-sand-200 text-ocean-900 dark:text-white'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>

            {currentStep.targetView && (
              <button
                onClick={handleTryNow}
                type="button"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300 font-bold text-xs hover:bg-teal2-200 transition"
              >
                <span>جرّب هذا القسم الآن</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-ocean-700/70 dark:text-white/60 hover:text-ocean-900 transition"
            >
              تخطي الجولة
            </button>

            <button
              onClick={handleNext}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal2-600 to-ocean-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal2-600/30 hover:opacity-95 transition"
            >
              <span>{isLast ? 'ابدأ الاستكشاف 🚀' : 'الخطوة التالية'}</span>
              {!isLast && <ArrowLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
