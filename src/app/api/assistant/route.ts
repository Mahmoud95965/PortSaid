import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm, identifyPortSaidDistrict } from '@/lib/geoUtils';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dbFindUserById } from '@/lib/db/localDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// بناء قاعدة بيانات الأماكن الحقيقية للإرشاد بالخريطة
const PLACES_KNOWLEDGE = INITIAL_PLACES.map((p) => {
  return `- [${p.id}] ${p.n} (${p.a}) | تصنيف: ${p.cat} | إحداثيات: lat=${p.lat}, lon=${p.lon} | خصم: ${p.disc}% | نقاط زيارة: ${p.p} | تفاصيل: ${p.ds}`;
}).join('\n');

const SYSTEM_PROMPT = `
أنت "مساعد بورسعيد الذكي ومخطط الرحلات"، مرشد سياحي ومعرفي خبير ومحترف متخصص في محافظة بورسعيد داخل منصة Port Said Hub.
تحدث بأسلوب دافئ وممتع ومرتب، وباللغة العربية (مع لمسة مصرية بورسعيدية راقية وودودة).

قواعد هيكلة الإجابة وتنظيمها:
1. اكتب ردوداً وافية، غنية بالمعلومات والتفاصيل المفيدة، ومرتبة تنظيمياً عبر عناوين واضحة (Markdown) ونقاط منسقة. تجنب الردود القصيرة أو المقتضبة.
2. لكل مكان أو معلم ترشحه، اذكر:
   - اسمه الدقيق والحي الموجود به في بورسعيد أو بورفؤاد.
   - ما يميزه وتجربة الزيارة وأفضل ما يمكن تجربته (أطباق أسماك، قعدة على القناة، تصوير، مذاكرة، تحلية).
   - التكلفة التقديرية للفرد ومستوى الأسعار.
   - أفضل وقت للزيارة في اليوم.
   - نسبة الخصم ونقاط الزيارة المتاحة في Port Said Hub.
3. اختم ردك دائماً بقسم "💡 نصائح بورسعيدية من القلب" وقسم "🚌 كيفية الوصول والمواصلات" لتقديم قيمة حقيقية للزائر.
4. التزم حصرياً بالأماكن والمعالم الحقيقية في بورسعيد المذكورة في قاعدة البيانات بالأسفل، واذكر الاسم الدقيق لتظهر الخريطة التفاعلية فوراً للمستخدم.
5. لا تكتب أي وسوم تفكير داخل الرد نهائياً (ممنوع وسوم <think> أو تفكير داخلي).
6. راعِ هوية المستخدم المتحدث معك بدقة (اسمه، كليته، رصيد نقاطه، وأماكنه المفضلة أو التي زارها).
7. منصة Port Said Hub تم تصميمها وتطويرها من قبل TOLZY Team. إذا سألك المستخدم من صمم أو بنى الموقع، أجب باعتزاز أنه تم تصميمه وتطويره بواسطة فريق TOLZY Team.

قاعدة بيانات الأماكن المعتمدة في بورسعيد:
${PLACES_KNOWLEDGE}
`;

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
function buildUserPromptContext(userData: UserContextData): string {
  const { user, favoritePlaceIds, visitedPlaceIds } = userData;

  if (!user) {
    let ctx = '\n\n[بيانات المستخدم: المستخدم الحالي يتصفح كزائر ضيف غير مسجل الدخول.]';
    if (favoritePlaceIds.length > 0) {
      const favNames = INITIAL_PLACES.filter((p) => favoritePlaceIds.includes(p.id)).map((p) => p.n);
      ctx += `\n- الأماكن المفضلة في متصفحه: ${favNames.slice(0, 5).join('، ')}.`;
    }
    return ctx;
  }

  const firstName = user.name.split(' ')[0] || user.name;
  const userTypeArabic =
    user.user_type === 'student' ? 'طالب جامعي' : user.user_type === 'visitor' ? 'سائح وزائر' : 'من أهالي بورسعيد';

  const favNames = INITIAL_PLACES.filter((p) => favoritePlaceIds.includes(p.id)).map((p) => p.n);
  const visitedNames = INITIAL_PLACES.filter((p) => visitedPlaceIds.includes(p.id)).map((p) => p.n);

  let ctx = `\n\n[بيانات الحساب الشخصي الحقيقي للمستخدم المتحدث معك - استخدمها لتخصيص الإجابة تماماً له]:\n`;
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
function getDynamicReasoningReply(
  message: string,
  userLocation: { lat: number; lng: number } | null | undefined,
  userData: UserContextData
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

  // فرز وحساب مسافات جميع الأماكن الـ 252
  const placesWithDist = INITIAL_PLACES.map((p) => {
    const dist = hasLocation
      ? calculateDistanceKm(userLocation!.lat, userLocation!.lng, p.lat, p.lon)
      : undefined;
    return { ...p, distanceKm: dist };
  }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

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
    thinkingProcess.push(`🎯 استفسار عن رصيد النقاط والمكافآت للمستخدم ${firstName}.`);
    const balance = user ? user.points_balance : 20;

    // ترشيح أماكن ذات خصومات وكوبونات ممتازة
    const couponPlaces = INITIAL_PLACES.filter((p) => p.disc >= 10 && (p.cat === 'food' || p.cat === 'cafe')).slice(0, 3);
    couponPlaces.forEach((p) => suggested.push(p));

    const reply =
      `### 🌟 أهلاً بك يا ${firstName} في نظام مكافآت Port Said Hub!\n\n` +
      `• **رصيد نقاطك الحالي:** **${balance} نقطة** ${balance >= 40 ? '🎉 (جاهز للاستبدال فورا!)' : '✨'}\n\n` +
      `### 🎁 كيف تستفيد من نقاطك الآن؟\n` +
      `1. **استبدال كوبونات خصم:** من 40 إلى 60 نقطة تمنحك كود خصم حصري من **10% إلى 15%** يظهر فوراً كـ QR Code عند الكاشير.\n` +
      `2. **زيادة رصيدك:** كل مكان تزوره في بورسعيد أو بورفؤاد وتضغط «سجّل حضورك الآن» بالـ GPS يمنحك من **+20 إلى +35 نقطة إضافية** فوراً!\n\n` +
      `### 🍽️ أفضل أماكن يمكنك الاستفادة من خصوماتها بنقاطك حالياً:\n\n` +
      couponPlaces
        .map(
          (p, idx) =>
            `#### ${idx + 1}. **${p.n}** (${p.a})\n` +
            `• **الخصم المتاح:** **${p.disc}% خصم** (تكلفة الكوبون: ${p.cost} نقطة)\n` +
            `• **عن المكان:** ${p.ds}\n` +
            `• **نقاط الحضور:** تكسب +${p.p} نقطة عند زيارته!`
        )
        .join('\n\n') +
      `\n\n---\n\n` +
      `### 💡 نصيحة بورسعيدية من القلب\n` +
      `اجمع نقاطك من جولات المشي في الممشى السياحي والحدائق والمعالم المجانية، واستبدلها وقت وجبة الغداء أو السهرة في أفخم مطاعم وكافيهات بورسعيد! ☕🐟`;

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
    thinkingProcess.push(`🔍 البحث عن أماكن جديدة لم يسبق للمستخدم زيارتها.`);
    const unvisited = placesWithDist.filter((p) => !visitedPlaceIds.includes(p.id));
    const topNew = unvisited.slice(0, 3);
    topNew.forEach((p) => suggested.push(p));

    const reply =
      `### 🧭 وجهات جديدة تنتظرك يا ${firstName} في بورسعيد!\n\n` +
      `اخترت لك أفضل الأماكن المميزة التي لم يسبق لك تسجيل الحضور بها بعد:\n\n` +
      topNew
        .map(
          (p, idx) =>
            `#### ${idx + 1}. **${p.n}** (${p.a})\n` +
            `• **التفاصيل:** ${p.ds}\n` +
            `• **المكافأة:** تكسب **+${p.p || 20} نقطة** فور وصولك وتسجيل حضورك!\n` +
            `• **التكلفة التقديرية:** ${p.cost > 0 ? `${p.cost} ج.م` : 'مجاني تماماً'}`
        )
        .join('\n\n') +
      `\n\n---\n\n` +
      `### 💡 نصائح لتجربة بورسعيدية مثالية\n` +
      `استمتع بالتقاط صور تذكارية عند وصولك وسجّل زيارتك في التطبيق عبر الـ GPS لتزيد رصيد نقاطك وتحصل على كوبونات مجانية.\n\n` +
      `### 🚌 التوصيل والمواصلات\n` +
      `الوصول لهذه الأماكن سهل جداً عبر تاكسي بورسعيد الداخلي أو مينى باص خط "الأمين" و"الزهور".`;

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
    thinkingProcess.push(`📚 ترشيحات مخصصة للطلاب وجلسات المذاكرة والدراسة.`);
    const studyPlaces = INITIAL_PLACES.filter(
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

    const instMention = user?.institution ? `كليتك (**${user.institution}**)` : 'كليات جامعة بورسعيد';

    const reply =
      `### 📚 مرحباً يا ${firstName}! إليك أفضل أماكن المذاكرة والقعدة الهادية:\n\n` +
      `بما يناسب احتياجاتك وقربك من ${instMention}، رتبت لك أماكن مريحة بإنترنت وجلسات هادئة:\n\n` +
      studyPlaces
        .map(
          (p, idx) =>
            `#### ${idx + 1}. **${p.n}** (${p.a})\n` +
            `• **المميزات للدراسة:** أجواء هادئة، جلسات مريحة، ومشروبات دافئة تساعد على التركيز.\n` +
            `• **الأسعار:** أسعار طلابية مناسبة مع خصم متاح عبر Port Said Hub.\n` +
            `• **الموقع:** ${p.a}`
        )
        .join('\n\n') +
      `\n\n---\n\n` +
      `### 💡 نصائح بورسعيدية للطلاب\n` +
      `• في فترات الامتحانات، احرص على اختيار أوقات الصباح والظهيرة للهدوء التام.\n` +
      `• خطوط مواصلات الطلبة المعتمدة: خط الأمين وخط الزهور يصلان مباشرة بين مجمعات الكليات في دقائق معدودة.`;

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
    thinkingProcess.push(`📍 البحث عن الأماكن الأقرب لموقع المستخدم في ${userDistrict}.`);
    if (hasLocation) {
      const top3 = placesWithDist.slice(0, 3);
      top3.forEach((p) => suggested.push(p));
      thinkingProcess.push(`⚖️ الأماكن الأقرب لموقعك الفعلي: ${top3.map((p) => `${p.n} (${p.distanceKm} كم)`).join('، ')}.`);

      const placesDetails = top3
        .map((p, idx) => {
          return (
            `#### ${idx + 1}. **${p.n}** (${p.a})\n` +
            `• **المسافة لموقعك:** يبعد عنك **${p.distanceKm} كم** تقريباً\n` +
            `• **التفاصيل:** ${p.ds}\n` +
            `• **المكافآت والخصومات:** ${p.disc > 0 ? `خصم حصري **${p.disc}%**` : 'نقاط زيارة'} (+${p.p || 20} نقطة في التطبيق)\n` +
            `• **التكلفة المتوقعة:** ${p.cost ? `حوالي ${p.cost} ج.م` : 'مجاني تماماً'}`
          );
        })
        .join('\n\n');

      return {
        reply:
          `### 📍 موقعك الحالي في **${userDistrict}** يا ${firstName}\n\n` +
          `قمت بمسح المنطقة الجغرافية المحيطة بك ورتّبت لك أقرب الوجهات المعتمدة مرتبة حسب المسافة الفعلية:\n\n` +
          placesDetails +
          `\n\n---\n\n` +
          `### 💡 نصيحة بورسعيدية من القلب\n` +
          `إذا كنت في ${userDistrict}، أفضل خيار للتحرك السريع هو التاكسي الداخلي (أجرته موحدة ومعقولة جداً) أو السير على الأقدام إذا كان الجو لطيفاً، فالأماكن قريبة وممتعة.\n\n` +
          `### 🗺️ الخريطة والمسار\n` +
          `تم تجهيز الخريطة المضمنة بالأسفل لك لعرض المسار والتتبع المباشر فوراً! 🧭`,
        thinkingProcess,
        suggestedPlaces: suggested,
      };
    } else {
      thinkingProcess.push(`⚠️ الـ GPS غير مفعل: تشجيع المستخدم على مشاركة موقعه لحساب الكيلومترات.`);
      return {
        reply:
          `### 📍 تحديد الأماكن القريبة لموقعك يا ${firstName}\n\n` +
          `عشان أقدر أحسب لك المسافات بالكيلومتر بدقة وأرتب لك أقرب الأماكن والمطاعم لك:\n\n` +
          `1. اضغط على أيقونة **«📍 تحديد موقعي»** بجانب حقل الكتابة لتفعيل الـ GPS.\n` +
          `2. بمجرد تفعيله، سأحدد حيك فوراً في بورسعيد (حي الشرق، حي العرب، بورفؤاد...) وأعرض لك أقرب المعالم وأسهل مسارات السير على الخريطة مباشرة!`,
        thinkingProcess,
        suggestedPlaces: [],
      };
    }
  }

  // 5. البحث الدلالي في قاعدة الأماكن الـ 252 بناءً على كلمات السؤال
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
    const selected = matchedPlaces.slice(0, 4);
    selected.forEach((p) => suggested.push(p));
    thinkingProcess.push(`🔎 مطابقة دلالية: تم العثور على ${matchedPlaces.length} أماكن متوافقة مع طلبك.`);

    const placesCards = selected
      .map((p, i) => {
        const bestTime =
          p.cat === 'cafe'
            ? 'وقت الغروب ومساءً'
            : p.cat === 'food'
            ? 'فترة الغداء والعشاء'
            : 'صباحاً وعصراً';
        return (
          `#### ${i + 1}. **${p.n}** (${p.a})\n` +
          `• **عن المكان:** ${p.ds}\n` +
          `• **التصنيف والتجربة:** ${p.cat === 'food' ? 'مأكولات شهية وتجربة طعام أصيلة 🍽️' : p.cat === 'cafe' ? 'إطلالة وقعدة بحرية رايقة ☕' : 'معلم سياحي وتاريخي 🏛️'}\n` +
          `• **أفضل وقت للزيارة:** ${bestTime}\n` +
          `• **عروض وتخفيضات:** ${p.disc > 0 ? `خصم حصري **${p.disc}%** عبر Port Said Hub` : `كسب +${p.p || 20} نقطة حضور بالـ GPS`}`
        );
      })
      .join('\n\n');

    return {
      reply:
        `### 🌊 ترشيحات مميزة لطلبك يا ${firstName}:\n\n` +
        `جمعت لك أفضل الخيارات المتوافقة مع رغبتك بالتفاصيل والأسعار:\n\n` +
        placesCards +
        `\n\n---\n\n` +
        `### 💡 نصائح بورسعيدية حصرية\n` +
        `• **للقعدات البحرية:** أفضل توقيت هو وقت الغروب لمشاهدة مرور السفن العملاقة في المجرى الملاحي لقناة السويس في منظر ساحر.\n` +
        `• **التحلية:** لا تفوت تجربة كاساتا سامي سالم أو حلواني لورد الشهيرة بعد وجبة الغداء أو الكافيه.\n\n` +
        `### 🚌 التوصيل والمواصلات\n` +
        `جميع هذه الأماكن في نطاق حي الشرق وحي العرب وبورفؤاد، ويمكنك ركوب تاكسي داخلي أو ميكروباص خط "الأمين" و"الـ 5000" للوصول بسهولة.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 6. استفسارات عامة أو استكشافية
  const topGeneral = placesWithDist.slice(0, 3);
  topGeneral.forEach((p) => suggested.push(p));
  thinkingProcess.push(`💡 سؤال عام: تقديم خيارات استكشافية لمعالم ومطاعم بورسعيد.`);

  const generalCards = topGeneral
    .map((p, i) => {
      return (
        `#### ${i + 1}. **${p.n}** (${p.a})\n` +
        `• **التفاصيل:** ${p.ds}\n` +
        `• **المكافأة:** +${p.p || 20} نقطة عند تسجيل الحضور`
      );
    })
    .join('\n\n');

  return {
    reply:
      `### 🌟 أهلاً بك يا ${firstName} في مرشد بورسعيد الذكي!\n\n` +
      `إليك أهم الأماكن والمعالم التي ننصح بزيارتها في بورسعيد حالياً:\n\n` +
      generalCards +
      `\n\n---\n\n` +
      `### 🧭 كيف يمكنني مساعدتك أكثر؟\n` +
      `• يمكنك أن تطلب: *"خطط لي خروجة يوم كامل بميزانية 300 جنيه"*.\n` +
      `• أو: *"عايز كافيهات هادية قريبة من البحر للمذاكرة"*.\n` +
      `• أو: *"ما هو رصيد نقاطي وإزاي أستفيد منه؟"*.\n` +
      `• أو اضغط على **«📍 موقعي»** لأحدد لك أقرب الأماكن لموقعك الحالي بالكيلومتر!`,
    thinkingProcess,
    suggestedPlaces: suggested,
  };
}

/**
 * استخراج الأماكن المقترحة المذكورة في نص رد الذكاء الاصطناعي
 */
function extractMentionedPlaces(
  text: string,
  userLocation?: { lat: number; lng: number } | null
): any[] {
  const t = (text || '').toLowerCase();
  const matched: any[] = [];
  const seenIds = new Set<string>();

  for (const place of INITIAL_PLACES) {
    const nameLower = place.n.toLowerCase();
    const isMentioned =
      t.includes(nameLower) ||
      (nameLower.includes('كاستن') && t.includes('كاستن')) ||
      (nameLower.includes('الجندي') && t.includes('الجندي')) ||
      (nameLower.includes('سوق السمك') && t.includes('سوق السمك')) ||
      (nameLower.includes('ابن حميدو') && t.includes('ابن حميدو')) ||
      (nameLower.includes('المنارة') && t.includes('المنارة')) ||
      (nameLower.includes('ديليسبس') && t.includes('ديليسبس')) ||
      (nameLower.includes('سامي سالم') && t.includes('سامي سالم')) ||
      (nameLower.includes('لورد') && t.includes('لورد')) ||
      (nameLower.includes('متحف النصر') && t.includes('متحف النصر')) ||
      (nameLower.includes('مسجد السلام') && t.includes('مسجد السلام'));

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

export async function POST(req: Request) {
  try {
    const { message, history, userLocation, localFavorites = [] } = await req.json();

    // جلب سياق وبيانات المستخدم الحالي
    const userData = await getUserContext(localFavorites);
    const userPromptContext = buildUserPromptContext(userData);

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
          { role: 'system', content: SYSTEM_PROMPT + locationContext + userPromptContext },
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
            max_tokens: 1200,
            temperature: 0.7,
          }),
        });

        if (!openRouterRes.ok) {
          const errData = await openRouterRes.json().catch(() => null);
          const statusCode = openRouterRes.status;
          console.warn('OpenRouter API returned error, gracefully falling back to local reasoning:', statusCode, errData);

          const fallbackResult = getDynamicReasoningReply(message, userLocation, userData);
          return NextResponse.json({
            ok: true,
            ai_enabled: true,
            provider: 'portsaid_engine',
            reply: fallbackResult.reply,
            suggestedPlaces: fallbackResult.suggestedPlaces,
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
          const suggestedPlaces = extractMentionedPlaces(cleanReply, userLocation);
          return NextResponse.json({
            ok: true,
            ai_enabled: true,
            provider: 'ai',
            reply: cleanReply,
            suggestedPlaces,
            userDistrict,
          });
        }
      } catch (openRouterErr: any) {
        console.warn('OpenRouter network request failed, falling back to local engine:', openRouterErr);
        const fallbackResult = getDynamicReasoningReply(message, userLocation, userData);
        return NextResponse.json({
          ok: true,
          ai_enabled: true,
          provider: 'portsaid_engine',
          reply: fallbackResult.reply,
          suggestedPlaces: fallbackResult.suggestedPlaces,
          userDistrict,
        });
      }
    }

    // 2. تشغيل المحرك الذكي
    const reasoningResult = getDynamicReasoningReply(message, userLocation, userData);

    return NextResponse.json({
      ok: true,
      ai_enabled: true,
      provider: 'portsaid_engine',
      reply: reasoningResult.reply,
      suggestedPlaces: reasoningResult.suggestedPlaces,
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
