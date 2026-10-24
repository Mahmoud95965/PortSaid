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

    // 1. معالجة تعديل خطة حالية (Refinement Action)
    if (action === 'refine' && currentPlan && refineInstruction) {
      const refined = applyRefinementToPlan(currentPlan, refineInstruction);

      // إعادة حساب مسار الشوارع الفعلي بين المحطات المعدلة
      if (refined.stops.length >= 2) {
        const waypoints = refined.stops.map((s) => ({ lat: s.lat, lon: s.lon }));
        const osrmResult = await fetchOSRMRoute(waypoints, refined.transportMode === 'walking' ? 'walking' : 'driving');

        // تحديث أوقات ومسافات الانتقال بين المحطات
        refined.routeGeoJSON = osrmResult.geometry;
        refined.isRealStreetRoute = osrmResult.isRealStreetRoute;
        refined.totalDistanceKm = Number((osrmResult.totalDistanceMeters / 1000).toFixed(2));
        refined.totalTravelMinutes = Math.round(osrmResult.totalDurationSeconds / 60);

        // تحديث travelFromPrevious لكل محطة
        refined.stops.forEach((stop, i) => {
          if (i > 0 && osrmResult.legs[i - 1]) {
            stop.travelFromPrevious = {
              distanceKm: Number((osrmResult.legs[i - 1].distance / 1000).toFixed(2)),
              durationMinutes: Math.round(osrmResult.legs[i - 1].duration / 60),
              mode: refined.transportMode,
            };
          }
        });
      }

      return NextResponse.json({
        ok: true,
        action: 'refine',
        plan: refined,
        message: 'تم تعديل الخطة وتحديث مسار الشوارع والميزانية بنجاح!',
      });
    }

    // 2. تحليل النص واستخراج النوايا (Intent Parsing)
    const extracted = parseTripQuery(prompt || '');

    // دمج الحقول الصريحة من النموذج إن وُجدت
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

    // 3. بناء المحطات الأساسية باستخدام الخوارزمية المتخصصة لبورسعيد
    const rawStops = buildDeterministicPortSaidPlan({
      intent: mergedIntent,
      startPoint,
      endPoint,
      transportMode,
    });

    if (rawStops.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'لم يتم العثور على أماكن مناسبة مطابقة للخيارات المحددة في بورسعيد.' },
        { status: 400 }
      );
    }

    // 4. استدعاء OpenRouter لتوليد نصائح وتفاصيل ذكية وشخصية إذا كان المفتاح متوفراً
    let smartSummary = `خطة خروجة متكاملة وممتعة في بورسعيد لـ ${finalPartySize} أفراد لمدة ${finalDuration} ساعات بميزانية ${finalBudget} ج.م تشمل ${rawStops.map((s) => s.name).join(' و ')}.`;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

    if (openRouterKey && prompt && prompt.length > 5) {
      try {
        const aiPrompt = `أنت المساعد الذكي لمخطط رحلات Port Said Hub. تم اختيار المحطات التالية للخروجة بناءً على طلب المستخدم ("${prompt}"):
${rawStops.map((s, i) => `${i + 1}. ${s.name} (${s.categoryLabel}) - ${s.area}`).join('\n')}
الميزانية: ${finalBudget} ج.م، الأفراد: ${finalPartySize}، المدة: ${finalDuration} ساعات.
قدم ملخصاً حماسياً دافئاً للخروجة باللهجة المصرية البورسعيدية الودودة في سطرين فقط، مع نصيحة واحدة سرية لأفضل تجربة.`;

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey.trim()}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Port Said Hub Smart Planner',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [{ role: 'user', content: aiPrompt }],
            max_tokens: 220,
            temperature: 0.7,
          }),
        });

        if (openRouterRes.ok) {
          const aiData = await openRouterRes.json();
          const reply = aiData.choices?.[0]?.message?.content?.trim();
          if (reply) {
            smartSummary = reply;
          }
        }
      } catch (aiErr) {
        console.warn('OpenRouter enrichment skipped, using standard summary:', aiErr);
      }
    }

    // 5. حساب المسار الفعلي بشوارع بورسعيد عبر OSRM
    const routeCoords: Array<{ lat: number; lon: number }> = [];

    // نقطة البداية المخصصة إن وجدت
    if (startPoint && typeof startPoint.lat === 'number' && typeof startPoint.lon === 'number') {
      routeCoords.push({ lat: startPoint.lat, lon: startPoint.lon });
    }

    rawStops.forEach((s) => routeCoords.push({ lat: s.lat, lon: s.lon }));

    // نقطة النهاية المخصصة إن وجدت
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
      // المسافة من المحطة السابقة
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

    const planResult: PlanResult = {
      id: 'plan-' + Date.now(),
      title: `خروجة بورسعيد (${finalDuration} ساعات • ${finalPartySize} أفراد)`,
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
      intent: mergedIntent,
    });
  } catch (error: any) {
    console.error('Smart Planner API error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'تعذر معالجة خطة الرحلة' },
      { status: 500 }
    );
  }
}
