import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AREA_STOP, HOME_STOP } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm, identifyPortSaidDistrict } from '@/lib/geoUtils';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dbFindUserById } from '@/lib/db/localDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * نوع مكان موحّد يستخدمه المساعد — مصدره دائماً قاعدة البيانات الحية
 * (جدول places)، وليس بيانات احتياطية قديمة داخل الكود.
 */
export interface LivePlace {
  id: string;
  n: string;
  a: string;
  cat: string;
  lat: number;
  lon: number;
  ds: string;
  disc: number;
  p: number;
  cost: number;
  rating: number | null;
  reviewsCount: number | null;
}

/**
 * جلب الأماكن الحية من Supabase (الوضع الحالي: الأماكن المستوردة من ملف محمود).
 * يعيد null عند أي فشل — وفي هذه الحالة يرد المساعد برسالة قصيرة تفيد بعدم توفر
 * البيانات، ولا يجيب أبداً من بيانات قديمة داخل الكود.
 */
async function fetchLivePlaces(): Promise<LivePlace[] | null> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('places')
      .select('id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, rating, ratings_count, categories(code)')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: String(row.id),
      n: row.name_ar || '',
      a: row.area_ar || '',
      cat: row.categories?.code || 'food',
      lat: Number(row.latitude) || 0,
      lon: Number(row.longitude) || 0,
      ds: row.description_ar || '',
      disc: Number(row.discount_percent) || 0,
      p: Number(row.visit_points) || 20,
      cost: Number(row.coupon_cost_points) || 0,
      rating: row.rating != null ? Number(row.rating) : null,
      reviewsCount: row.ratings_count != null ? Number(row.ratings_count) : null,
    }));
  } catch (e) {
    console.warn('Assistant live places fetch failed:', e);
    return null;
  }
}

export interface TransitKnowledge {
  text: string;
  stopNames: string[];
  stopNameById: Record<string, string>;
}

/**
 * جلب شبكة المواصلات الحية (خطوط ومحطات ورحلات جاهزة) من جداول transit_*.
 * عند غياب الجداول، يعود لنص مختصر بأسماء الخطوط العامة فقط.
 */
async function fetchTransitKnowledge(): Promise<TransitKnowledge> {
  const fallback: TransitKnowledge = {
    text: 'خطوط المواصلات: الأمين، الزهور، الـ5000، السلام، أسوان.',
    stopNames: [],
    stopNameById: {},
  };
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return fallback;
    const [{ data: lines }, { data: stops }, { data: lineStops }, { data: trips }] = await Promise.all([
      supabase.from('transit_lines').select('id, name_ar, description_ar, outbound_path_ar, return_path_ar').order('sort_order'),
      supabase.from('transit_stops').select('id, name_ar, short_name_ar').order('sort_order'),
      supabase.from('transit_line_stops').select('line_id, stop_id, seq').order('seq'),
      supabase.from('transit_trips').select('id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed').order('sort_order'),
    ]);
    if (!lines || lines.length === 0 || !stops) return fallback;
    const stopNameById: Record<string, string> = {};
    const stopShortById: Record<string, string> = {};
    const stopNames: string[] = [];
    for (const s of stops as any[]) {
      stopNameById[s.id] = s.name_ar;
      stopShortById[s.id] = s.short_name_ar || s.name_ar;
      stopNames.push(s.name_ar);
      if (s.short_name_ar && s.short_name_ar !== s.name_ar) stopNames.push(s.short_name_ar);
    }
    const stopsByLine: Record<string, string[]> = {};
    for (const ls of (lineStops || []) as any[]) {
      (stopsByLine[ls.line_id] = stopsByLine[ls.line_id] || []).push(stopNameById[ls.stop_id] || ls.stop_id);
    }
    const lineNameById: Record<string, string> = {};
    for (const l of lines as any[]) lineNameById[l.id] = l.name_ar;
    const linesText = (lines as any[])
      .map((l) => {
        const ss = (stopsByLine[l.id] || []).join(' ← ');
        const paths = [l.outbound_path_ar, l.return_path_ar].filter(Boolean).join(' | ');
        return `- خط ${l.name_ar}: ${ss}${l.description_ar ? ` (${l.description_ar})` : ''}${paths ? ` — ${paths}` : ''}`;
      })
      .join('\n');
    const tripsText = ((trips || []) as any[])
      .map((t) => {
        const legs = Array.isArray(t.legs)
          ? t.legs
              .map((leg: any, i: number) => {
                if (!leg.line_id) return leg.note ? `امشِ ${leg.note}` : '';
                const lineName = lineNameById[leg.line_id] || leg.line_id;
                const from = stopShortById[leg.from_stop_id] || leg.from_stop_id || '';
                const to = stopNameById[leg.to_stop_id] || leg.to_stop_id || '';
                const alight = leg.alight_text || to;
                const alightPhrase =
                  alight.startsWith('قدام') || alight.startsWith('عند') ? alight : `عند ${alight}`;
                return i === 0
                  ? `اركب خط ${lineName} من ${from} وانزل ${alightPhrase}`
                  : `بعدها اركب خط ${lineName} وانزل ${alightPhrase}`;
              })
              .filter(Boolean)
              .join('، ')
          : '';
        return `- ${t.title_ar || `${stopNameById[t.from_stop_id] || ''} ← ${stopNameById[t.to_stop_id] || ''}`}: ${legs}${t.is_confirmed === false ? ' (لسه محتاجة تأكيد)' : ''}`;
      })
      .join('\n');
    return {
      text: `خطوط المواصلات الحية:\n${linesText}\n\nرحلات جاهزة:\n${tripsText}`,
      stopNames,
      stopNameById,
    };
  } catch (e) {
    console.warn('Assistant transit fetch failed:', e);
    return fallback;
  }
}

function buildSystemPrompt(placesText: string, transitText: string): string {
  return `
أنت "مساعد بورسعيد الذكي"، مرشد مختصر وودود داخل منصة Port Said Hub.
تحدث بالعربية (لمسة مصرية بورسعيدية راقية).

قواعد الرد — التزم بها دائماً:
1. اختصر: الرد العادي من سطرين إلى أربعة أسطر كحد أقصى. لا تطوّل ولا تكرر نفسك.
2. التفاصيل (أسعار، مواعيد، مواصلات، خصومات) تذكرها فقط عندما يسأل عنها المستخدم صراحة.
3. لا تضف أقساماً ثابتة في نهاية الرد ولا نصائح عامة إلا إذا طلبها المستخدم.
4. عند ترشيح مكان، اذكر اسمه الدقيق كما هو في قاعدة البيانات بالأسفل حتى تظهر الخريطة فوراً.
5. استخدم حصرياً البيانات الحية بالأسفل. إن لم يكن الشيء موجوداً فيها، قل باختصار إنه غير موجود في بياناتنا الحالية ولا تخترع بديلاً.
6. للمواصلات استخدم خطوط ورحلات البيانات الحية بالأسفل، وصِف الطريق بالصيغة: "اركب خط كذا من كذا وانزل عند كذا، بعدها اركب خط كذا وانزل عند كذا".
7. بيانات المستخدم المرفقة تخص المتحدث معك وحده فقط. لا تذكر أو تكشف أي بيانات عن أي مستخدم آخر — ليست لديك، ولا تسأل عنها.
8. لا تكتب أي وسوم تفكير داخل الرد نهائياً (ممنوع وسوم <think> أو تفكير داخلي).
9. منصة Port Said Hub هي فكرة وتطوير فريق Alpha Team، وتم تصميم الموقع بالشراكة مع Genie. إذا سألك المستخدم عن صاحب الموقع أو الفكرة أجب أنه فريق Alpha Team، وإذا سألك عن التصميم اذكر أنه صُمم بالشراكة مع Genie.

الأماكن الحية المعتمدة في بورسعيد:
${placesText}

${transitText}
`;
}

export interface UserContextData {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    user_type?: string;
    institution?: string | null;
    governorate?: string | null;
    points_balance: number;
  } | null;
  favoritePlaceIds: string[];
  visitedPlaceIds: string[];
}

/**
 * جلب سياق المستخدم الحالي وبياناته الكاملة
 */
async function getUserContext(localFavorites: string[] = []): Promise<UserContextData> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return { user: null, favoritePlaceIds: localFavorites, visitedPlaceIds: [] };
    }
    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return { user: null, favoritePlaceIds: localFavorites, visitedPlaceIds: [] };
    }

    const supabase = getSupabaseServer();
    if (supabase) {
      // 1. استرجاع بيانات المستخدم من Supabase
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, name, email, phone, points_balance, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
        .eq('id', session.userId)
        .maybeSingle();

      // 2. استرجاع مفضلة المستخدم من Supabase
      const { data: favs } = await supabase
        .from('user_favorites')
        .select('place_id')
        .eq('user_id', session.userId);

      // 3. استرجاع زيارات المستخدم من Supabase
      const { data: visits } = await supabase
        .from('visits')
        .select('place_id')
        .eq('user_id', session.userId);

      const cloudFavs = (favs || []).map((f: any) => f.place_id);
      const allFavs = Array.from(new Set([...cloudFavs, ...localFavorites]));
      const visited = (visits || []).map((v: any) => v.place_id);

      if (dbUser) {
        const getJoinedField = (field: any, key: string) => {
          if (!field) return null;
          if (Array.isArray(field)) return field[0]?.[key] || null;
          return field[key] || null;
        };

        return {
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: getJoinedField(dbUser.roles, 'code') || session.role || 'user',
            user_type: getJoinedField(dbUser.user_types, 'code') || 'student',
            institution: getJoinedField(dbUser.institutions, 'name_ar') || null,
            governorate: getJoinedField(dbUser.governorates, 'name_ar') || 'بورسعيد',
            points_balance: dbUser.points_balance || 0,
          },
          favoritePlaceIds: allFavs,
          visitedPlaceIds: visited,
        };
      }
    } else {
      // Local SQLite execution
      const dbUser = dbFindUserById(session.userId);
      if (dbUser) {
        let visited: string[] = [];
        try {
          const { getLocalDb } = require('@/lib/db/localDb');
          const localDb = getLocalDb();
          const rows = localDb.prepare('SELECT place_id FROM visits WHERE user_id = ?').all(session.userId);
          visited = rows.map((r: any) => r.place_id);
        } catch (e) {}

        return {
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: dbUser.role,
            user_type: dbUser.user_type,
            institution: dbUser.institution,
            governorate: dbUser.governorate,
            points_balance: dbUser.points_balance || 0,
          },
          favoritePlaceIds: localFavorites,
          visitedPlaceIds: visited,
        };
      }
    }
  } catch (err) {
    console.warn('Error fetching user context for assistant:', err);
  }

  return { user: null, favoritePlaceIds: localFavorites, visitedPlaceIds: [] };
}

/**
 * بناء النص التوجيهي الخاص ببيانات المستخدم للذكاء الاصطناعي
 */
function buildUserPromptContext(userData: UserContextData, places: LivePlace[]): string {
  const { user, favoritePlaceIds, visitedPlaceIds } = userData;

  if (!user) {
    let ctx = '\n\n[بيانات المستخدم: المستخدم الحالي يتصفح كزائر ضيف غير مسجل الدخول.]';
    if (favoritePlaceIds.length > 0) {
      const favNames = places.filter((p) => favoritePlaceIds.includes(p.id)).map((p) => p.n);
      ctx += `\n- الأماكن المفضلة في متصفحه: ${favNames.slice(0, 5).join('، ')}.`;
    }
    return ctx;
  }

  const firstName = user.name.split(' ')[0] || user.name;
  const userTypeArabic =
    user.user_type === 'student' ? 'طالب جامعي' : user.user_type === 'visitor' ? 'سائح وزائر' : 'من أهالي بورسعيد';

  const favNames = places.filter((p) => favoritePlaceIds.includes(p.id)).map((p) => p.n);
  const visitedNames = places.filter((p) => visitedPlaceIds.includes(p.id)).map((p) => p.n);

  let ctx = `\n\n[بيانات الحساب الشخصي الحقيقي للمستخدم المتحدث معك - استخدمها لتخصيص الإجابة تماماً له. هذه البيانات تخصه وحده فقط، ولا تعرف أي شيء عن أي مستخدم آخر ولا تذكره أبداً]:\n`;
  ctx += `- اسم المستخدم: ${user.name} (خاطبه باسمه: «يا ${firstName}» بأسلوب دافئ وودود).\n`;
  ctx += `- صفته: ${userTypeArabic}.\n`;
  if (user.institution) {
    ctx += `- كليته / دراسته: ${user.institution} (عند سؤاله عن الدراسة أو الكافيهات، راعِ قربه من كليته وأسعار تناسب ميزانية الطلاب).\n`;
  }
  ctx += `- المحافظة: ${user.governorate || 'بورسعيد'}.\n`;
  ctx += `- رصيد نقاطه الحالي في التطبيق: ${user.points_balance} نقطة (إذا سأل عن نقاطه أو استبدالها اذكر رصيده الفعلي هذا واشرح له كيفية الاستبدال بكوبونات خصم 10-15%).\n`;
  if (favNames.length > 0) {
    ctx += `- الأماكن المفضلة لديه (المحفوظة بقلب ❤️): ${favNames.slice(0, 6).join('، ')}.\n`;
  }
  if (visitedNames.length > 0) {
    ctx += `- أماكن زارها بالفعل وسجل حضوره بها: ${visitedNames.slice(0, 6).join('، ')} (إذا طلب أماكن جديدة لم يزرها، رشح له أماكن أخرى لم يسبق له زيارتها بعد لكسب نقاط جديدة).\n`;
  }

  return ctx;
}

/**
 * محرك الفرز والتحليل الذكي الديناميكي (شامل لكافة الأماكن الـ 252 مع التخصيص الكامل للمستخدم)
 */
/**
 * محرك الفرز والتحليل الذكي — نسخة مختصرة تعتمد على الأماكن الحية فقط.
 * الردود قصيرة (سطران إلى أربعة أسطر) والتفاصيل عند الطلب فقط.
 */
function getDynamicReasoningReply(
  message: string,
  userLocation: { lat: number; lng: number } | null | undefined,
  userData: UserContextData,
  places: LivePlace[]
): { reply: string; thinkingProcess: string[]; suggestedPlaces: any[] } {
  const q = (message || '').toLowerCase().trim();
  const suggested: any[] = [];
  const thinkingProcess: string[] = [];

  const { user, favoritePlaceIds, visitedPlaceIds } = userData;
  const firstName = user ? user.name.split(' ')[0] : 'صديقنا';

  let userDistrict = 'بورسعيد';
  let hasLocation = false;
  if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
    if (isPointInPortSaid(userLocation.lat, userLocation.lng)) {
      userDistrict = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
      hasLocation = true;
    }
  }

  const placesWithDist = places.map((p) => {
    const dist = hasLocation
      ? calculateDistanceKm(userLocation!.lat, userLocation!.lng, p.lat, p.lon)
      : undefined;
    return { ...p, distanceKm: dist };
  }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

  const shortCard = (p: any, extra?: string) =>
    `• **${p.n}** (${p.a})${p.rating ? ` — ${p.rating}★` : ''}${extra ? ` — ${extra}` : ''}`;

  // 1. استفسارات رصيد النقاط واستبدالها
  const wantsPointsInfo =
    q.includes('نقاط') ||
    q.includes('نقط') ||
    q.includes('رصيد') ||
    q.includes('رصيدي') ||
    q.includes('بوينت') ||
    q.includes('استبدل') ||
    q.includes('استبدال') ||
    q.includes('كوبون');

  if (wantsPointsInfo) {
    const balance = user ? user.points_balance : 20;
    const couponPlaces = places.filter((p) => p.disc >= 10 && (p.cat === 'food' || p.cat === 'cafe')).slice(0, 3);
    couponPlaces.forEach((p) => suggested.push(p));
    const reply =
      `رصيدك الحالي: **${balance} نقطة** يا ${firstName}.\n` +
      `من 40 لـ 60 نقطة تستبدل كود خصم 10% لـ 15% عند الكاشير، وكل زيارة بتسجّلها بالـ GPS بتزود من 20 لـ 35 نقطة.` +
      (couponPlaces.length > 0
        ? `\nأماكن بخصومات دلوقتي:\n${couponPlaces.map((p) => shortCard(p, `خصم ${p.disc}%`)).join('\n')}`
        : '');
    return { reply, thinkingProcess, suggestedPlaces: suggested };
  }

  // 2. استفسارات أماكن لم يسبق زيارتها (أماكن جديدة)
  const wantsUnvisited =
    q.includes('ما زرت') ||
    q.includes('ما روحت') ||
    q.includes('مكان جديد') ||
    q.includes('اماكن جديدة') ||
    q.includes('اكتشف مكان') ||
    q.includes('مشوفتهاش');

  if (wantsUnvisited) {
    const unvisited = placesWithDist.filter((p) => !visitedPlaceIds.includes(p.id));
    const topNew = unvisited.slice(0, 3);
    topNew.forEach((p) => suggested.push(p));
    const reply =
      `أماكن جديدة عليك يا ${firstName}:\n` +
      topNew.map((p) => shortCard(p, `+${p.p || 20} نقطة عند الزيارة`)).join('\n');
    return { reply, thinkingProcess, suggestedPlaces: suggested };
  }

  // 3. استفسارات الطلاب والدراسة والمذاكرة
  const wantsStudy =
    q.includes('طالب') ||
    q.includes('جامع') ||
    q.includes('كلي') ||
    q.includes('مذاكر') ||
    q.includes('اذاكر') ||
    q.includes('دراس') ||
    q.includes('لابتوب') ||
    q.includes('هدوء');

  if (wantsStudy) {
    const studyPlaces = places.filter(
      (p) =>
        p.cat === 'cafe' ||
        p.cat === 'bus' ||
        p.n.includes('كافيه') ||
        p.n.includes('مكتبة') ||
        p.n.includes('معهد') ||
        p.a.includes('الجامعة') ||
        p.a.includes('بورفؤاد')
    ).slice(0, 3);
    studyPlaces.forEach((p) => suggested.push(p));
    const reply =
      `أهدى أماكن للمذاكرة يا ${firstName}:\n` +
      studyPlaces.map((p) => shortCard(p)).join('\n');
    return { reply, thinkingProcess, suggestedPlaces: suggested };
  }

  // 4. استفسارات الموقع الجغرافي للمستخدم نفسه ("قريب مني"، "جنبي"، "حوالي")
  const isNearLandmark = q.includes('قريب من ') || q.includes('قريبة من ') || q.includes('اقرب ل') || q.includes('أقرب ل');
  const isUserLocationQuery =
    !isNearLandmark &&
    (q.includes('قريب مني') ||
      q.includes('اقرب مني') ||
      q.includes('أقرب مني') ||
      q.includes('قريبة مني') ||
      q.includes('جنبي') ||
      q.includes('حوالي') ||
      q.includes('موقعي الحالي') ||
      (q.includes('موقعي') && !q.includes('موقع ')));

  if (isUserLocationQuery) {
    if (hasLocation) {
      const top3 = placesWithDist.slice(0, 3);
      top3.forEach((p) => suggested.push(p));
      const reply =
        `أقرب 3 أماكن ليك في **${userDistrict}** يا ${firstName}:\n` +
        top3.map((p) => shortCard(p, `${p.distanceKm} كم`)).join('\n');
      return { reply, thinkingProcess, suggestedPlaces: suggested };
    }
    return {
      reply:
        `عشان أحسب لك أقرب الأماكن بالكيلومتر، فعّل الـ GPS من أيقونة «📍 تحديد موقعي» جنب حقل الكتابة.`,
      thinkingProcess,
      suggestedPlaces: [],
    };
  }

  // 5. البحث الدلالي في الأماكن الحية بناءً على كلمات السؤال
  const wantsWaterfront = q.includes('بحر') || q.includes('البحر') || q.includes('شاطئ') || q.includes('قناة') || q.includes('ممشى');
  const wantsCafe = q.includes('كافيه') || q.includes('قهوة') || q.includes('كوفي') || q.includes('مشروب');
  const wantsFood = q.includes('مطعم') || q.includes('سمك') || q.includes('اكل') || q.includes('غدا') || q.includes('سي فود');
  const wantsPortFouad = q.includes('بورفؤاد') || q.includes('بور فؤاد') || q.includes('المعدية') || q.includes('المعديات');

  const matchedPlaces = placesWithDist.filter((p) => {
    const name = p.n.toLowerCase();
    const desc = (p.ds || '').toLowerCase();
    const cat = p.cat.toLowerCase();
    const area = p.a.toLowerCase();

    if (wantsPortFouad && !area.includes('بورفؤاد') && !name.includes('بورفؤاد')) {
      return false;
    }

    if (wantsCafe && (p.cat === 'cafe' || p.n.includes('كافيه') || p.n.includes('كاستن'))) {
      if (!wantsWaterfront || desc.includes('قناة') || desc.includes('ممشى') || desc.includes('بحر') || area.includes('طرح البحر') || name.includes('كاستن') || name.includes('شاطئ')) {
        return true;
      }
    }

    if (wantsFood && (p.cat === 'food' || p.cat === 'shop')) {
      if (!wantsWaterfront || desc.includes('قناة') || desc.includes('ممشى') || desc.includes('بحر') || name.includes('كاستن')) {
        return true;
      }
    }

    if (wantsWaterfront && (name.includes('ديليسبس') || name.includes('شاطئ') || name.includes('بحر') || name.includes('كاستن') || area.includes('طرح البحر') || desc.includes('قناة') || desc.includes('ممشى'))) {
      if (!wantsCafe && !wantsFood) return true;
    }

    return (
      q.includes(name) ||
      name.split(' ').some((word) => word.length > 2 && q.includes(word)) ||
      desc.split(' ').some((word) => word.length > 3 && q.includes(word)) ||
      q.includes(cat) ||
      q.includes(area)
    );
  }).sort((a, b) => {
    if (wantsWaterfront && wantsCafe) {
      const aPrio = a.n.includes('كاستن') || a.a.includes('طرح البحر') ? -1 : 1;
      const bPrio = b.n.includes('كاستن') || b.a.includes('طرح البحر') ? -1 : 1;
      return aPrio - bPrio;
    }
    return 0;
  });

  if (matchedPlaces.length > 0) {
    const selected = matchedPlaces.slice(0, 3);
    selected.forEach((p) => suggested.push(p));
    const reply =
      `دي أنسب اختيارات لطلبك يا ${firstName}:\n` +
      selected.map((p) => shortCard(p)).join('\n') +
      `\nعايز تفاصيل أكتر عن واحد فيهم؟ قولي اسمه.`;
    return { reply, thinkingProcess, suggestedPlaces: suggested };
  }

  // 6. استفسارات عامة أو استكشافية
  const topGeneral = placesWithDist.slice(0, 3);
  topGeneral.forEach((p) => suggested.push(p));
  const reply =
    `أهلاً يا ${firstName}! جرّب:\n` +
    topGeneral.map((p) => shortCard(p)).join('\n') +
    `\nممكن تطلب مني: خروجة يوم كامل، كافيهات هادية للمذاكرة، أو رصيد نقاطك.`;
  return { reply, thinkingProcess, suggestedPlaces: suggested };
}

/**
 * استخراج الأماكن المقترحة المذكورة في نص رد الذكاء الاصطناعي — من الأماكن الحية فقط.
 */
function extractMentionedPlaces(
  text: string,
  places: LivePlace[],
  userLocation?: { lat: number; lng: number } | null
): any[] {
  const t = (text || '').toLowerCase();
  const matched: any[] = [];
  const seenIds = new Set<string>();

  for (const place of places) {
    const nameLower = place.n.toLowerCase().trim();
    if (!nameLower) continue;
    // الاسم الكامل، أو كلمة مميزة طويلة من الاسم (للحالات اللي يذكر فيها جزء من الاسم)
    const distinctive = nameLower
      .split(/[\s\-—()]+/)
      .filter((w) => w.length >= 5);
    const isMentioned =
      t.includes(nameLower) || distinctive.some((w) => t.includes(w));

    if (isMentioned && !seenIds.has(place.id)) {
      seenIds.add(place.id);
      let distanceKm: number | undefined;
      if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, place.lat, place.lon);
      }
      matched.push({
        id: place.id,
        n: place.n,
        cat: place.cat,
        a: place.a,
        lat: place.lat,
        lon: place.lon,
        disc: place.disc,
        distanceKm,
      });
      if (matched.length >= 5) break;
    }
  }

  return matched;
}

export type MapAction =
  | { kind: 'focusPlace'; placeId: string }
  | { kind: 'showPlaces'; placeIds: string[] }
  | { kind: 'showCategory'; cat: string }
  | { kind: 'planRoute'; from: string; to: string };

const CATEGORY_WORDS: Array<[string, string[]]> = [
  ['food', ['مطعم', 'مطاعم', 'اكل', 'سمك', 'سي فود', 'غدا', 'عشا']],
  ['cafe', ['كافيه', 'كافيهات', 'قهوة', 'كوفي', 'مشروب']],
  ['fun', ['معالم', 'معلم', 'سياح', 'ترفيه', 'متحف', 'شاطئ', 'ممشى']],
  ['sweets', ['حلويات', 'حلواني', 'تحلية']],
  ['shop', ['تسوق', 'محلات', 'سوق', 'ملابس', 'هدوم']],
  ['housing', ['سكن', 'سكني']],
  ['sport', ['رياضة', 'جيم', 'ملعب', 'سباحة']],
  ['hotels', ['فندق', 'فنادق', 'اوتيل']],
];

/**
 * تحديد إجراء الخريطة/المواصلات من سؤال المستخدم والأماكن المقترحة.
 * يعمل على مسار الـ LLM ومسار المحرك المحلي معاً.
 */
function detectMapAction(
  message: string,
  suggestedPlaces: any[],
  places: LivePlace[],
  transit: TransitKnowledge
): MapAction | null {
  const q = (message || '').toLowerCase().trim();
  if (!q) return null;

  // --- نية مواصلات: "ازاي أروح ..." — أولوية على الخريطة
  const wantsRoute =
    q.includes('مواصلات') ||
    q.includes('ازاي اروح') ||
    q.includes('ازاي أروح') ||
    q.includes('اركب') ||
    q.includes('أركب') ||
    q.includes('اوصل') ||
    q.includes('أوصل') ||
    q.includes('خط ') ||
    q.includes('الطريق');
  if (wantsRoute) {
    // وجهة مذكورة بالاسم: مكان حي أو محطة مواصلات
    const namedPlace = places.find((p) => p.n && q.includes(p.n.toLowerCase()));
    const namedStop = transit.stopNames.find((n) => n && q.includes(n.toLowerCase()));
    let toStop: string | null = null;
    if (namedPlace) {
      const normArea = namedPlace.a.replace(/^\s*حي\s+/, '').trim();
      toStop = AREA_STOP[normArea] || namedPlace.a || null;
    } else if (namedStop) {
      toStop = namedStop;
    }
    if (toStop) {
      // نقطة البداية: محطة مذكورة في السؤال، وإلا السكن الجامعي (المعدية)
      const fromStop = transit.stopNames.find((n) => n !== toStop && q.includes(n.toLowerCase())) || HOME_STOP;
      return { kind: 'planRoute', from: fromStop, to: toStop };
    }
  }

  // --- نية خريطة
  const wantsMap =
    q.includes('خريطة') ||
    q.includes('وريني') ||
    q.includes('اعرض') ||
    q.includes('فين') ||
    q.includes('مكانها') ||
    q.includes('موقعه');
  if (!wantsMap) return null;

  const namedPlace = places.find((p) => p.n && q.includes(p.n.toLowerCase()));
  if (namedPlace) return { kind: 'focusPlace', placeId: namedPlace.id };

  for (const [cat, words] of CATEGORY_WORDS) {
    if (words.some((w) => q.includes(w))) return { kind: 'showCategory', cat };
  }

  if (suggestedPlaces.length === 1) {
    return { kind: 'focusPlace', placeId: suggestedPlaces[0].id };
  }
  if (suggestedPlaces.length > 1) {
    return { kind: 'showPlaces', placeIds: suggestedPlaces.map((p) => p.id) };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { message, history, userLocation, localFavorites = [] } = await req.json();

    // 0. البيانات الحية أولاً — الأماكن والمواصلات من قاعدة البيانات فقط.
    // عند تعذّر جلب الأماكن الحية، لا نجيب من أي بيانات قديمة.
    const livePlaces = await fetchLivePlaces();
    if (!livePlaces) {
      return NextResponse.json({
        ok: true,
        ai_enabled: true,
        provider: 'portsaid_engine',
        reply: 'البيانات الحية مش متاحة دلوقتي، جرّب تاني كمان شوية.',
        suggestedPlaces: [],
        mapAction: null,
        userDistrict: null,
      });
    }
    const transit = await fetchTransitKnowledge();

    // جلب سياق وبيانات المستخدم الحالي — بياناته هو فقط، ولا بيانات أي مستخدم آخر.
    const userData = await getUserContext(localFavorites);
    const userPromptContext = buildUserPromptContext(userData, livePlaces);

    const placesText = livePlaces
      .map(
        (p) =>
          `- [${p.id}] ${p.n} (${p.a}) | تصنيف: ${p.cat} | إحداثيات: lat=${p.lat}, lon=${p.lon} | خصم: ${p.disc}% | نقاط زيارة: ${p.p}${p.rating != null ? ` | تقييم جوجل: ${p.rating} (${p.reviewsCount || 0} تقييم)` : ''} | تفاصيل: ${p.ds}`
      )
      .join('\n');
    const systemPrompt = buildSystemPrompt(placesText, transit.text);

    let userDistrict: string | null = null;
    let locationContext = '';

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const inside = isPointInPortSaid(userLocation.lat, userLocation.lng);
      if (inside) {
        userDistrict = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
        locationContext = `\n[موقع المستخدم الحالي: Latitude=${userLocation.lat}, Longitude=${userLocation.lng} داخل نطاق "${userDistrict}" في بورسعيد. عند الاقتراح اذكر الأماكن القريبة منه مع حساب المسافة التقريبية].`;
      }
    }

    const headerKey = req.headers.get('x-openrouter-key');
    const headerModel = req.headers.get('x-openrouter-model');
    const openRouterKey =
      headerKey && headerKey.trim().length > 5
        ? headerKey.trim()
        : (process.env.OPENROUTER_API_KEY || '').trim();
    const openRouterModel =
      (headerModel && headerModel.trim()) || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-nano';

    // 1. تشغيل موديل OpenRouter الحقيقي عند توفر المفتاح
    if (openRouterKey && openRouterKey.length > 5) {
      try {
        const messages: any[] = [
          { role: 'system', content: systemPrompt + locationContext + userPromptContext },
        ];

        if (Array.isArray(history)) {
          for (const turn of history.slice(-6)) {
            if (turn.text && turn.role) {
              messages.push({
                role: turn.role === 'me' ? 'user' : 'assistant',
                content: turn.text,
              });
            }
          }
        }

        messages.push({ role: 'user', content: message });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': siteUrl,
            'X-Title': 'Port Said Hub Assistant',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages,
            max_tokens: 450,
            temperature: 0.7,
          }),
        });

        if (!openRouterRes.ok) {
          const errData = await openRouterRes.json().catch(() => null);
          const statusCode = openRouterRes.status;
          console.warn('OpenRouter API returned error, gracefully falling back to local reasoning:', statusCode, errData);

          const fallbackResult = getDynamicReasoningReply(message, userLocation, userData, livePlaces);
          return NextResponse.json({
            ok: true,
            ai_enabled: true,
            provider: 'portsaid_engine',
            reply: fallbackResult.reply,
            suggestedPlaces: fallbackResult.suggestedPlaces,
            mapAction: detectMapAction(message, fallbackResult.suggestedPlaces, livePlaces, transit),
            userDistrict,
          });
        }

        const data = await openRouterRes.json();
        const rawReply = data.choices?.[0]?.message?.content;
        if (rawReply && typeof rawReply === 'string' && rawReply.trim()) {
          // تنظيف الرد وإزالة أي وسوم تفكير داخلية نهائياً
          const cleanReply = rawReply
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
            .trim();
          const suggestedPlaces = extractMentionedPlaces(cleanReply, livePlaces, userLocation);
          return NextResponse.json({
            ok: true,
            ai_enabled: true,
            provider: 'ai',
            reply: cleanReply,
            suggestedPlaces,
            mapAction: detectMapAction(message, suggestedPlaces, livePlaces, transit),
            userDistrict,
          });
        }
      } catch (openRouterErr: any) {
        console.warn('OpenRouter network request failed, falling back to local engine:', openRouterErr);
        const fallbackResult = getDynamicReasoningReply(message, userLocation, userData, livePlaces);
        return NextResponse.json({
          ok: true,
          ai_enabled: true,
          provider: 'portsaid_engine',
          reply: fallbackResult.reply,
          suggestedPlaces: fallbackResult.suggestedPlaces,
          mapAction: detectMapAction(message, fallbackResult.suggestedPlaces, livePlaces, transit),
          userDistrict,
        });
      }
    }

    // 2. تشغيل المحرك الذكي
    const reasoningResult = getDynamicReasoningReply(message, userLocation, userData, livePlaces);

    return NextResponse.json({
      ok: true,
      ai_enabled: true,
      provider: 'portsaid_engine',
      reply: reasoningResult.reply,
      suggestedPlaces: reasoningResult.suggestedPlaces,
      mapAction: detectMapAction(message, reasoningResult.suggestedPlaces, livePlaces, transit),
      userDistrict,
    });
  } catch (err: any) {
    console.error('Error in assistant API:', err);
    return NextResponse.json(
      { ok: false, error: 'حدث خطأ أثناء معالجة المحادثة.' },
      { status: 500 }
    );
  }
}
