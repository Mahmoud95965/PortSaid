import { NextResponse } from 'next/server';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm, identifyPortSaidDistrict } from '@/lib/geoUtils';

export const runtime = 'nodejs';

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
   - اسمه الدقيق والحي الموجود به.
   - ما يميزه وتجربة الزيارة وأفضل ما يمكن تجربته (أطباق أسماك، قعدة على القناة، تصوير).
   - التكلفة التقديرية للفرد ومستوى الأسعار.
   - أفضل وقت للزيارة في اليوم.
   - نسبة الخصم ونقاط الزيارة المتاحة في Port Said Hub.
3. اختم ردك دائماً بقسم "💡 نصائح بورسعيدية من القلب" وقسم "🚌 كيفية الوصول والمواصلات" لتقديم قيمة حقيقية للزائر.
4. التزم حصرياً بالأماكن والمعالم الحقيقية في بورسعيد المذكورة في قاعدة البيانات بالأسفل، واذكر الاسم الدقيق لتظهر الخريطة التفاعلية فوراً للمستخدم.
5. لا تكتب أي وسوم تفكير داخل الرد.

قاعدة بيانات الأماكن المعتمدة في بورسعيد:
${PLACES_KNOWLEDGE}
`;

/**
 * محرك الفرز والتحليل الذكي الديناميكي (عند عدم توفر مفتاح سحابي)
 */
function getDynamicReasoningReply(
  message: string,
  userLocation?: { lat: number; lng: number } | null
): { reply: string; thinkingProcess: string[]; suggestedPlaces: any[] } {
  const q = (message || '').toLowerCase().trim();
  const suggested: any[] = [];
  const thinkingProcess: string[] = [];

  let userDistrict = 'بورسعيد';
  let hasLocation = false;
  if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
    if (isPointInPortSaid(userLocation.lat, userLocation.lng)) {
      userDistrict = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
      hasLocation = true;
    }
  }

  // فرز وحساب مسافات جميع الأماكن
  const placesWithDist = INITIAL_PLACES.map((p) => {
    const dist = hasLocation
      ? calculateDistanceKm(userLocation!.lat, userLocation!.lng, p.lat, p.lon)
      : undefined;
    return { ...p, distanceKm: dist };
  }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

  // البحث الدلالي في قاعدة الأماكن بناءً على كلمات السؤال الفعلية
  const wantsWaterfront = q.includes('بحر') || q.includes('البحر') || q.includes('شاطئ') || q.includes('قناة') || q.includes('ممشى');
  const wantsCafe = q.includes('كافيه') || q.includes('قهوة') || q.includes('كوفي') || q.includes('مشروب');
  const wantsFood = q.includes('مطعم') || q.includes('سمك') || q.includes('اكل') || q.includes('غدا') || q.includes('سي فود');

  const matchedPlaces = placesWithDist.filter((p) => {
    const name = p.n.toLowerCase();
    const desc = p.ds.toLowerCase();
    const cat = p.cat.toLowerCase();
    const area = p.a.toLowerCase();

    // مطابقة التفضيلات المحددة
    if (wantsCafe && p.cat === 'cafe') {
      if (!wantsWaterfront || desc.includes('قناة') || desc.includes('ممشى') || desc.includes('بحر') || name.includes('بينوس')) {
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
  });

  thinkingProcess.push(`🎯 تحليل السؤال: "${message}" واستخراج الكلمات المفتاحية والتفضيلات.`);

  // 1. استفسارات الموقع الجغرافي للمستخدم نفسه ("قريب مني"، "جنبي"، "حوالي")
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

      const placesDetails = top3.map((p, idx) => {
        return `#### ${idx + 1}. **${p.n}** (${p.a})\n` +
          `• **المسافة لموقعك:** يبعد عنك **${p.distanceKm} كم** تقريباً\n` +
          `• **التفاصيل:** ${p.ds}\n` +
          `• **المكافآت والخصومات:** ${p.disc > 0 ? `خصم حصري **${p.disc}%**` : 'نقاط زيارة'} (+${p.p || 20} نقطة في التطبيق)\n` +
          `• **التكلفة المتوقعة:** ${p.cost ? `حوالي ${p.cost} ج.م` : 'مجاني تماماً'}`;
      }).join('\n\n');

      return {
        reply: `### 📍 موقعك الحالي في **${userDistrict}**\n\n` +
          `قمت بمسح المنطقة الجغرافية المحيطة بك ورتّبت لك أقرب الوجهات المعتمدة مرتبة حسب المسافة الفعلية:\n\n` +
          placesDetails +
          `\n\n---\n\n` +
          `### 💡 نصيحة بورسعيدية من القلب\n` +
          `إذا كنت في ${userDistrict}، أفضل خيار للتحرك السريع هو التاكسي الداخلي (أجرته ثابتة ومعقولة جداً) أو السير على الأقدام إذا كان الجو لطيفاً، فالأماكن قريبة جداً من بعضها.\n\n` +
          `### 🗺️ الخريطة والمسار\n` +
          `تم تجهيز الخريطة المضمنة بالأسفل لك لعرض المسار والتتبع المباشر فوراً! 🧭`,
        thinkingProcess,
        suggestedPlaces: suggested,
      };
    } else {
      thinkingProcess.push(`⚠️ الـ GPS غير مفعل: تشجيع المستخدم على مشاركة موقعه لحساب الكيلومترات.`);
      return {
        reply: `### 📍 تحديد الأماكن القريبة لموقعك\n\n` +
          `عشان أقدر أحسب لك المسافات بالكيلومتر بدقة وأرتب لك أقرب الأماكن والمطاعم لك:\n\n` +
          `1. اضغط على أيقونة **«📍 تحديد موقعي»** بجانب حقل الكتابة لتفعيل الـ GPS.\n` +
          `2. بمجرد تفعيله، سأحدد حيك فوراً في بورسعيد (حي الشرق، حي العرب، بورفؤاد...) وأعرض لك أقرب المعالم وأسهل مسارات السير على الخريطة مباشرة!`,
        thinkingProcess,
        suggestedPlaces: [],
      };
    }
  }

  // 2. إذا تم العثور على أماكن مطابقة دلالياً لكلمات السؤال
  if (matchedPlaces.length > 0) {
    const selected = matchedPlaces.slice(0, 4);
    selected.forEach((p) => suggested.push(p));
    thinkingProcess.push(`🔎 مطابقة دلالية: تم العثور على ${matchedPlaces.length} أماكن متوافقة مع كلمات السؤال.`);
    thinkingProcess.push(`✨ ترشيح أفضل الخيارات: ${selected.map((p) => p.n).join('، ')}.`);

    const placesCards = selected.map((p, i) => {
      const bestTime = p.cat === 'cafe' ? 'وقت الغروب ومساءً' : p.cat === 'food' ? 'فترة الغداء والعشاء' : 'صباحاً وعصراً';
      return `#### ${i + 1}. **${p.n}** (${p.a})\n` +
        `• **عن المكان:** ${p.ds}\n` +
        `• **التصنيف والتجربة:** ${p.cat === 'food' ? 'مأكولات بحرية وأسماك طازجة 🐟' : p.cat === 'cafe' ? 'إطلالة وقعدة بحرية رايقة ☕' : 'معلم سياحي وتاريخي 🏛️'}\n` +
        `• **أفضل وقت للزيارة:** ${bestTime}\n` +
        `• **عروض وتخفيضات:** ${p.disc > 0 ? `خصم حصري **${p.disc}%** عبر Port Said Hub` : `كسب +${p.p || 20} نقطة حضور بالـ GPS`}`;
    }).join('\n\n');

    return {
      reply: `### 🌊 دليل وترشيحات بورسعيد لطلبك:\n\n` +
        `جمعت لك أفضل الوجهات المتوافقة مع رغبتك في بورسعيد بالتفاصيل والأسعار:\n\n` +
        placesCards +
        `\n\n---\n\n` +
        `### 💡 نصائح بورسعيدية حصرية\n` +
        `• **للقعدات البحرية:** أفضل توقيت هو وقت الغروب، حيث تشاهد مرور السفن العملاقة في المجرى الملاحي لقناة السويس في منظر لا يتكرر.\n` +
        '• **بعد وجبة السمك أو الكافيه:** ننصحك دائماً بتجربة حلويات سامي سالم أو حلواني لورد أو المشي على ممشى ديليسبس التاريخي.\n\n' +
        `### 🚌 التوصيل والمواصلات\n` +
        `جميع هذه الأماكن في نطاق حي الشرق وحي العرب، ويمكنك ركوب مينى باص خط "الأمين" أو "الـ 5000" أو تاكسي داخلي للوصول بسهولة.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 3. استفسارات عامة أو استكشافية
  const topGeneral = placesWithDist.slice(0, 3);
  topGeneral.forEach((p) => suggested.push(p));
  thinkingProcess.push(`💡 سؤال عام: تقديم خيارات استكشافية لمعالم ومطاعم بورسعيد.`);

  const generalCards = topGeneral.map((p, i) => {
    return `#### ${i + 1}. **${p.n}** (${p.a})\n` +
      `• **التفاصيل:** ${p.ds}\n` +
      `• **المكافأة:** +${p.p || 20} نقطة عند تسجيل الحضور`;
  }).join('\n\n');

  return {
    reply: `### 🌟 أهلاً بك في مرشد بورسعيد الذكي!\n\n` +
      `إليك أهم الأماكن والمعالم التي ننصح بزيارتها في بورسعيد حالياً:\n\n` +
      generalCards +
      `\n\n---\n\n` +
      `### 🧭 كيف يمكنني مساعدتك أكثر؟\n` +
      `• يمكنك أن تطلب: *"خطط لي خروجة يوم كامل بميزانية 300 جنيه"*.\n` +
      `• أو: *"عايز كافيهات هادية قريبة من البحر"*.\n` +
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
    const shortName = nameLower.replace('مطعم ', '').replace('كافيه ', '').replace('حلويات ', '');

    const isMentioned =
      t.includes(nameLower) ||
      t.includes(shortName) ||
      (nameLower.includes('كاستن') && t.includes('كاستن')) ||
      (nameLower.includes('الجندي') && t.includes('الجندي')) ||
      (nameLower.includes('سيلفر') && t.includes('سيلفر')) ||
      (nameLower.includes('بينوس') && t.includes('بينوس')) ||
      (nameLower.includes('سوق السمك') && t.includes('سوق السمك')) ||
      (nameLower.includes('فنار') && t.includes('فنار')) ||
      (nameLower.includes('ديليسبس') && t.includes('ديليسبس')) ||
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
    }
  }

  return matched;
}

export async function POST(req: Request) {
  try {
    const { message, history, userLocation } = await req.json();

    let userDistrict: string | null = null;
    let locationContext = '';

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const inside = isPointInPortSaid(userLocation.lat, userLocation.lng);
      if (inside) {
        userDistrict = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
        locationContext = `\n[موقع المستخدم الحالي: Latitude=${userLocation.lat}, Longitude=${userLocation.lng} داخل نطاق "${userDistrict}" في بورسعيد. عند الاقتراح اذكر الأماكن القريبة منه مع حساب المسافة التقريبية].`;
      }
    }

    // فحص المفتاح من ترويسة الطلب المخصصة أو متغير البيئة
    const headerKey = req.headers.get('x-openrouter-key');
    const headerModel = req.headers.get('x-openrouter-model');
    const openRouterKey = (headerKey && headerKey.trim().length > 5) ? headerKey.trim() : (process.env.OPENROUTER_API_KEY || '').trim();
    const openRouterModel = (headerModel && headerModel.trim()) || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-nano';

    // 1. تشغيل موديل OpenRouter الحقيقي عند توفر المفتاح
    if (openRouterKey && openRouterKey.length > 5) {
      try {
        const messages: any[] = [
          { role: 'system', content: SYSTEM_PROMPT + locationContext },
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
            'Authorization': `Bearer ${openRouterKey}`,
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

        // إذا واجه OpenRouter خطأ، نقوم بتشغيل المحرك المحلي فوراً كبديل موثوق ومستقر دون كسر تجربة المستخدم
        if (!openRouterRes.ok) {
          const errData = await openRouterRes.json().catch(() => null);
          const statusCode = openRouterRes.status;
          let errorExplanation = errData?.error?.message || `كود الخطأ: ${statusCode}`;

          if (statusCode === 401) {
            errorExplanation = 'مفتاح OpenRouter غير صالح أو يحتاج للتحديث.';
          } else if (statusCode === 402) {
            errorExplanation = 'رصيد الحساب غير كافٍ في OpenRouter.';
          } else if (statusCode === 404) {
            errorExplanation = `الموديل المختار (${openRouterModel}) غير متاح حالياً.`;
          }

          console.warn('OpenRouter API returned error, gracefully falling back to local reasoning:', statusCode, errData);

          const fallbackResult = getDynamicReasoningReply(message, userLocation);
          return NextResponse.json({
            ok: true,
            ai_enabled: true,
            provider: 'portsaid_engine',
            reply: fallbackResult.reply,
            thinkingProcess: [
              `⚠️ تنبيه: ${errorExplanation} (HTTP ${statusCode}).`,
              `✅ تشغيل المحرك المحلي لتقديم الإجابة فوراً.`,
              ...fallbackResult.thinkingProcess,
            ],
            suggestedPlaces: fallbackResult.suggestedPlaces,
            userDistrict,
          });
        }

        const data = await openRouterRes.json();
        const rawReply = data.choices?.[0]?.message?.content;
        if (rawReply && typeof rawReply === 'string' && rawReply.trim()) {
          // تنظيف الرد وإزالة أي وسوم تفكير داخلية
          const cleanReply = rawReply.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
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
        const fallbackResult = getDynamicReasoningReply(message, userLocation);
        return NextResponse.json({
          ok: true,
          ai_enabled: true,
          provider: 'portsaid_engine',
          reply: fallbackResult.reply,
          thinkingProcess: [`⚠️ تنبيه اتصال: ${openRouterErr?.message}`, ...fallbackResult.thinkingProcess],
          suggestedPlaces: fallbackResult.suggestedPlaces,
          userDistrict,
        });
      }
    }

    // 2. تشغيل المحرك الذكي
    const reasoningResult = getDynamicReasoningReply(message, userLocation);

    return NextResponse.json({
      ok: true,
      ai_enabled: true,
      provider: 'portsaid_engine',
      reply: reasoningResult.reply,
      thinkingProcess: reasoningResult.thinkingProcess,
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
