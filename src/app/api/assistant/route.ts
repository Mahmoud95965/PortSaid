import { NextResponse } from 'next/server';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm, identifyPortSaidDistrict } from '@/lib/geoUtils';

export const runtime = 'nodejs';

// بناء قاعدة بيانات الأماكن الحقيقية للإرشاد بالخريطة
const PLACES_KNOWLEDGE = INITIAL_PLACES.map((p) => {
  return `- [${p.id}] ${p.n} (${p.a}) | تصنيف: ${p.cat} | إحداثيات: lat=${p.lat}, lon=${p.lon} | خصم: ${p.disc}% | نقاط زيارة: ${p.p} | تفاصيل: ${p.ds}`;
}).join('\n');

const SYSTEM_PROMPT = `
إنت "مساعد بورسعيد الذكي"، مرشد سياحي ومعرفي متخصص ومحب لمدينة بورسعيد الباسلة داخل منصة Port Said Hub (التي طورها فريق Alpha).
اتكلم باللهجة المصرية العامية البورسعيدية الودودة، وكن دقيقًا ومختصرًا ومفيدًا (من 3 إلى 5 أسطر عادةً).

أنت متصل بالكامل بخريطة بورسعيد التفاعلية (OpenFreeMap & MapLibre)، وتعرف كل مكان مسجل بإحداثياته الجغرافية الدقيقة.

قاعدة بيانات الأماكن الحقيقية بالمنصة المعتمدة:
${PLACES_KNOWLEDGE}

معلومات أساسية يجب أن تعرفها وتجيب بناءً عليها:
1. نظام النقاط والمكافآت (Hubs Rewards):
   - كيف تكسب نقاط؟ عند التسجيل يحصل المستخدم على +20 نقطة تترحيبية. وعند زيارة أي مكان والضغط على "سجّل حضورك الآن" يحصل على من +20 إلى +50 نقطة فورية (مسموح بزيارة واحدة لكل مكان في اليوم).
   - تم إلغاء كسب النقاط من المشاركة العشوائية، وأصبح كسب النقاط مقتصرًا على النشاط الحقيقي والزيارات الميدانية.
   - كيف تستخدم النقاط؟ تستبدلها بكوبونات خصم فورية بنسبة 10% إلى 20% لدى المطاعم والكافيهات الشريكة (مثل مطعم كاستن، حلويات سيلفر، كافيه بينوس، مطعم الجندي). يظهر كود QR ورمز الكوبون لإظهاره للكاشير عند الدفع.

2. المطاعم والأسماك والحلويات:
   - مطعم كاستن للأسماك (حي الشرق - عريق ومطل على القناة - خصم 15%).
   - مطعم الجندي للأسماك (حي العرب - طعم بلدي وجودة عالية وأسعار مناسبة للطلبة - خصم 12%).
   - سوق السمك الحضاري الجديد (حي العرب - تشتري سمك طازة وتشوي وتاكل هناك - خصم 10%).
   - حلويات سيلفر وكاساتا بورسعيد الشهيرة (حي العرب - خصم 10%).
   - كافيه بينوس ممشى القناة (حي الشرق - إطلالة مباشرة على السفن العابرة لقناة السويس - خصم 10%).

3. المعالم والفسح:
   - فنار بورسعيد التاريخي (أول فنار خرساني في العالم بحي الشرق).
   - ممشى ديليسبس وقناة السويس (حي الشرق).
   - مسجد السلام الكبير (حي الشرق).
   - جبال الملح والمعدية المجانية في بورفؤاد.

4. المواصلات والجامعة:
   - خط الأمين: يربط المعدية والسكن الجامعي بمعهد الحاسب الآلي، كلية التكنولوجيا والحقوق، بنك الإسكان، والمنشية.
   - خط الزهور: يربط قصر الثقافة بكليات الطب البشري، العلاج الطبيعي، الصيدلة، وشارع النصر.
   - خط الـ 5000: يربط المعدية بكلية التربية النوعية والإفرنج وحي العرب والمناخ.
   - المعدية بين بورسعيد وبورفؤاد: مجانية 24 ساعة للمشاة والركاب.

5. السكن الطلابي:
   - حي الزهور والمناخ: الأفضل لطلبة الطب والصيدلة والعلاج الطبيعي.
   - حي الشرق وحي العرب: الأفضل لهندسة وتجارة وتربية ولقربها من الممشى والمواصلات.

6. انضمام التجار والشركاء:
   - أصحاب المحلات والمطاعم يقدروا يسجلوا من زر "سجل متجرك" لإنشاء حساب شريك وتقديم خصومات للزوار.

تعليمات التعامل مع الموقع الجغرافي والخريطة:
- إذا شارك المستخدم موقعه الجغرافي معك، ستصلك إحداثياته والحي التابع له، فحدد موقعه وقس المسافة ورشح له أقرب الأماكن إليه بالكيلومتر!
- عند ذكرك لأي مكان، شجع المستخدم على الضغط على زر "اعرض على الخريطة" لمعاينته فوراً.
`;

// محرك ذكي محلي يعمل بسرعة وبدون الحاجة لـ API Keys
function getSmartLocalReply(
  message: string,
  userLocation?: { lat: number; lng: number } | null
): { reply: string; suggestedPlaces: any[] } {
  const q = (message || '').toLowerCase().trim();
  const suggested: any[] = [];

  // فحص قرب الأماكن إذا توفر موقع المستخدم
  let locationPreamble = '';
  if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
    const inside = isPointInPortSaid(userLocation.lat, userLocation.lng);
    if (inside) {
      const district = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
      // ترتيب الأماكن حسب المسافة
      const sortedByDist = [...INITIAL_PLACES].sort((a, b) => {
        const dA = calculateDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lon);
        const dB = calculateDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lon);
        return dA - dB;
      });

      const nearest = sortedByDist[0];
      const distKm = calculateDistanceKm(userLocation.lat, userLocation.lng, nearest.lat, nearest.lon);
      locationPreamble = `📍 موقعك الحالي في ${district}!\nأقرب مكان مسجل ليك هو "${nearest.n}" (${nearest.a}) على بعد ${distKm} كم تقريباً.\n\n`;
    }
  }

  // 1. استفسارات الموقع الجغرافي والأماكن القريبة
  if (q.includes('موقعي') || q.includes('قريب') || q.includes('اقرب') || q.includes('جنبي') || q.includes('حوالي') || q.includes('مكان قريب')) {
    if (userLocation && isPointInPortSaid(userLocation.lat, userLocation.lng)) {
      const district = identifyPortSaidDistrict(userLocation.lat, userLocation.lng);
      const top3 = [...INITIAL_PLACES]
        .map((p) => ({
          ...p,
          distanceKm: calculateDistanceKm(userLocation.lat, userLocation.lng, p.lat, p.lon),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);

      top3.forEach((p) => suggested.push(p));

      return {
        reply: `📍 أنت في ${district}، ودي أقرب 3 أماكن لموقعك الحالي:\n` +
          top3.map((p, idx) => `${idx + 1}. ${p.n} (${p.a}) - يبعد ${p.distanceKm} كم`).join('\n') +
          '\n\nتقدر تدوس على زر المكان بالأسفل لفتحه فوراً على الخريطة التفاعلية!',
        suggestedPlaces: suggested,
      };
    } else {
      return {
        reply: '📍 عشان أعرف أقرب الأماكن ليك، اضغط على زر "📍 موقعي" في شريط الإدخال بالأسفل لمشاركة موقعك بالـ GPS وسأحدد لك الأقرب بالكيلومتر فوراً!',
        suggestedPlaces: [],
      };
    }
  }

  // 2. النقاط والمكافآت
  if (q.includes('نقط') || q.includes('نقاط') || q.includes('مكاف') || q.includes('كوبون') || q.includes('خصم') || q.includes('استبدال') || q.includes('اكسب')) {
    return {
      reply: locationPreamble + '⭐ نظام النقاط في Port Said Hub حقيقي ومفيد جداً:\n' +
        '1. بتكسب 20 نقطة هدية أول ما تسجل حسابك الجديد.\n' +
        '2. لما تزور أي مكان في بورسعيد، دوس "سجّل حضورك الآن" من صفحته واكسب من 20 لـ 50 نقطة فورية (مرة واحدة للمكان يومياً).\n' +
        '3. تقدر تستبدل نقطك بكوبونات خصم بنسبة 10% لـ 20% في مطاعم وكافيهات بورسعيد (زي كاستن وسيلفر وبينوس) بالكود والـ QR عند الكاشير!\n' +
        'تقدر تدوس على عداد النقط فوق عشان تشوف كل التفاصيل وسجل معاملاتك.',
      suggestedPlaces: [],
    };
  }

  // 3. الأكل والسمك والمطاعم
  if (q.includes('سمك') || q.includes('اكل') || q.includes('مطعم') || q.includes('مطاعم') || q.includes('سي فود') || q.includes('غدا') || q.includes('عشا') || q.includes('جمبري') || q.includes('كاستن') || q.includes('سوق السمك')) {
    const kasten = INITIAL_PLACES.find((p) => p.n.includes('كاستن'));
    const gendy = INITIAL_PLACES.find((p) => p.n.includes('الجندي'));
    const fishMarket = INITIAL_PLACES.find((p) => p.n.includes('سوق السمك'));
    if (kasten) suggested.push(kasten);
    if (gendy) suggested.push(gendy);
    if (fishMarket) suggested.push(fishMarket);

    return {
      reply: locationPreamble + '🐟 أهلاً بيك في عاصمة المأكولات البحرية!\n' +
        '• لو عايز تجربة عريقة وفخمة بإطلالة على الممشى والقناة: مطعم "كاستن" في حي الشرق (خصم 15%).\n' +
        '• لو عايز طعم بلدي وجودة عالية وأسعار ممتازة للطلبة: مطعم "الجندي" في حي العرب (خصم 12%).\n' +
        '• لو عايز تشتري سمك طازة على ذوقك وتشويه وتاكله سخن: "سوق السمك الحضاري الجديد" في حي العرب.\n' +
        'تقدر تدوس على أي مطعم تحت لعرضه مباشرة على الخريطة التفاعلية!',
      suggestedPlaces: suggested,
    };
  }

  // 4. الحلويات والكاساتا
  if (q.includes('حلو') || q.includes('كاساتا') || q.includes('حلويات') || q.includes('سيلفر') || q.includes('تمرية') || q.includes('ايس كريم')) {
    const silver = INITIAL_PLACES.find((p) => p.n.includes('سيلفر'));
    if (silver) suggested.push(silver);

    return {
      reply: locationPreamble + '🍨 حلويات بورسعيد مالهاش مثيل:\n' +
        '• "كاساتا بورسعيد" الأسطورية بطبقات الآيس كريم والمكسرات والكريمة من حلويات سيلفر بحي العرب (خصم 10%).\n' +
        '• "التمرية البورسعيدية" السخنة المقرمشة من المحلات الشعبية في الصباح.\n' +
        '• حلويات الباشا وألذ قشطوطة وبسبوسة عند الممشى السياحي.',
      suggestedPlaces: suggested,
    };
  }

  // 5. السياحة والمعالم والفسح
  if (q.includes('فسح') || q.includes('خروج') || q.includes('سياح') || q.includes('معالم') || q.includes('فنار') || q.includes('ممشى') || q.includes('ديليسبس') || q.includes('جبال الملح') || q.includes('فريال') || q.includes('بورفؤاد')) {
    const fanar = INITIAL_PLACES.find((p) => p.n.includes('فنار'));
    const delesseps = INITIAL_PLACES.find((p) => p.n.includes('ديليسبس'));
    if (fanar) suggested.push(fanar);
    if (delesseps) suggested.push(delesseps);

    return {
      reply: locationPreamble + '🏛️ يوم مثالي في بورسعيد تقدر تقضيه كده:\n' +
        '1. تبدأ الصبح في حديقة فريال التاريخية وسط الخضرة والفيو التاريخي.\n' +
        '2. تمشي في ممشى ديليسبس وتشوف فنار بورسعيد التاريخي والسفن العملاقة في قناة السويس.\n' +
        '3. تركب "المعدية المجانية" وتعدي لبورفؤاد وتتصور عند "جبال الملح" كانك في القطب الشمالي!\n' +
        '4. ترجع تتغدى وجبة سمك في سوق السمك الحضاري وتقضي السهرة في كافيهات الممشى السياحي.',
      suggestedPlaces: suggested,
    };
  }

  // 6. المواصلات والخطوط
  if (q.includes('مواصلات') || q.includes('اروح ازاي') || q.includes('مينى باص') || q.includes('باص') || q.includes('ميكروباص') || q.includes('تاكسي') || q.includes('معدية') || q.includes('موقف')) {
    return {
      reply: '🚌 مواصلات بورسعيد سهلة ومنظمة جداً:\n' +
        '• خط الأمين: من المعدية والسكن الجامعي لمعهد الحاسب وكلية التكنولوجيا والحقوق والمنشية.\n' +
        '• خط الزهور: من قصر الثقافة وشارع النصر لكليات الطب البشري، العلاج الطبيعي، والصيدلة.\n' +
        '• خط الـ 5000: من المعدية لكلية التربية النوعية والإفرنج وحي العرب وحي المناخ.\n' +
        '• المعدية بين بورسعيد وبورفؤاد: مجانية تماماً للمشاة والركاب وشغالة 24 ساعة!\n' +
        'تقدر تشوف الخريطة الكاملة للمحطات والخطوط من قسم "مواصلات" في الموقع.',
      suggestedPlaces: [],
    };
  }

  // 7. السكن الطلابي
  if (q.includes('سكن') || q.includes('شقة') || q.includes('شقق') || q.includes('كلية') || q.includes('جامعة') || q.includes('طالب') || q.includes('طالبات')) {
    const housing1 = INITIAL_PLACES.find((p) => p.n.includes('سكن طلبة حي الشرق'));
    const housing2 = INITIAL_PLACES.find((p) => p.n.includes('سكن طالبات حي الزهور'));
    if (housing1) suggested.push(housing1);
    if (housing2) suggested.push(housing2);

    return {
      reply: locationPreamble + '🏠 نصائح السكن الطلابي في بورسعيد:\n' +
        '• لطلبة كليات الطب والصيدلة والعلاج الطبيعي: أفضل سكن في "حي الزهور" و"المناخ" لقرابتهم الشديدة من مجمع الكليات.\n' +
        '• لطلبة الهندسة والتربية والتجارة: "حي الشرق" و"حي العرب" ممتازين وهاديين وقريبين من المواصلات.\n' +
        'تقدر تتصفح قسم "السكن" أو تشوف أماكن السكن على الخريطة مباشرة.',
      suggestedPlaces: suggested,
    };
  }

  // 8. التجار والشركاء
  if (q.includes('متجر') || q.includes('محل') || q.includes('تاجر') || q.includes('شريك') || q.includes('انضمام') || q.includes('سجل متجرك')) {
    return {
      reply: '💼 لو عندك مطعم أو كافيه أو محل في بورسعيد، تشرفنا بانضمامك:\n' +
        'دوس على زر "سجل متجرك كشريك" في أسفل الصفحة الرئيسية أو من قسم التجار، وحدد نسبة الخصم اللي تحب تقدمها لزوار الموقع، وفريقنا هيتواصل معاك فوراً لتفعيل متجرك على الخريطة.',
      suggestedPlaces: [],
    };
  }

  // 9. الترحيب العام
  if (q.includes('سلام') || q.includes('ازيك') || q.includes('مرحبا') || q.includes('صباح') || q.includes('مساء') || q.includes('مين انت') || q.includes('هلا')) {
    return {
      reply: locationPreamble + 'أهلاً بيك يا غالي في Port Said Hub 🌊 أنا مساعد بورسعيد الذكي.\n' +
        'اسألني عن أي حاجة: أقرب مطاعم السمك ليك، خطوط المواصلات، إزاي تستخدم رصيد نقطك وتاخد خصومات، أو اضغط على أي مكان لعرضه على الخريطة!',
      suggestedPlaces: [],
    };
  }

  // 10. إجابة عامة افتراضية
  return {
    reply: locationPreamble + 'أنا معاك يا بطل! ⚓ تقدر تسألني عن أي حاجة في بورسعيد:\n' +
      '• "أقرب مطعم سمك أو كافيه لموقعي؟"\n' +
      '• "إزاي أستفيد من النقط والكوبونات؟"\n' +
      '• "إزاي أروح كليتي ومواعيد المواصلات؟"\n' +
      '• "أماكن الخروج وفسح جبال الملح والمعدية؟"',
    suggestedPlaces: [],
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

    // 1. فحص OpenRouter API Key أولاً (كما طلب المستخدم: "وهستخدم openrouter من فضلك")
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

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
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          const replyText = data.choices?.[0]?.message?.content;
          if (replyText && typeof replyText === 'string' && replyText.trim()) {
            const suggestedPlaces = extractMentionedPlaces(replyText, userLocation);
            return NextResponse.json({
              ok: true,
              ai_enabled: true,
              provider: 'openrouter',
              model: openRouterModel,
              reply: replyText.trim(),
              suggestedPlaces,
              userDistrict,
            });
          }
        } else {
          const errText = await openRouterRes.text();
          console.warn('OpenRouter API returned error, falling back:', openRouterRes.status, errText);
        }
      } catch (openRouterErr) {
        console.warn('OpenRouter API request failed, falling back to local engine:', openRouterErr);
      }
    }

    // 2. إذا توفر Anthropic API Key كخيار ثانوي
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
      try {
        const messages: any[] = [];
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

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 450,
            system: SYSTEM_PROMPT + locationContext,
            messages,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let reply = '';
          if (data.content && Array.isArray(data.content)) {
            for (const b of data.content) {
              if (b.type === 'text') reply += b.text;
            }
          }
          if (reply.trim()) {
            const suggestedPlaces = extractMentionedPlaces(reply, userLocation);
            return NextResponse.json({
              ok: true,
              ai_enabled: true,
              provider: 'anthropic',
              reply: reply.trim(),
              suggestedPlaces,
              userDistrict,
            });
          }
        }
      } catch (anthropicErr) {
        console.warn('Anthropic API request failed, falling back:', anthropicErr);
      }
    }

    // 3. Fallback: المحرك الذكي المحلي (Smart Local Engine) فائق السرعة
    const localResult = getSmartLocalReply(message, userLocation);
    // دمج الأماكن المكتشفة من النص أيضاً
    const extraPlaces = extractMentionedPlaces(localResult.reply, userLocation);
    const mergedPlaces = [...localResult.suggestedPlaces];
    extraPlaces.forEach((p) => {
      if (!mergedPlaces.some((m) => m.id === p.id)) {
        mergedPlaces.push(p);
      }
    });

    return NextResponse.json({
      ok: true,
      ai_enabled: false,
      provider: 'local',
      reply: localResult.reply,
      suggestedPlaces: mergedPlaces,
      userDistrict,
    });
  } catch (error: any) {
    console.error('Assistant route error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
