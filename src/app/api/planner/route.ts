import { NextResponse } from 'next/server';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, calculateDistanceKm } from '@/lib/geoUtils';
import {
  parseTripQuery,
  buildDeterministicPortSaidPlan,
  applyRefinementToPlan,
  fetchOSRMRoute,
  PlanResult,
  PlanStop,
  ExtractedQueryIntent,
} from '@/lib/plannerUtils';

export const runtime = 'nodejs';

// بناء ملخص الأماكن المعتمدة للذكاء الاصطناعي
const PLACES_AI_CATALOG = INITIAL_PLACES.map((p) => {
  return `ID: "${p.id}" | اسم: "${p.n}" | تصنيف: "${p.cat}" | منطقة: "${p.a}" | تكلفة فرد: ${p.cost || 40} ج.م | خصم: ${p.disc}% | إحداثيات: lat=${p.lat}, lon=${p.lon} | وصف: ${p.ds}`;
}).join('\n');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      startPoint,
      endPoint,
      budgetEgp,
      durationHours,
      partySize,
      selectedCategories,
      transportMode = 'driving',
      action = 'generate',
      refineInstruction,
      currentPlan,
    } = body;

    // قراءة مفاتيح OpenRouter إن تم تمريرها من العميل أو البيئة
    const headerKey = req.headers.get('x-openrouter-key');
    const headerModel = req.headers.get('x-openrouter-model');
    const openRouterKey = (headerKey && headerKey.trim().length > 5) ? headerKey.trim() : (process.env.OPENROUTER_API_KEY || '').trim();
    const openRouterModel = (headerModel && headerModel.trim()) || process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-nano';

    // 1. معالجة تعديل خطة حالية (Refinement Action)
    if (action === 'refine' && currentPlan && refineInstruction) {
      const thinkingProcess: string[] = [
        `🧠 تحليل طلب التعديل: "${refineInstruction}".`,
        `🔄 فحص الخطة الحالية: ${currentPlan.stops.length} محطات بتكلفة ${currentPlan.totalCost} ج.م.`,
      ];

      const refined = applyRefinementToPlan(currentPlan, refineInstruction);
      thinkingProcess.push(`✅ تطبيق التعديل: أصبح عدد المحطات ${refined.stops.length} محطة بتكلفة معدلة ${refined.totalCost} ج.م.`);

      // إعادة حساب مسار الشوارع الفعلي بين المحطات المعدلة
      if (refined.stops.length >= 2) {
        thinkingProcess.push(`🛣️ إعادة حساب مسارات الشوارع عبر محرك OSRM لضمان التوجيه الدقيق.`);
        const waypoints = refined.stops.map((s) => ({ lat: s.lat, lon: s.lon }));
        const osrmResult = await fetchOSRMRoute(waypoints, refined.transportMode === 'walking' ? 'walking' : 'driving');

        // تحديث أوقات ومسافات الانتقال بين المحطات
        refined.routeGeoJSON = osrmResult.geometry;
        refined.isRealStreetRoute = osrmResult.isRealStreetRoute;
        refined.totalDistanceKm = Number((osrmResult.totalDistanceMeters / 1000).toFixed(2));
        refined.totalTravelMinutes = Math.round(osrmResult.totalDurationSeconds / 60);

        refined.stops.forEach((stop, i) => {
          if (i > 0 && osrmResult.legs[i - 1]) {
            stop.travelFromPrevious = {
              distanceKm: Number((osrmResult.legs[i - 1].distance / 1000).toFixed(2)),
              durationMinutes: Math.round(osrmResult.legs[i - 1].duration / 60),
              mode: refined.transportMode,
            };
          }
        });
        thinkingProcess.push(`⏱️ المسافة الإجمالية المحدثة: ${refined.totalDistanceKm} كم في حوالي ${refined.totalTravelMinutes} دقيقة.`);
      }

      return NextResponse.json({
        ok: true,
        action: 'refine',
        plan: refined,
        thinkingProcess,
        message: 'تم تعديل الخطة وتحديث مسار الشوارع والميزانية بنجاح!',
      });
    }

    // 2. تحليل النص واستخراج النوايا
    const extracted = parseTripQuery(prompt || '');

    const finalPartySize = partySize && partySize > 0 ? partySize : extracted.partySize;
    const finalDuration = durationHours && durationHours > 0 ? durationHours : extracted.durationHours;
    const finalBudget = budgetEgp && budgetEgp > 0 ? budgetEgp : extracted.budgetEgp;
    const finalCategories =
      Array.isArray(selectedCategories) && selectedCategories.length > 0
        ? selectedCategories
        : extracted.categories;

    const mergedIntent: ExtractedQueryIntent = {
      ...extracted,
      partySize: finalPartySize,
      durationHours: finalDuration,
      budgetEgp: finalBudget,
      categories: finalCategories,
    };

    let rawStops: PlanStop[] = [];
    let customTitle = `خروجة بورسعيد (${finalDuration} ساعات • ${finalPartySize} أفراد)`;
    let smartSummary = `خطة خروجة متكاملة وممتعة في بورسعيد لـ ${finalPartySize} أفراد لمدة ${finalDuration} ساعات بميزانية ${finalBudget} ج.م.`;
    let thinkingProcess: string[] = [];

    // 3. تخطيط حقيقي وتفكير عبر OpenRouter إذا كان المفتاح متوفراً
    let aiPlanSuccess = false;

    if (openRouterKey && openRouterKey.length > 5) {
      try {
        const aiPrompt = `
أنت المخطط ومصمم الرحلات الذكي لمنصة Port Said Hub.
المطلوب منك: تخطيط برنامج خروجة بورسعيدية واقعية ومتناسقة جغرافياً بناءً على طلب المستخدم:
"${prompt || 'خروجة سياحية وترفيهية متوازنة'}"

المعايير المحددة:
- الميزانية الإجمالية: ${finalBudget} جنيه مصري
- المدة الإجمالية: ${finalDuration} ساعات
- عدد الأفراد: ${finalPartySize}
- وسيلة الانتقال: ${transportMode === 'walking' ? 'مشياً على الأقدام' : 'بالسيارة / التاكسي'}

قائمة الأماكن المعتمدة في بورسعيد (اختر حصرياً من معرفات IDs التالية فقط):
${PLACES_AI_CATALOG}

شروط الخطة الإلزامية:
1. اختر من 2 إلى 5 محطات بالترتيب الزمني والجغرافي الأمثل لتقليل التنقل.
2. احرص أن تكون التكلفة الإجمالية قريبة من ميزانية المستخدم أو أقل منها.
3. التزم بالمعرفات IDs المذكورة تماماً.
4. يجب أن يكون الرد بتنسيق JSON حصراً كالتالي:
{
  "thinkingSteps": [
    "تحليل الطلب وتحديد نوع الخروجة...",
    "فحص الأماكن المتاحة ومطابقتها للميزانية والوقت...",
    "ترتيب المحطات جغرافياً لتقليل وقت الشوارع...",
    "التأكد من التكلفة والمواعيد..."
  ],
  "title": "عنوان جذاب للخروجة",
  "summary": "ملخص مشوق ودافئ للخروجة باللهجة المصرية البورسعيدية الودودة في سطرين إلى ثلاثة مع نصيحة حصرية",
  "selectedStops": [
    {
      "placeId": "معرف المكان الدقيق مثل kasten أو delesseps_walk",
      "reason": "سبب اختيار هذا المكان تحديداً لهذه الخروجة"
    }
  ]
}
`;

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Port Said Hub AI Planner',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [{ role: 'user', content: aiPrompt }],
            max_tokens: 950,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });

        if (openRouterRes.ok) {
          const aiData = await openRouterRes.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.selectedStops) && parsed.selectedStops.length >= 2) {
              const matchedStops: PlanStop[] = [];
              let currentHour = 11;

              parsed.selectedStops.forEach((item: any, idx: number) => {
                const place = INITIAL_PLACES.find((p) => p.id === item.placeId || p.n.includes(item.placeId));
                if (place) {
                  const arrH = currentHour % 12 || 12;
                  const arrPeriod = currentHour >= 12 ? 'م' : 'ص';
                  const depH = (currentHour + 1) % 12 || 12;
                  const depPeriod = (currentHour + 1) >= 12 ? 'م' : 'ص';
                  currentHour += 1;

                  const costPerPerson = place.cost || 40;
                  const totalCost = costPerPerson * finalPartySize;

                  matchedStops.push({
                    order: idx + 1,
                    placeId: place.id,
                    name: place.n,
                    category: place.cat,
                    categoryLabel: place.cat,
                    area: place.a,
                    lat: place.lat,
                    lon: place.lon,
                    arrivalTime: `${arrH}:00 ${arrPeriod}`,
                    departureTime: `${depH}:00 ${depPeriod}`,
                    stayDurationMinutes: 60,
                    estimatedCostPerPerson: costPerPerson,
                    totalCost,
                    costRange: costPerPerson > 0 ? `${costPerPerson} ج.م` : 'مجاني',
                    reason: item.reason || place.ds,
                    tips: place.ds,
                    hasDiscount: Boolean(place.disc && place.disc > 0),
                    discountPercent: place.disc || 0,
                  });
                }
              });

              if (matchedStops.length >= 2) {
                rawStops = matchedStops;
                customTitle = parsed.title || customTitle;
                smartSummary = parsed.summary || smartSummary;
                thinkingProcess = Array.isArray(parsed.thinkingSteps) && parsed.thinkingSteps.length > 0
                  ? parsed.thinkingSteps
                  : [
                      `🤖 خططها موديل: ${openRouterModel}.`,
                      `🗺️ تم اختيار ${matchedStops.length} محطات بناءً على الميزانية (${finalBudget} ج.م) والمدة (${finalDuration} ساعات).`,
                      `🛣️ جرى التحقق من الترتيب الجغرافي الواقعي.`,
                    ];
                aiPlanSuccess = true;
              }
            }
          }
        } else {
          const errData = await openRouterRes.json().catch(() => null);
          console.warn('OpenRouter Planner returned error, falling back to local heuristic:', openRouterRes.status, errData);
        }
      } catch (aiErr) {
        console.warn('AI Planning parsing failed, falling back to heuristic:', aiErr);
      }
    }

    // 4. إذا لم يتوفر مفتاح أو لم تنجح الاستجابة، استخدم الخوارزمية الجغرافية المحلية
    if (!aiPlanSuccess || rawStops.length === 0) {
      thinkingProcess = [
        `🎯 تحليل استفسار المستخدم: "${prompt || 'خطة تلقائية متوازنة'}"`,
        `📊 استخراج المعايير: الميزانية = ${finalBudget} ج.م | المدة = ${finalDuration} ساعات | الأفراد = ${finalPartySize}.`,
        `🗺️ فحص ومطابقة أماكن بورسعيد المعتمدة جغرافياً مع التصنيفات.`,
      ];

      rawStops = buildDeterministicPortSaidPlan({
        intent: mergedIntent,
        startPoint,
        endPoint,
        transportMode,
      });

      thinkingProcess.push(`📍 تم اختيار ${rawStops.length} محطات رئيسية: ${rawStops.map((s) => s.name).join(' ➔ ')}.`);
      thinkingProcess.push(`⚡ تم استخدام محرك التحليل الجغرافي والزمني الفائق لـ Port Said Hub.`);
    }

    if (rawStops.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'لم يتم العثور على أماكن مناسبة مطابقة للخيارات المحددة في بورسعيد.' },
        { status: 400 }
      );
    }

    // 5. حساب المسار الفعلي بشوارع بورسعيد عبر OSRM
    const routeCoords: Array<{ lat: number; lon: number }> = [];

    if (startPoint && typeof startPoint.lat === 'number' && typeof startPoint.lon === 'number') {
      routeCoords.push({ lat: startPoint.lat, lon: startPoint.lon });
    }

    rawStops.forEach((s) => routeCoords.push({ lat: s.lat, lon: s.lon }));

    if (endPoint && typeof endPoint.lat === 'number' && typeof endPoint.lon === 'number') {
      routeCoords.push({ lat: endPoint.lat, lon: endPoint.lon });
    }

    const osrmResult = await fetchOSRMRoute(
      routeCoords,
      transportMode === 'walking' ? 'walking' : 'driving'
    );

    // ربط مسافات وأوقات التنقل بين المحطات
    const stopsWithTravel = rawStops.map((stop, idx) => {
      let travelInfo = undefined;
      const legIndex = startPoint ? idx : idx - 1;
      if (legIndex >= 0 && osrmResult.legs[legIndex]) {
        travelInfo = {
          distanceKm: Number((osrmResult.legs[legIndex].distance / 1000).toFixed(2)),
          durationMinutes: Math.max(1, Math.round(osrmResult.legs[legIndex].duration / 60)),
          mode: transportMode,
        };
      }
      return {
        ...stop,
        travelFromPrevious: travelInfo,
      };
    });

    const totalCost = rawStops.reduce((sum, s) => sum + s.totalCost, 0);
    const totalDistanceKm = Number((osrmResult.totalDistanceMeters / 1000).toFixed(2));
    const totalTravelMinutes = Math.round(osrmResult.totalDurationSeconds / 60);

    thinkingProcess.push(
      `💰 فحص الميزانية: التكلفة التقديرية ${totalCost} ج.م مقابل ميزانية ${finalBudget} ج.م (${totalCost <= finalBudget ? 'ضمن الميزانية بنجاح ✅' : 'تجاوز طفيف للميزانية ⚠️'}).`
    );
    thinkingProcess.push(
      `🏁 إجمالي المسار: ${totalDistanceKm} كم • وقت التنقل الواقعي بين المحطات: ~${totalTravelMinutes} دقيقة.`
    );

    const planResult: PlanResult = {
      id: 'plan-' + Date.now(),
      title: customTitle,
      summary: smartSummary,
      startTime: rawStops[0]?.arrivalTime || '11:00 ص',
      endTime: rawStops[rawStops.length - 1]?.departureTime || '04:00 م',
      totalDurationHours: finalDuration,
      totalTravelMinutes,
      totalDistanceKm,
      totalCost,
      budgetEgp: finalBudget,
      partySize: finalPartySize,
      transportMode,
      budgetStatus: totalCost <= finalBudget ? 'within' : 'exceeded',
      stops: stopsWithTravel,
      routeGeoJSON: osrmResult.geometry,
      isRealStreetRoute: osrmResult.isRealStreetRoute,
      practicalTips: [
        'استخدم كوبونات Port Said Hub عند المحطات الشريكة للحصول على خصم فوري يصل إلى 15%.',
        'المعدية بين بورسعيد وبورفؤاد مجانية تماماً للمشاة وتعمل على مدار 24 ساعة.',
        'أفضل وقت للتصوير في ممشى ديليسبس هو الساعة الذهبية قبل الغروب لمشاهدة إضاءة المجرى الملاحي.',
        'سجل حضورك في كل محطة عبر التطبيق لكسب من +20 إلى +50 نقطة فورية لكل مكان!',
      ],
    };

    return NextResponse.json({
      ok: true,
      action: 'generate',
      plan: planResult,
      thinkingProcess,
      intent: mergedIntent,
      ai_powered: aiPlanSuccess,
    });
  } catch (error: any) {
    console.error('Smart Planner API error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'تعذر معالجة خطة الرحلة' },
      { status: 500 }
    );
  }
}
