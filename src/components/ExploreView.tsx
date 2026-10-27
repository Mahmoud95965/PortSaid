'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { HistoricalStory, Place } from '@/types';
import {
  Compass,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';

export interface ExploreViewProps {
  places?: Place[];
  onSelectPlace?: (placeId: string) => void;
  onSelectCategory?: (categoryKey: string) => void;
  onNavigate?: (view: string, arg?: string | null) => void;
  onBack?: () => void;
}

// Fallback baseline historical stories if API is loading or offline
const BASELINE_STORIES: HistoricalStory[] = [
  {
    id: 'story-1',
    title_ar: 'تأسيس بورسعيد وضربة الفأس الأولى',
    era_year: '1859 م',
    summary_ar: 'في 25 أبريل 1859 أطلق فرديناند ديليسبس إشارة البدء بحفر قناة السويس عند النقطة التي تحولت إلى بورسعيد، تيمناً بوالي مصر محمد سعيد باشا.',
    content_ar: 'بدأت قصة بورسعيد كشريط رملي ضيق يفصل البحر المتوسط عن بحيرة المنزلة. احتشد آلاف الفلاحين والعمال المصريين ليبدأوا أعظم ملحمة حفر في التاريخ الحديث؛ حفر قناة السويس بالجهد والعرق، لتولد مدينة عالمية ربطت بين الشرق والغرب وأصبحت بوابة الملاحة الدولية الأولى في العالم.',
    image_url: '/assets/port-said/hero-01.webp',
    additional_images: ['/assets/port-said/port-said-port-night.webp'],
    sort_order: 1,
    is_published: true,
  },
  {
    id: 'story-2',
    title_ar: 'فنار بورسعيد التاريخي.. أول مبنى خرساني في العالم',
    era_year: '1869 م',
    summary_ar: 'شُيّد عام 1869 وافتتح بالتزامن مع افتتاح قناة السويس، ويُعد أول مبنى شُيّد بالخرسانة المسلحة في العالم على يد المعماري فرانسوا كوانييه.',
    content_ar: 'يعد فنار بورسعيد القديم معجزة هندسية وثقافية رائدة. يتميز بتصميمه الثماني الأضلاع وارتفاعه الشاهق الذي يبلغ حوالي 56 متراً، وكان مرشداً لكل سفن العالم العابرة لقناة السويس. يحمل الفنار قيمة معمارية فريدة جعلته مسجلاً ضمن الآثار الإسلامية والقبطية المصرية ومقصداً لعشاق التراث.',
    image_url: '/assets/port-said/port-said-lighthouse.webp',
    additional_images: ['/assets/port-said/hero-01.webp'],
    sort_order: 2,
    is_published: true,
  },
  {
    id: 'story-3',
    title_ar: 'العمارة الكوزموبوليتانية وشرفات الخشب التاريخية',
    era_year: '1880 - 1930 م',
    summary_ar: 'تميز حي الشرق (الحي الإفرنجي) بطراز معماري فريد يجمع بين النمط الفرنسي والإيطالي والشرفات الخشبية (Verandas) لمقاومة الرطوبة وتوفير الظل.',
    content_ar: 'احتضنت بورسعيد في أواخر القرن التاسع عشر مجتمعاً متعدد الثقافات من فرنسيين وإيطاليين ويونانيين وبريطانيين عاشوا جنباً إلى جنب مع أهل المدينة في حي العرب. انعكس هذا التنوع على الهندسة المعمارية؛ مبانٍ متناسقة وأسقف خشبية وأروقة للمشاة تحمي من حرارة الصيف وأمطار الشتاء، مما جعل شوارع بورسعيد لوحة معمارية مفتوحة.',
    image_url: '/assets/port-said/gallery/balconies-street.webp',
    additional_images: ['/assets/port-said/port-said-port-night.webp'],
    sort_order: 3,
    is_published: true,
  },
  {
    id: 'story-4',
    title_ar: 'ملحمة الصمود والعدوان الثلاثي.. المدينة الباسلة',
    era_year: '1956 م',
    summary_ar: 'سطر أبناء بورسعيد وفدائيوها أعظم ملاحم المقاومة الشعبية ضد قوى العدوان الثلاثي، حتى أُجبرت القوات المعتدية على الجلاء في 23 ديسمبر 1956.',
    content_ar: 'تحملت بورسعيد القصف والإنزال الجوي والبحري بشجاعة استثنائية. شكّل الأهالي والفدائيون مجموعات مقاومة سرية أربكت قيادات الغزاة وأسقطت ضباطهم وأسرت قادتهم، حتى أقر العالم ببسالة المدينة. أطلق عليها الرئيس جمال عبد الناصر لقب "المدينة الباسلة" وأصبح يوم 23 ديسمبر هو العيد القومي السنوي لمحافظة بورسعيد ومسلة النصر بميدان الشهداء تخليداً لهذه التضحيات.',
    image_url: '/assets/port-said/gallery/martyrs-square.webp',
    additional_images: ['/assets/port-said/port-said-mosque.webp'],
    sort_order: 4,
    is_published: true,
  },
  {
    id: 'story-5',
    title_ar: 'بورسعيد المنطقة الحرة وعصر التجارة الذهبي',
    era_year: '1976 م',
    summary_ar: 'أصدر الرئيس أنور السادات القانون رقم 12 لسنة 1976 بإعلان بورسعيد منطقة حرة تجارية، مما حولها إلى عاصمة التسوق والاستيراد لجميع المصريين.',
    content_ar: 'تدفقت البضائع الأوروبية والماركات العالمية والملابس والمنسوجات على أسواق بورسعيد (الحميدي، البازار، والتجاري). أصبحت رحلة قطار بورسعيد أو السفر بالسيارة طقساً أساسياً لكل أسرة مصرية للتسوق وشراء مستلزمات العرائس والاستمتاع بأكلات السمك البورسعيدي الطازج.',
    image_url: '/assets/port-said/port-said-port-night.webp',
    additional_images: ['/assets/port-said/hero-02.webp'],
    sort_order: 5,
    is_published: true,
  },
  {
    id: 'story-6',
    title_ar: 'حكاية المعدية التاريخية وقناة الاتصال وبورفؤاد',
    era_year: '1920 م - اليوم',
    summary_ar: 'المعدية ليست مجرد وسيلة مواصلات بين قارتي إفريقيا وآسيا، بل هي روح بورسعيد الحية وصوت النوارس وطقوس إطعام الحمام والخبز في عرض القناة.',
    content_ar: 'أنشئت مدينة بورفؤاد عام 1920 على الضفة الشرقية لقناة السويس لتكون مقراً لورش وفيلات هيئة قناة السويس. ارتبطت المدينتان برحلة المعدية المجانية التي تستغرق 10 دقائق تعبر خلالها بين قارتين وتلتقي بالسفن العالمية العملاقة، لتظل المعدية أيقونة وجدانية لكل من زار بورسعيد أو عاش فيها.',
    image_url: '/assets/port-said/gallery/ship.webp',
    additional_images: ['/assets/port-said/hero-03.webp'],
    sort_order: 6,
    is_published: true,
  },
];

export const PLACE_PHOTOS: Record<string, string> = {
  '20000000-0000-0000-0000-000000000001': '/assets/port-said/hero-02.webp',
  '20000000-0000-0000-0000-000000000002': '/assets/port-said/gallery/balconies-street.webp',
  '20000000-0000-0000-0000-000000000004': '/assets/port-said/port-said-port-night.webp',
  '20000000-0000-0000-0000-000000000005': '/assets/port-said/hero-02.webp',
  '20000000-0000-0000-0000-000000000009': '/assets/port-said/hero-01.webp',
};

export function getPlacePhoto(place: { id?: string; n?: string; cat?: string }): string {
  if (place.id && PLACE_PHOTOS[place.id]) {
    return PLACE_PHOTOS[place.id];
  }
  return '/assets/port-said/hero-01.webp';
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  places = [],
  onSelectPlace,
  onSelectCategory,
  onNavigate,
  onBack,
}) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<HistoricalStory[]>(BASELINE_STORIES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState<HistoricalStory | null>(null);

  // Fetch live stories from DB / API
  useEffect(() => {
    async function loadStories() {
      try {
        setLoading(true);
        const res = await fetch('/api/historical-stories');
        const data = await res.json();
        if (data.ok && Array.isArray(data.stories) && data.stories.length > 0) {
          setStories(data.stories);
        }
      } catch (err) {
        console.error('Error fetching historical stories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, []);

  const filteredStories = useMemo(() => {
    let list = stories;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title_ar.toLowerCase().includes(q) ||
          s.summary_ar.toLowerCase().includes(q) ||
          s.content_ar.toLowerCase().includes(q) ||
          (s.era_year && s.era_year.toLowerCase().includes(q))
      );
    }
    return list;
  }, [stories, searchQuery]);

  const isStaff = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Historical Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061a3d] via-[#092754] to-[#0d3b66] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-white/15">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sand-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-sand-300">
              <Compass className="w-3.5 h-3.5 text-sand-300" />
              <span>الدليل التاريخي الرسمي لبورسعيد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              اكتشف تاريخ بورسعيد.. قصة المدينة الباسلة
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              رحلة وثائقية ملهمة في تاريخ بورسعيد منذ ضربة الفأس الأولى عام 1859 وحتى ملحمة الصمود في 1956 وعصر المنطقة الحرة. قصص ومعالم وثّقها فريق Port Said Hub.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2"
              >
                <span>الرئيسية</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {isStaff && (
              <a
                href="/admin"
                className="px-4 py-2.5 rounded-2xl bg-sand-400 hover:bg-sand-300 text-ocean-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow"
              >
                <Shield className="w-4 h-4" />
                <span>إدارة التاريخ في لوحة التحكم</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Search and Timeline Stats Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في تاريخ ومعالم بورسعيد..."
            className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white placeholder:text-ocean-700/50 dark:placeholder:text-white/40 focus:outline-none focus:border-teal2-500"
          />
          <Search className="w-4 h-4 text-ocean-700/60 dark:text-white/50 absolute top-1/2 -translate-y-1/2 right-3.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 left-3 p-1 text-ocean-700 dark:text-white/60 hover:text-ocean-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-ocean-700/80 dark:text-white/70">
          <BookOpen className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
          <span>{filteredStories.length} محطات تاريخية موثقة</span>
        </div>
      </div>

      {/* Historical Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStories.map((story, idx) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300/80 dark:border-[#1d2d3e] shadow-md overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-teal2-400 transition-all duration-300"
          >
            {/* Story Image */}
            <div className="relative aspect-[16/10] bg-sand-100 dark:bg-[#121c29] overflow-hidden">
              <img
                src={story.image_url}
                alt={story.title_ar}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Era Badge */}
              {story.era_year && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-ocean-900/90 backdrop-blur-md border border-white/20 text-sand-300 text-xs font-black flex items-center gap-1.5 shadow">
                  <Calendar className="w-3.5 h-3.5 text-sand-400" />
                  <span>{story.era_year}</span>
                </div>
              )}

              {/* Order Pill */}
              <div className="absolute bottom-3 right-3 text-white">
                <span className="text-[10px] font-black uppercase tracking-wider text-sand-300">محطة {idx + 1}</span>
                <h3 className="font-black text-base sm:text-lg text-white leading-tight drop-shadow-md">
                  {story.title_ar}
                </h3>
              </div>
            </div>

            {/* Story Summary and Action */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-ocean-700/85 dark:text-white/75 leading-relaxed font-medium line-clamp-3">
                {story.summary_ar}
              </p>

              <div className="pt-3 border-t border-sand-200 dark:border-[#1a2739] flex items-center justify-between">
                <button
                  onClick={() => setSelectedStory(story)}
                  type="button"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sand-100 dark:bg-[#162738] text-ocean-900 dark:text-white font-bold text-xs hover:bg-teal2-600 hover:text-white transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>اقرأ القصة كاملة</span>
                </button>

                <span className="text-[11px] text-ocean-700/60 dark:text-white/50 font-bold">
                  توثيق رسمي
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Story Reading Modal */}
      <AnimatePresence>
        {selectedStory && (
          <div
            onClick={() => setSelectedStory(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-[#0f1722] rounded-3xl p-6 sm:p-8 shadow-2xl border border-sand-300 dark:border-[#223246] space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-sand-200 dark:border-[#1f2d3f]">
                <div className="space-y-1">
                  {selectedStory.era_year && (
                    <span className="inline-block px-3 py-0.5 rounded-full bg-sand-400 text-ocean-950 text-xs font-black">
                      {selectedStory.era_year}
                    </span>
                  )}
                  <h2 className="text-xl sm:text-2xl font-black text-ocean-900 dark:text-white">
                    {selectedStory.title_ar}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedStory(null)}
                  type="button"
                  className="p-1.5 rounded-xl text-ocean-700 hover:bg-sand-100 dark:text-white/70 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Image */}
              <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-sand-100 dark:bg-[#162738] border border-sand-200 dark:border-[#1f2d3f]">
                <img
                  src={selectedStory.image_url}
                  alt={selectedStory.title_ar}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content narrative */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-200/80 dark:border-[#1f2d3f] text-xs sm:text-sm font-bold text-ocean-800 dark:text-sand-200 leading-relaxed">
                  💡 {selectedStory.summary_ar}
                </div>

                <div className="text-xs sm:text-sm text-ocean-900 dark:text-white/90 leading-relaxed space-y-2 whitespace-pre-line font-medium">
                  {selectedStory.content_ar}
                </div>
              </div>

              {/* Additional gallery images */}
              {selectedStory.additional_images && selectedStory.additional_images.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-sand-200 dark:border-[#1f2d3f]">
                  <p className="text-xs font-black text-ocean-900 dark:text-white">صور إضافية توثيقية</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedStory.additional_images.map((imgUrl, i) => (
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden aspect-[4/3] bg-sand-100 dark:bg-[#162738] border border-sand-200 dark:border-[#1f2d3f]"
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Modal Action */}
              <div className="flex items-center justify-between pt-3 border-t border-sand-200 dark:border-[#1f2d3f]">
                <span className="text-xs text-ocean-700/60 dark:text-white/50 font-bold">
                  فريق بورسعيد هب التوثيقي
                </span>
                <button
                  onClick={() => setSelectedStory(null)}
                  type="button"
                  className="px-5 py-2 rounded-xl bg-ocean-900 text-white font-bold text-xs hover:bg-ocean-800 transition"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
