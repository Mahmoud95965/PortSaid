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

قواعد مهمة جداً للتفكير:
1. قبل كتابة الرد النهائي، فكر في خطوات الحل والترشيحات واكتب تفكيرك الداخلي بدقة داخل وسم <think>...</think>.
2. بعد إغلاق وسم </think>، اكتب ردك النهائي المنظم والودود والمباشر للمستخدم دون تكرار الوسم.

قاعدة بيانات الأماكن المعتمدة في بورسعيد:
${PLACES_KNOWLEDGE}
`;

/**
 * محرك التفكير والتحليل الذكي المحلي الفوري (عند عدم توفر مفتاح سحابي)
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

  // فرز الأماكن حسب المسافة إن توفر الموقع
  const placesWithDist = INITIAL_PLACES.map((p) => {
    const dist = hasLocation
      ? calculateDistanceKm(userLocation!.lat, userLocation!.lng, p.lat, p.lon)
      : undefined;
    return { ...p, distanceKm: dist };
  }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

  // 1. استفسارات الموقع الجغرافي والأقرب
  if (q.includes('موقع') || q.includes('قريب') || q.includes('اقرب') || q.includes('جنبي') || q.includes('حوالي')) {
    thinkingProcess.push(`🎯 تحليل الهدف: البحث عن الأماكن الأقرب لموقع المستخدم في ${userDistrict}.`);
    if (hasLocation) {
      const top3 = placesWithDist.slice(0, 3);
      top3.forEach((p) => suggested.push(p));
      thinkingProcess.push(`📍 الموقع محدد عبر الـ GPS: تم حساب المسافة لجميع الأماكن المعتمدة واختيار أقرب 3 معالم.`);
      thinkingProcess.push(`⚖️ الأماكن المختارة: ${top3.map((p) => `${p.n} (${p.distanceKm} كم)`).join('، ')}.`);
      thinkingProcess.push(`💡 إعداد التوصية: تقديم مسار الوصول المباشر وتشجيع المعاينة على الخريطة التفاعلية.`);

      return {
        reply: `📍 أنت حالياً في **${userDistrict}**، ورتبت لك أقرب 3 أماكن لموقعك الفعلي على الخريطة:\n\n` +
          top3.map((p, idx) => `${idx + 1}. **${p.n}** (${p.a}) — يبعد عنك **${p.distanceKm} كم** فقط ${p.disc ? `(خصم ${p.disc}%)` : ''}`).join('\n') +
          '\n\nاضغط على أي مكان بالأسفل لعرض موقعه المباشر ومسار الشارع على الخريطة! 🗺️',
        thinkingProcess,
        suggestedPlaces: suggested,
      };
    } else {
      thinkingProcess.push(`⚠️ الموقع الجغرافي غير مفعل: تشجيع المستخدم على تفعيل زر الـ GPS.`);
      return {
        reply: '📍 عشان أحسب لك أقرب الأماكن بدقة بالكيلومتر، اضغط على زر **«📍 موقعي»** بجوار حقل الكتابة لمشاركة موقعك بالـ GPS، وسأحدد لك أقرب المطاعم والمعالم فوراً!',
        thinkingProcess,
        suggestedPlaces: [],
      };
    }
  }

  // 2. المأكولات البحرية والسمك
  if (q.includes('سمك') || q.includes('اكل') || q.includes('مطعم') || q.includes('سي فود') || q.includes('غدا') || q.includes('عشا') || q.includes('جمبري') || q.includes('كاستن') || q.includes('سوق السمك')) {
    thinkingProcess.push('🐟 تحليل النية: الرغبة في تناول وجبة أسماك أو مأكولات بحرية في بورسعيد.');
    thinkingProcess.push('🔎 فحص الأماكن المتاحة: مقارنة بين مطعم كاستن (حي الشرق - عريق وفخم)، ومطعم الجندي (حي العرب - اقتصادي وشعبي)، وسوق السمك الحضاري.');
    thinkingProcess.push('💰 تقييم التكلفة والخصومات: كاستن يوفر خصم 15%، والجندي خصم 12% عبر نظام Hubs Rewards.');
    thinkingProcess.push('✨ صياغة التوصيات المتنوعة لتناسب الأذواق المختلفة.');

    const kasten = INITIAL_PLACES.find((p) => p.n.includes('كاستن'));
    const gendy = INITIAL_PLACES.find((p) => p.n.includes('الجندي'));
    const market = INITIAL_PLACES.find((p) => p.n.includes('سوق السمك'));
    if (kasten) suggested.push(kasten);
    if (gendy) suggested.push(gendy);
    if (market) suggested.push(market);

    return {
      reply: `🌊 **بورسعيد عاصمة السي فود الحقيقي!** إليك أفضل الترشيحات المتوافقة مع رغبتك:\n\n` +
        `1. **مطعم كاستن للأسماك** (حي الشرق): الأفضل للجلسات العريقة والإطلالة البحرية، ويوفر خصم **15%** بالكوبونات.\n` +
        `2. **مطعم ومأكولات الجندي** (حي العرب): طعم بلدي بورسعيدي أصيل وأسعار ممتازة تناسب الأصدقاء والطلبة (خصم **12%**).\n` +
        `3. **سوق السمك الحضاري الجديد** (حي العرب): تجربة حية تشتري السمك طازة وتشوي وتاكل في صالة المطاعم هناك.\n\n` +
        `اضغط على أي مطعم لعرض مكانه على الخريطة ومعرفة تفاصيل الوصول.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 3. الكافيهات والمشروبات والجلسات الهادئة
  if (q.includes('كافيه') || q.includes('قهوة') || q.includes('قعدة') || q.includes('شاي') || q.includes('روقان') || q.includes('بينوس') || q.includes('بحر')) {
    thinkingProcess.push('☕ تحليل النية: البحث عن كافيه أو جلسة هادئة ومطلة على القناة أو البحر.');
    thinkingProcess.push('🔎 مراجعة الخريطة: كافيه بينوس بممشى القناة يوفر إطلالة استثنائية على السفن العابرة.');
    thinkingProcess.push('💡 إعداد النصيحة: التوصية بأوقات الغروب والمساء للحصول على أفضل إطلالة.');

    const baynous = INITIAL_PLACES.find((p) => p.n.includes('بينوس'));
    const deLesseps = INITIAL_PLACES.find((p) => p.n.includes('ديليسبس'));
    if (baynous) suggested.push(baynous);
    if (deLesseps) suggested.push(deLesseps);

    return {
      reply: `☕ **أفضل قعدة كافيه في بورسعيد:**\n\n` +
        `• **كافيه بينوس ممشى القناة** (حي الشرق): جلسة مميزة على الممشى مباشرة تشاهد السفن العملاقة وهي تعبر قناة السويس في مشهد عالمي، مع خصم **10%** بالكوبونات.\n` +
        `• **ممشى ديليسبس**: ننصحك بتمشية خفيفة بعد القهوة على امتداد الممشى التاريخي وحتى فنار بورسعيد.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 4. الحلويات والكاساتا
  if (q.includes('حلو') || q.includes('كاساتا') || q.includes('سيلفر') || q.includes('ايس كريم') || q.includes('تمرية')) {
    thinkingProcess.push('🍨 تحليل النية: البحث عن حلويات بورسعيدية أصيلة وتحديداً كاساتا سيلفر.');
    thinkingProcess.push('🔎 فحص الأماكن: حلويات سيلفر وكاساتا بورسعيد بحي العرب معتمد في المنصة بخصم 10%.');
    const silver = INITIAL_PLACES.find((p) => p.n.includes('سيلفر'));
    if (silver) suggested.push(silver);

    return {
      reply: `🍨 **حلويات بورسعيد الشهيرة:**\n\n` +
        `• **كاساتا بورسعيد الأصلية من حلويات سيلفر** (حي العرب): طبقات الآيس كريم مع الكريمة الغنية والمكسرات، التجربة الأشهر في بورسعيد وبخصم **10%** عبر رصيد نقاطك!\n` +
        `• جرب أيضاً «التمرية البورسعيدية» الساخنة المقرمشة من المحلات الشعبية في الصباح الباكر.`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // 5. المواصلات والجامعة
  if (q.includes('مواصل') || q.includes('اروح') || q.includes('ازاي') || q.includes('مينى باص') || q.includes('باص') || q.includes('معدية') || q.includes('كلية') || q.includes('جامعة')) {
    thinkingProcess.push('🚌 تحليل النية: استفسار عن خطوط المينى باص ومواصلات كليات جامعة بورسعيد والمعدية.');
    thinkingProcess.push('📋 فحص مسارات النقل: خط الأمين، خط الزهور للمجمع الطبي، خط الـ 5000، والمعدية المجانية.');

    return {
      reply: `🚌 **دليل مواصلات بورسعيد السريعة:**\n\n` +
        `• **خط الزهور**: يمر بقصر الثقافة وشارع النصر ويصل مباشرة إلى **المجمع الطبي** (كليات الطب البشري، الصيدلة، التمريض، والعلاج الطبيعي).\n` +
        `• **خط الأمين**: يربط المعدية وموقف السكن الجامعي بمعهد الحاسب الآلي وكلية التكنولوجيا والحقوق والمنشية.\n` +
        `• **خط الـ 5000**: يربط المعدية وحي الشرق بكلية التربية النوعية والإفرنج وحي العرب والمناخ.\n` +
        `• **المعدية بين بورسعيد وبورفؤاد**: مجانية تماماً وشغالة 24 ساعة للمشاة والسيارات!`,
      thinkingProcess,
      suggestedPlaces: [],
    };
  }

  // 6. الفسح والمعالم السياحية
  if (q.includes('فسح') || q.includes('خروج') || q.includes('معالم') || q.includes('فنار') || q.includes('بورفؤاد') || q.includes('جبال الملح')) {
    thinkingProcess.push('🏛️ تحليل النية: طلب برنامج سياحي وترفيهي واستكشاف أهم معالم المدينة.');
    thinkingProcess.push('🗺️ ترتيب المسار: البدء بحديقة فريال وممشى ديليسبس، ثم العبور بالمعدية إلى بورفؤاد وجبال الملح.');

    const fanar = INITIAL_PLACES.find((p) => p.n.includes('فنار'));
    const delesseps = INITIAL_PLACES.find((p) => p.n.includes('ديليسبس'));
    if (fanar) suggested.push(fanar);
    if (delesseps) suggested.push(delesseps);

    return {
      reply: `🏛️ **أجمل خروجة سياحية متكاملة في بورسعيد وبورفؤاد:**\n\n` +
        `1. **فنار بورسعيد التاريخي وممشى ديليسبس**: أول فنار خرساني في العالم مع إطلالة بانورامية على مدخل قناة السويس.\n` +
        `2. **المعدية المجانية إلى بورفؤاد**: تجربة بحرية ساحرة ومشاهدة طيور النورس.\n` +
        `3. **جبال الملح في بورفؤاد**: التقاط صور خيالية كأنك في جبال الجليد بالقطب الشمالي.\n` +
        `4. **حديقة فريال التاريخية**: مساحات خضراء وطراز معماري ملكي هادئ.\n\n` +
        `تقدر في أي وقت تطلب مني في الشات: *«خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه»* وسأرسم لك خط السير والمسار بالخريطة فوراً! 🧭`,
      thinkingProcess,
      suggestedPlaces: suggested,
    };
  }

  // إجابة استكشافية ذكية تلقائية
  thinkingProcess.push(`💡 تحليل استفسار عام: التعرف على رغبة المستخدم وتقديم مقترحات استرشادية.`);
  thinkingProcess.push(`🗺️ مراجعة شبكة الأماكن المعتمدة في حي الشرق وحي العرب وبورفؤاد.`);
  thinkingProcess.push(`✨ إعداد رد ذكي تفاعلي يشمل التخطيط والاستكشاف.`);

  const samplePlaces = INITIAL_PLACES.slice(0, 2);
  samplePlaces.forEach((p) => suggested.push(p));

  return {
    reply: `أهلاً بيك! أنا مساعدك البورسعيدي الذكي. جاهز لمساعدتك في:\n\n` +
      `• **تخطيط خروجة متكاملة**: اكتب لي مثلاً *«خطط خروجة لشخصين بـ 500 جنيه لمدة 5 ساعات»* وسأرسم لك مسار الشوارع والخريطة على يسارك 🧭\n` +
      `• **أقرب الأماكن والمطاعم**: اضغط على زر *«📍 موقعي»* وسأرتب لك الأماكن حسب بُعدها عنك بالكيلومتر.\n` +
      `• **كسب النقاط والخصومات**: استبدال رصيدك بكوبونات 10% إلى 20% لدى كاستن وسيلفر وبينوس.\n\n` +
      `عايز تروح فين أو تعرف إيه في بورسعيد النهاردة؟ 👇`,
    thinkingProcess,
    suggestedPlaces: suggested,
  };
}

/**
 * دالة مساعدة لاستخراج الأماكن المقترحة المذكورة في نص الرد
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
    const openRouterKey = (headerKey && headerKey.trim().length > 5) ? headerKey.trim() : process.env.OPENROUTER_API_KEY;
    const openRouterModel = headerModel || process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

    // 1. تشغيل موديل OpenRouter الحقيقي عند توفر المفتاح
    if (openRouterKey && openRouterKey.trim().length > 5) {
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
            'Authorization': `Bearer ${openRouterKey.trim()}`,
            'HTTP-Referer': siteUrl,
            'X-Title': 'Port Said Hub Assistant',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages,
            max_tokens: 650,
            temperature: 0.7,
          }),
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          let rawReply = data.choices?.[0]?.message?.content;
          if (rawReply && typeof rawReply === 'string' && rawReply.trim()) {
            let thinkingProcess: string[] = [];
            let cleanReply = rawReply.trim();

            // استخراج التفكير الداخلي من وسم <think> إن وُجد
            const thinkMatch = rawReply.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch) {
              thinkingProcess = thinkMatch[1]
                .trim()
                .split('\n')
                .map((s) => s.replace(/^[•\-\*\d\.]+\s*/, '').trim())
                .filter(Boolean);
              cleanReply = rawReply.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
            } else {
              thinkingProcess = [
                `تمت معالجة السؤال وتوليد التوصيات عبر نموذج ${openRouterModel}.`,
                `تم فحص المعالم والمطاعم المعتمدة لمطابقة تفضيلاتك في بورسعيد.`,
              ];
            }

            const suggestedPlaces = extractMentionedPlaces(cleanReply, userLocation);
            return NextResponse.json({
              ok: true,
              ai_enabled: true,
              provider: 'openrouter',
              model: openRouterModel,
              reply: cleanReply,
              thinkingProcess,
              suggestedPlaces,
              userDistrict,
            });
          }
        }
      } catch (openRouterErr) {
        console.warn('OpenRouter API request failed, switching to dynamic reasoning engine:', openRouterErr);
      }
    }

    // 2. المحرك المنطقي الذكي الفوري (Dynamic Reasoning Engine)
    const reasoningResult = getDynamicReasoningReply(message, userLocation);

    return NextResponse.json({
      ok: true,
      ai_enabled: true,
      provider: 'portsaid_reasoning_engine',
      model: 'port-said-semantic-reasoner-v2',
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
