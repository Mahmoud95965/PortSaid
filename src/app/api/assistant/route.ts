import { NextResponse } from 'next/server';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm, identifyPortSaidDistrict } from '@/lib/geoUtils';

export const runtime = 'nodejs';

// بناء قاعدة بيانات الأماكن الحقيقية للإرشاد بالخريطة
const PLACES_KNOWLEDGE = INITIAL_PLACES.map((p) => {
  return `- [${p.id}] ${p.n} (${p.a}) | تصنيف: ${p.cat} | إحداثيات: lat=${p.lat}, lon=${p.lon} | خصم: ${p.disc}% | نقاط زيارة: ${p.p} | تفاصيل: ${p.ds}`;
}).join('\n');

const SYSTEM_PROMPT = `
أنت "مساعد بورسعيد الذكي ومخطط الرحلات"، مرشد سياحي ومعرفي محترف وودود متخصص في محافظة بورسعيد داخل منصة Port Said Hub.
تحدث باللهجة المصرية البورسعيدية الدافئة والذكية والمباشرة.

قواعد الإجابة:
1. اكتب ردك المنظم والودود والمباشر للمستخدم فوراً دون أي وسوم تفكير.
2. التزم حصرياً بالأماكن والمعالم الحقيقية في بورسعيد المذكورة في قاعدة البيانات بالأسفل، ولا تختلق أماكن وهمية.
3. إذا سأل المستخدم عن مكان أو مطعم، اذكر اسمه الدقيق كما في القائمة لكي تظهره الخريطة التفاعلية له فوراً.

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
  const matchedPlaces = placesWithDist.filter((p) => {
    const name = p.n.toLowerCase();
    const desc = p.ds.toLowerCase();
    const cat = p.cat.toLowerCase();
    const area = p.a.toLowerCase();

    return (
      q.includes(name) ||
      name.split(' ').some((word) => word.length > 2 && q.includes(word)) ||
      desc.split(' ').some((word) => word.length > 3 && q.includes(word)) ||
      q.includes(cat) ||
      q.includes(area)
    );
  });

  thinkingProcess.push(`🎯 تحليل السؤال: "${message}" واستخراج الكلمات المفتاحية والتفضيلات.`);

  // 1. استفسارات الموقع الجغرافي والأقرب
  if (q.includes('موقع') || q.includes('قريب') || q.includes('اقرب') || q.includes('جنبي') || q.includes('حوالي')) {
    thinkingProcess.push(`📍 البحث عن الأماكن الأقرب لموقع المستخدم في ${userDistrict}.`);
    if (hasLocation) {
      const top3 = placesWithDist.slice(0, 3);
      top3.forEach((p) => suggested.push(p));
      thinkingProcess.push(`⚖️ الأماكن الأقرب لموقعك الفعلي: ${top3.map((p) => `${p.n} (${p.distanceKm} كم)`).join('، ')}.`);

      return {
        reply: `📍 أنت حالياً في **${userDistrict}**، ورتبت لك أقرب المعالم والمطاعم لموقعك الفعلي:\n\n` +
          top3.map((p, idx) => `${idx + 1}. **${p.n}** (${p.a}) — يبعد عنك **${p.distanceKm} كم** ${p.disc ? `(خصم ${p.disc}%)` : ''}`).join('\n') +
          '\n\nاضغط على أي مكان بالأسفل لمشاهدته وتتبعه على الخريطة مباشرة! 🗺️',
        thinkingProcess,
        suggestedPlaces: suggested,
      };
    } else {
      thinkingProcess.push(`⚠️ الـ GPS غير مفعل: تشجيع المستخدم على مشاركة موقعه لحساب الكيلومترات.`);
      return {
        reply: '📍 عشان أحسب لك أقرب الأماكن بدقة بالكيلومتر، اضغط على زر **«📍 موقعي»** بالأعلى لمشاركة إحداثياتك بالـ GPS، وسأحدد لك أقرب المعالم فوراً!',
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

    return {
      reply: `🌊 **إليك أفضل الترشيحات المتوافقة مع طلبك في بورسعيد:**\n\n` +
        selected.map((p, i) => `${i + 1}. **${p.n}** (${p.a}) — ${p.ds} ${p.disc ? `(خصم **${p.disc}%** بالكوبونات)` : ''}`).join('\n\n') +
        `\n\nاضغط على أي مكان لعرضه مباشرة على الخريطة ومعرفة تفاصيل الوصول.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 3. استفسارات عامة أو استكشافية
  const topGeneral = placesWithDist.slice(0, 3);
  topGeneral.forEach((p) => suggested.push(p));
  thinkingProcess.push(`💡 سؤال عام: تقديم خيارات استكشافية لمعالم ومطاعم بورسعيد.`);

  return {
    reply: `أهلاً بيك يا غالي! أنا مساعدك البورسعيدي الذكي. إليك أهم المعالم والأنشطة المقترحة الآن:\n\n` +
      topGeneral.map((p, i) => `${i + 1}. **${p.n}** (${p.a}) — ${p.ds}`).join('\n') +
      `\n\nتقدر تسألني عن أي مطعم، أو خطوط المواصلات، أو تطلب خروجة محددة بميزانيتك ووقتك 🧭`,
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
            max_tokens: 750,
            temperature: 0.7,
          }),
        });

        // إذا واجه OpenRouter خطأ (401، 402، 404، إلخ) - نعرض للمستخدم سبب الخطأ بشفافية كاملة
        if (!openRouterRes.ok) {
          const errData = await openRouterRes.json().catch(() => null);
          const statusCode = openRouterRes.status;
          let errorExplanation = errData?.error?.message || `كود الخطأ: ${statusCode}`;

          if (statusCode === 401) {
            errorExplanation = 'مفتاح OpenRouter غير صالح أو منتهي الصلاحية (401 Unauthorized). يرجى التأكد من نسخه بشكل صحيح.';
          } else if (statusCode === 402) {
            errorExplanation = 'رصيد الحساب غير كافٍ في OpenRouter (402 Payment Required). يرجى شحن الرصيد أو استخدام موديل مجاني مثل google/gemini-2.0-flash-thinking-exp:free.';
          } else if (statusCode === 404) {
            errorExplanation = `الموديل المختار (${openRouterModel}) غير متاح حالياً على OpenRouter.`;
          }

          console.error('OpenRouter API returned error:', statusCode, errData);

          return NextResponse.json({
            ok: true,
            ai_enabled: false,
            provider: 'openrouter_error',
            model: openRouterModel,
            reply: `⚠️ **تنبيه مفتاح الذكاء الاصطناعي (OpenRouter):**\n\nواجهة برمجة التطبيقات ردت بالخطأ التالي (${statusCode}):\n> ${errorExplanation}\n\nيرجى فحص المفتاح أو تغييره من زر **«⚙️ الموديل والمفتاح»** بالأعلى لتشغيل النموذج الحقيقي دون قيود.`,
            thinkingProcess: [
              `❌ فشل الاتصال بموديل OpenRouter (${openRouterModel}).`,
              `⚠️ كود الاستجابة: HTTP ${statusCode}.`,
              `🔍 تفاصيل الخطأ: ${errorExplanation}`,
            ],
            suggestedPlaces: [],
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
            provider: 'openrouter',
            model: openRouterModel,
            reply: cleanReply,
            suggestedPlaces,
            userDistrict,
          });
        }
      } catch (openRouterErr: any) {
        console.error('OpenRouter network request failed:', openRouterErr);
        return NextResponse.json({
          ok: true,
          ai_enabled: false,
          provider: 'network_error',
          reply: `⚠️ تعذر الاتصال بخوادم OpenRouter: ${openRouterErr?.message || 'خطأ في الشبكة'}. يرجى التحقق من اتصال الإنترنت.`,
          thinkingProcess: [`❌ خطأ في الاتصال بالشبكة: ${openRouterErr?.message}`],
          suggestedPlaces: [],
          userDistrict,
        });
      }
    }

    // 2. عند عدم إدخال مفتاح OpenRouter: تشغيل المحرك الديناميكي الداخلي
    const reasoningResult = getDynamicReasoningReply(message, userLocation);

    return NextResponse.json({
      ok: true,
      ai_enabled: true,
      provider: 'portsaid_reasoning_engine',
      model: 'port-said-semantic-engine',
      reply: reasoningResult.reply + '\n\n*(💡 لتفعيل نموذج الذكاء الاصطناعي التوليدي الكامل عبر OpenRouter، اضغط على «⚙️ الموديل والمفتاح» بالأعلى لإدخال مفتاحك)*',
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
