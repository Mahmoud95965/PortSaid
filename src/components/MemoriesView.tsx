'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { MemoryPost, MemoryComment } from '@/types';
import {
  Camera,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  X,
  Upload,
  Sparkles,
  Send,
  ArrowRight,
  Maximize2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  User as UserIcon,
} from 'lucide-react';

interface MemoriesViewProps {
  onBack?: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string | null; author?: string } | null>(null);

  // Comments state per post: { [memoryId]: MemoryComment[] }
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, MemoryComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load memories from API
  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/memories');
      const data = await res.json();
      if (data.ok && Array.isArray(data.memories)) {
        setMemories(data.memories);
      } else {
        setError(data.message || 'فشل في تحميل الذكريات');
      }
    } catch (err: any) {
      console.error('Error fetching memories:', err);
      setError('تعذر الاتصال بالخادم لتحميل الذكريات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً! الحد الأقصى المسموح به هو 5 ميجابايت.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) {
      setUploadError('يرجى اختيار صورة أولاً.');
      return;
    }

    if (!user) {
      setUploadError('يجب عليك تسجيل الدخول للمشاركة في الذكريات.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: previewUrl,
          caption: caption.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'فشل في رفع المنشور.');
      }

      // Add to state
      setMemories((prev) => [data.memory, ...prev]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ غير متوقع أثناء الرفع.');
    } finally {
      setUploading(false);
    }
  };

  // Toggle Like with optimistic update
  const handleToggleLike = async (memoryId: string) => {
    if (!user) {
      alert('يرجى تسجيل الدخول لتسجيل الإعجاب بالصور.');
      return;
    }

    // Optimistic state
    setMemories((prev) =>
      prev.map((item) => {
        if (item.id === memoryId) {
          const willLike = !item.liked_by_me;
          return {
            ...item,
            liked_by_me: willLike,
            likes_count: willLike ? item.likes_count + 1 : Math.max(0, item.likes_count - 1),
          };
        }
        return item;
      })
    );

    try {
      const res = await fetch('/api/memories/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Rollback
        fetchMemories();
      }
    } catch (err) {
      fetchMemories();
    }
  };

  // Delete memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الذكرى؟')) return;

    try {
      const res = await fetch(`/api/memories?id=${encodeURIComponent(memoryId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      } else {
        alert(data.message || 'فشل في حذف المنشور.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء محاولة الحذف.');
    }
  };

  // Open comments and fetch
  const handleToggleComments = async (memoryId: string) => {
    if (openCommentsPostId === memoryId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(memoryId);
    if (!commentsMap[memoryId]) {
      try {
        setCommentsLoading((prev) => ({ ...prev, [memoryId]: true }));
        const res = await fetch(`/api/memories/comment?memoryId=${encodeURIComponent(memoryId)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.comments)) {
          setCommentsMap((prev) => ({ ...prev, [memoryId]: data.comments }));
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [memoryId]: false }));
      }
    }
  };

  // Post comment
  const handleAddComment = async (memoryId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!user) {
      alert('يرجى تسجيل الدخول للتعليق.');
      return;
    }

    try {
      setSubmittingComment(true);
      const res = await fetch('/api/memories/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId,
          comment: newCommentText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setCommentsMap((prev) => ({
          ...prev,
          [memoryId]: [...(prev[memoryId] || []), data.comment],
        }));
        setMemories((prev) =>
          prev.map((m) => (m.id === memoryId ? { ...m, comments_count: m.comments_count + 1 } : m))
        );
        setNewCommentText('');
      } else {
        alert(data.message || 'فشل إضافة التعليق.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء إضافة التعليق.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Format relative date
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'مؤخراً';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'مؤخراً';
    }
  };

  const isStaff = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061a3d] via-[#092754] to-[#0d3b66] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-white/15">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal2-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-sand-300">
              <Camera className="w-3.5 h-3.5 text-sand-300" />
              <span>مجتمع بورسعيد ومسابقات الصور</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              ارفع ذكرياتك في بورسعيد
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              كل لحظة في بورسعيد حكاية! شارك لقطاتك المفضلة عند ممشى ديليسبس، رحلة المعدية، الفنار، وشوارع حي الشرق مع أهل وزوار المدينة الباسلة.
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

            <button
              onClick={() => setShowUploadModal(true)}
              type="button"
              className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#ffd27a] to-[#ffb938] text-ocean-900 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-ocean-900" />
              <span>شارك ذكرى جديدة 📷</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Area */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal2-600 dark:text-teal2-400 mx-auto" />
          <p className="text-sm font-bold text-ocean-700/80 dark:text-white/70">جاري تحميل ذكريات بورسعيد...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] space-y-4">
          <Camera className="w-12 h-12 text-sand-500 mx-auto" />
          <h3 className="text-lg font-black text-ocean-900 dark:text-white">لا توجد ذكريات بعد</h3>
          <p className="text-xs sm:text-sm text-ocean-700/70 dark:text-white/60 max-w-md mx-auto">
            كن أول من يشارك صورة تذكارية رائعة في شوارع ومعالم بورسعيد ليراها الجميع!
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            type="button"
            className="px-5 py-2.5 rounded-2xl bg-ocean-900 text-white font-bold text-xs shadow hover:bg-ocean-800 transition"
          >
            شارك أول صورة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memories.map((post) => {
            const canDelete = isStaff || (user?.id && user.id === post.user_id);
            const isCommentsOpen = openCommentsPostId === post.id;
            const postComments = commentsMap[post.id] || [];
            const isLoadingComments = commentsLoading[post.id];

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300/80 dark:border-[#1d2d3e] shadow-md overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow duration-200"
              >
                {/* Author Header */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-sand-200 dark:border-[#1a2739]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-sand-100 dark:bg-[#162738] text-ocean-800 dark:text-sand-300 grid place-items-center font-bold text-sm overflow-hidden shrink-0">
                      {post.user_avatar ? (
                        <img src={post.user_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        post.user_name?.charAt(0) || <UserIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xs sm:text-sm text-ocean-900 dark:text-white truncate">
                        {post.user_name}
                      </p>
                      <p className="text-[10px] text-ocean-700/60 dark:text-white/50 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(post.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMemory(post.id)}
                      type="button"
                      title="حذف هذه الذكرى"
                      className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Image */}
                <div
                  onClick={() => setLightboxImage({ url: post.image_url, caption: post.caption, author: post.user_name })}
                  className="relative aspect-[4/3] bg-sand-100 dark:bg-[#121c29] cursor-pointer group overflow-hidden"
                >
                  <img
                    src={post.image_url}
                    alt={post.caption || 'Port Said Memory'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Caption & Actions */}
                <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {post.caption && (
                    <p className="text-xs sm:text-sm text-ocean-900 dark:text-white/90 leading-relaxed font-medium">
                      {post.caption}
                    </p>
                  )}

                  <div className="pt-2 border-t border-sand-200 dark:border-[#1a2739] flex items-center justify-between gap-2">
                    {/* Like button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        post.liked_by_me
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          : 'bg-sand-100 dark:bg-[#162738] text-ocean-700 dark:text-white/70 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`}
                      />
                      <span>{post.likes_count}</span>
                    </button>

                    {/* Comments button */}
                    <button
                      onClick={() => handleToggleComments(post.id)}
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        isCommentsOpen
                          ? 'bg-teal2-50 dark:bg-teal2-950/40 text-teal2-700 dark:text-teal2-400'
                          : 'bg-sand-100 dark:bg-[#162738] text-ocean-700 dark:text-white/70 hover:bg-teal2-50 hover:text-teal2-700'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments_count}</span>
                      <span className="text-[10px] hidden min-[400px]:inline">تعليقات</span>
                    </button>
                  </div>

                  {/* Expandable Comments Drawer */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-sand-200 dark:border-[#1a2739] space-y-3"
                      >
                        {isLoadingComments ? (
                          <div className="py-2 text-center text-xs text-ocean-700/60 dark:text-white/50">
                            جاري تحميل التعليقات...
                          </div>
                        ) : postComments.length === 0 ? (
                          <p className="text-[11px] text-center text-ocean-700/60 dark:text-white/50 py-1">
                            لا توجد تعليقات بعد، كن أول المعلقين!
                          </p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {postComments.map((comm) => (
                              <div
                                key={comm.id}
                                className="p-2 rounded-xl bg-sand-50 dark:bg-[#121c29] border border-sand-200/60 dark:border-[#1a2739] text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-ocean-900 dark:text-white">
                                    {comm.user_name}
                                  </span>
                                  <span className="text-[9px] text-ocean-700/50 dark:text-white/40">
                                    {formatTime(comm.created_at)}
                                  </span>
                                </div>
                                <p className="text-ocean-800 dark:text-white/80 leading-relaxed font-medium">
                                  {comm.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment input */}
                        <form
                          onSubmit={(e) => handleAddComment(post.id, e)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder={user ? 'اكتب تعليقك...' : 'سجل دخولك للتعليق'}
                            disabled={!user || submittingComment}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs font-bold text-ocean-900 dark:text-white focus:outline-none focus:border-teal2-500 disabled:opacity-60"
                          />
                          <button
                            type="submit"
                            disabled={!user || submittingComment || !newCommentText.trim()}
                            className="p-2 rounded-xl bg-teal2-600 hover:bg-teal2-700 disabled:opacity-50 text-white transition shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload Memory Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-[#0f1722] rounded-3xl p-6 shadow-2xl border border-sand-300 dark:border-[#223246] space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-sand-200 dark:border-[#1f2d3f]">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-teal2-600 dark:text-teal2-400" />
                  <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white">
                    شارك ذكرى جديدة في بورسعيد
                  </h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  type="button"
                  className="p-1 rounded-xl text-ocean-700 hover:bg-sand-100 dark:text-white/70 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* File Upload Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-sand-100 dark:bg-[#1a2739] border border-sand-300 dark:border-[#223246]">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[16/10] rounded-2xl border-2 border-dashed border-sand-300 dark:border-[#2a3a4f] hover:border-teal2-500 transition grid place-items-center cursor-pointer p-6 text-center bg-sand-50/50 dark:bg-[#121c29]/50"
                    >
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-teal2-600 dark:text-teal2-400 mx-auto animate-pulse" />
                        <div>
                          <p className="font-black text-xs sm:text-sm text-ocean-900 dark:text-white">
                            اضغط لاختيار صورة الذكرى
                          </p>
                          <p className="text-[11px] text-ocean-700/60 dark:text-white/50 mt-1 font-medium">
                            الصيغ المتاحة: JPEG, PNG, WEBP (الحد الأقصى 5MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption Textarea */}
                <div>
                  <label className="block text-xs font-black text-ocean-900 dark:text-white mb-1.5">
                    اكتب وصفاً أو حكاية عن الصورة (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="مثال: صورة ممشى ديليسبس وقت الغروب، أو قهوة الصباح عند المعدية..."
                    className="w-full p-3 rounded-2xl bg-sand-50 dark:bg-[#121c29] border border-sand-300 dark:border-[#223246] text-xs sm:text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:border-teal2-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-sand-300 dark:border-[#2a3a4f] text-ocean-900 dark:text-white text-xs font-bold hover:bg-sand-100 dark:hover:bg-white/10"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !previewUrl}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal2-600 to-ocean-900 text-white font-black text-xs sm:text-sm shadow hover:opacity-95 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري النشر...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>نشر في الذكريات</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 relative"
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-2 left-2 p-2 rounded-full bg-black/70 text-white hover:bg-black transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <img
                src={lightboxImage.url}
                alt=""
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />

              {(lightboxImage.caption || lightboxImage.author) && (
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white text-center text-xs sm:text-sm max-w-xl">
                  {lightboxImage.caption && <p className="font-bold">{lightboxImage.caption}</p>}
                  {lightboxImage.author && (
                    <p className="text-[11px] text-white/70 mt-1">بواسطة: {lightboxImage.author}</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
