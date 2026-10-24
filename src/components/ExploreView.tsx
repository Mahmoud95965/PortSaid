'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExploreItem, CommunityUpload } from '@/types';
import { ArrowRight, Camera, X, UploadCloud, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ExploreViewProps {
  onBack: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const exploreItems: ExploreItem[] = [
    {
      id: '1',
      kind: 'image',
      t: 'فنار بورسعيد القديم',
      d: 'التحفة المعمارية التي تأسست عام 1869 عند مدخل القناة',
      f: '/assets/port-said/port-said-lighthouse.webp',
    },
    {
      id: '2',
      kind: 'image',
      t: 'ميناء بورسعيد ليلًا',
      d: 'أضواء وسفن المجرى الملاحي العالمي',
      f: '/assets/port-said/port-said-port-night.webp',
    },
    {
      id: '3',
      kind: 'image',
      t: 'مسجد السلام التاريخي',
      d: 'أحد أهم مساجد ومعالم المدينة',
      f: '/assets/port-said/port-said-mosque.webp',
    },
    {
      id: '4',
      kind: 'image',
      t: 'شرفات الحي الإفرنجي الخشبية',
      d: 'عمارة كلاسيكية تتحدث عن تاريخ المدينة',
      f: '/assets/port-said/gallery/balconies-street.webp',
    },
    {
      id: '5',
      kind: 'image',
      t: 'ميدان الشهداء ومسلة النصر',
      d: 'رمز الفداء وصمود أبطال بورسعيد',
      f: '/assets/port-said/gallery/martyrs-square.webp',
    },
    {
      id: '6',
      kind: 'image',
      t: 'سفينة في قناة السويس',
      d: 'مشهد يومي مهيب يربط قارات العالم',
      f: '/assets/port-said/gallery/ship.webp',
    },
  ];

  const [communityUploads, setCommunityUploads] = useState<CommunityUpload[]>([
    {
      id: 'c1',
      f: '/assets/port-said/gallery/balconies-street.webp',
      t: 'غروب الشمس من المعدية',
      user_name: 'أحمد سعيد',
      status: 'approved',
    },
    {
      id: 'c2',
      f: '/assets/port-said/port-said-lighthouse.webp',
      t: 'الفنار من زاوية مختلفة',
      user_name: 'نور الدين',
      status: 'approved',
    },
  ]);

  const allPhotos = [
    ...exploreItems.map((e) => ({ src: e.f, cap: e.t, desc: e.d })),
    ...communityUploads.map((c) => ({
      src: c.f,
      cap: c.t,
      desc: `بواسطة: ${c.user_name || 'زائر'}`,
    })),
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) return;

    const newUpload: CommunityUpload = {
      id: crypto.randomUUID(),
      f: previewUrl,
      t: caption.trim() || 'لقطة من زائر',
      user_name: user?.name || 'زائر',
      status: 'approved',
    };

    setCommunityUploads([newUpload, ...communityUploads]);
    setUploadStatus('تم رفع صورتك بنجاح! شكرًا لمشاركتك معنا.');
    setTimeout(() => {
      setUploadModalOpen(false);
      setPreviewUrl(null);
      setCaption('');
      setUploadStatus('');
    }, 1500);
  };

  return (
    <motion.div
      className="space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <motion.button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-teal2-600 transition group"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          <span>رجوع للرئيسية</span>
        </motion.button>

        <motion.button
          onClick={() => setUploadModalOpen(true)}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs sm:text-sm shadow-md transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Camera className="w-4 h-4" />
          <span>شاركنا لقطتك</span>
        </motion.button>
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white flex items-center gap-2">
          <span>استكشف بورسعيد</span>
          <Sparkles className="w-6 h-6 text-sand-400" />
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 font-semibold">
          تعرّف على معالم المدينة الباسلة وشاهد أجمل لقطات الزوار والتاريخ.
        </p>
      </div>

      {/* Main Grid */}
      <div>
        <h3 className="mb-4 text-base sm:text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-teal2-600 dark:text-teal2-400" />
          <span>أهم اللقطات والمعالم</span>
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {allPhotos.map((p, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="group relative block overflow-hidden rounded-2xl sm:rounded-3xl shadow-md bg-white dark:bg-[#0f1a28] text-right aspect-[4/3] border border-sand-200/80 dark:border-[#1d2d3e]"
            >
              <img
                src={p.src}
                alt={p.cap}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
              />
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white font-black text-xs sm:text-sm">
                <span className="block truncate">{p.cap}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0f1a28] p-6 text-ocean-900 dark:text-white shadow-2xl border border-sand-200/80 dark:border-[#1d2d3e]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-sand-200 dark:border-[#1d2d3e]">
                <h3 className="text-lg font-black">شاركنا لقطتك من بورسعيد</h3>
                <motion.button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-sand-100 dark:bg-[#1a2d42] grid place-items-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">اختر الصورة</label>
                  <label className="w-full h-36 border-2 border-dashed border-sand-300 dark:border-[#22354a] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-teal2-500 transition overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-3">
                        <UploadCloud className="w-8 h-8 text-teal2-600 mx-auto mb-1" />
                        <p className="text-xs font-bold">اضغط لاختيار صورة من جهازك</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">تعليق أو عنوان للصورة</label>
                  <input
                    type="text"
                    placeholder="مثال: ممشى ديليسبس وقت الغروب"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-medium"
                    required
                  />
                </div>

                {uploadStatus && (
                  <p className="text-xs font-bold text-teal2-600 text-center">{uploadStatus}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={!previewUrl}
                  className="w-full py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-sm shadow transition disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  نشر الصورة
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              onClick={() => setLightboxIndex(null)}
              type="button"
              aria-label="إغلاق"
              className="absolute top-4 left-4 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex - 1 + allPhotos.length) % allPhotos.length);
              }}
              type="button"
              aria-label="السابق"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % allPhotos.length);
              }}
              type="button"
              aria-label="التالي"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/20 text-white grid place-items-center hover:bg-white/30 transition shadow-lg"
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <img
                src={allPhotos[lightboxIndex].src}
                alt=""
                className="max-w-full max-h-[75vh] rounded-2xl sm:rounded-3xl object-contain shadow-2xl border border-white/10"
              />
              <div className="text-center text-white px-4">
                <p className="font-black text-base sm:text-lg">{allPhotos[lightboxIndex].cap}</p>
                {allPhotos[lightboxIndex].desc && (
                  <p className="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                    {allPhotos[lightboxIndex].desc}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
