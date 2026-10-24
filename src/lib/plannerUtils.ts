import { INITIAL_PLACES } from './constants';
import { isPointInPortSaid, calculateDistanceKm } from './geoUtils';

export interface PlaceCostInfo {
  estimatedCostPerPerson: number;
  costRange: string;
  recommendedDurationMinutes: number;
  bestTimeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';
  tags: string[];
}

// بيانات التكاليف والمدة الموصى بها لكل مكان معتمد في بورسعيد
export const PLACES_METADATA: Record<string, PlaceCostInfo> = {
  '11111111-1111-1111-1111-111111111101': {
    // فنار بورسعيد التاريخي
    estimatedCostPerPerson: 0,
    costRange: 'مجاني تماماً',
    recommendedDurationMinutes: 40,
    bestTimeOfDay: 'morning',
    tags: ['معالم', 'تاريخ', 'تصوير', 'فنار', 'حي الشرق'],
  },
  '11111111-1111-1111-1111-111111111102': {
    // ممشى ديليسبس وقناة السويس
    estimatedCostPerPerson: 0,
    costRange: 'مجاني تماماً',
    recommendedDurationMinutes: 50,
    bestTimeOfDay: 'evening',
    tags: ['ممشى', 'بحر', 'قناة السويس', 'سفن', 'فسحة', 'تصوير'],
  },
  '11111111-1111-1111-1111-111111111103': {
    // مسجد السلام الكبير
    estimatedCostPerPerson: 0,
    costRange: 'مجاني تماماً',
    recommendedDurationMinutes: 30,
    bestTimeOfDay: 'any',
    tags: ['معالم', 'إسلامي', 'هدوء', 'حي الشرق'],
  },
  '11111111-1111-1111-1111-111111111104': {
    // مطعم كاستن للأسماك
    estimatedCostPerPerson: 160,
    costRange: '130 - 220 ج.م',
    recommendedDurationMinutes: 75,
    bestTimeOfDay: 'midday',
    tags: ['مطعم', 'سمك', 'سي فود', 'عريق', 'إطلالة', 'حي الشرق'],
  },
  '11111111-1111-1111-1111-111111111105': {
    // مطعم ومأكولات الجندي البحرية
    estimatedCostPerPerson: 100,
    costRange: '75 - 130 ج.م',
    recommendedDurationMinutes: 60,
    bestTimeOfDay: 'midday',
    tags: ['مطعم', 'سمك', 'بلدي', 'اقتصادي', 'طلبة', 'حي العرب'],
  },
  '11111111-1111-1111-1111-111111111106': {
    // كافيه بينوس ممشى القناة
    estimatedCostPerPerson: 50,
    costRange: '35 - 75 ج.م',
    recommendedDurationMinutes: 60,
    bestTimeOfDay: 'evening',
    tags: ['كافيه', 'قهوة', 'ممشى القناة', 'سفن', 'قعدة رايقة'],
  },
  '11111111-1111-1111-1111-111111111107': {
    // حلويات سيلفر وكاساتا بورسعيد
    estimatedCostPerPerson: 40,
    costRange: '30 - 60 ج.م',
    recommendedDurationMinutes: 35,
    bestTimeOfDay: 'afternoon',
    tags: ['حلويات', 'كاساتا', 'ايس كريم', 'تحلية', 'حي العرب'],
  },
  '11111111-1111-1111-1111-111111111108': {
    // سوق السمك الحضاري الجديد
    estimatedCostPerPerson: 130,
    costRange: '90 - 170 ج.م',
    recommendedDurationMinutes: 75,
    bestTimeOfDay: 'midday',
    tags: ['سوق', 'سمك طازة', 'شوي', 'تجربة شعبية', 'حي العرب'],
  },
  '11111111-1111-1111-1111-111111111109': {
    // سكن طلبة حي الشرق
    estimatedCostPerPerson: 0,
    costRange: 'زيارة استرشادية',
    recommendedDurationMinutes: 30,
    bestTimeOfDay: 'any',
    tags: ['سكن', 'طلبة', 'حي الشرق'],
  },
  '11111111-1111-1111-1111-111111111110': {
    // سكن طالبات حي الزهور
    estimatedCostPerPerson: 0,
    costRange: 'زيارة استرشادية',
    recommendedDurationMinutes: 30,
    bestTimeOfDay: 'any',
    tags: ['سكن', 'طالبات', 'حي الزهور'],
  },
};

export interface ExtractedQueryIntent {
  partySize: number;
  durationHours: number;
  budgetEgp: number;
  categories: string[];
  vibe: 'foodie' | 'family' | 'romantic' | 'budget' | 'fun' | 'general';
  explicitKeywords: string[];
}

/**
 * تحليل الطلب الطبيعي للمستخدم واستخراج الميزانية والمدة وعدد الأشخاص
 */
export function parseTripQuery(text: string): ExtractedQueryIntent {
  const t = (text || '').toLowerCase();

  // 1. استخراج عدد الأشخاص
  let partySize = 2; // الافتراضي لشخصين
  if (t.includes('لوحدي') || t.includes('شخص واحد') || t.includes('فرد واحد') || t.includes('نفسي')) {
    partySize = 1;
  } else if (t.includes('شخصين') || t.includes('فردين') || t.includes('أنا وصاحبي') || t.includes('انا وصاحبي') || t.includes('أنا وزميلي') || t.includes('انا وزوجتي')) {
    partySize = 2;
  } else {
    const peopleMatch = t.match(/(\d+)\s*(أشخاص|اشخاص|افراد|أفراد|شخص|فرد|صحاب)/);
    if (peopleMatch && peopleMatch[1]) {
      const p = parseInt(peopleMatch[1], 10);
      if (p >= 1 && p <= 20) partySize = p;
    }
  }

  // 2. استخراج المدة بالساعات
  let durationHours = 4; // الافتراضي 4 ساعات
  const durationMatch = t.match(/(\d+)\s*(ساعات|ساعة|ساعه)/);
  if (durationMatch && durationMatch[1]) {
    const h = parseInt(durationMatch[1], 10);
    if (h >= 1 && h <= 14) durationHours = h;
  } else if (t.includes('ساعتين')) {
    durationHours = 2;
  } else if (t.includes('يوم كامل') || t.includes('طول اليوم')) {
    durationHours = 8;
  } else if (t.includes('نص يوم')) {
    durationHours = 5;
  }

  // 3. استخراج الميزانية بالجنيه
  let budgetEgp = 500; // الافتراضي 500 جنيه
  const budgetMatch = t.match(/(\d+)\s*(جنيه|جنية|ج\.م|egp|ميزانية|ميزانيه)/);
  if (budgetMatch && budgetMatch[1]) {
    const b = parseInt(budgetMatch[1], 10);
    if (b >= 50 && b <= 20000) budgetEgp = b;
  } else {
    // محاولة التقاط أي رقم مالي ثلاثي أو رباعي
    const generalNumMatch = t.match(/بميزانية\s*(\d+)/) || t.match(/معايا\s*(\d+)/);
    if (generalNumMatch && generalNumMatch[1]) {
      const b = parseInt(generalNumMatch[1], 10);
      if (b >= 50) budgetEgp = b;
    }
  }

  // 4. استخراج التصنيفات المطلوبة
  const categories: string[] = [];
  if (t.includes('مطعم') || t.includes('سمك') || t.includes('اكل') || t.includes('غدا') || t.includes('عشا') || t.includes('سي فود') || t.includes('جمبري')) {
    categories.push('food');
  }
  if (t.includes('كافيه') || t.includes('قهوة') || t.includes('كوفي') || t.includes('مشروب') || t.includes('شاي')) {
    categories.push('cafe');
  }
  if (t.includes('معالم') || t.includes('زيارة') || t.includes('سياحة') || t.includes('فنار') || t.includes('ممشى') || t.includes('فسحة') || t.includes('خروج')) {
    categories.push('fun');
  }
  if (t.includes('حلويات') || t.includes('كاساتا') || t.includes('سيلفر') || t.includes('حلو') || t.includes('ايس كريم') || t.includes('تمرية')) {
    categories.push('sweets');
  }
  if (t.includes('سوق') || t.includes('شراء') || t.includes('تسوق')) {
    categories.push('shop');
  }

  // إذا لم يحدد تصنيفات، نضع المزيج الكلاسيكي الممتع في بورسعيد (معالم + مطعم + كافيه + حلويات)
  if (categories.length === 0) {
    categories.push('fun', 'food', 'cafe', 'sweets');
  }

  // 5. استخراج الطابع العام (Vibe)
  let vibe: ExtractedQueryIntent['vibe'] = 'general';
  if (t.includes('توفير') || t.includes('اقتصادي') || t.includes('رخيص') || t.includes('طلبة')) {
    vibe = 'budget';
  } else if (t.includes('سمك') || t.includes('سي فود') || t.includes('أكيل') || t.includes('طعام')) {
    vibe = 'foodie';
  } else if (t.includes('عائلة') || t.includes('اسرة') || t.includes('ولاد') || t.includes('اطفال')) {
    vibe = 'family';
  } else if (t.includes('هادي') || t.includes('رومانسي') || t.includes('خطيبتي') || t.includes('زوجتي')) {
    vibe = 'romantic';
  } else if (t.includes('صحاب') || t.includes('شباب') || t.includes('حماس') || t.includes('فسحة')) {
    vibe = 'fun';
  }

  return {
    partySize,
    durationHours,
    budgetEgp,
    categories,
    vibe,
    explicitKeywords: [],
  };
}

export interface PlanStop {
  order: number;
  placeId: string;
  name: string;
  category: string;
  categoryLabel: string;
  area: string;
  lat: number;
  lon: number;
  arrivalTime: string;
  departureTime: string;
  stayDurationMinutes: number;
  estimatedCostPerPerson: number;
  totalCost: number;
  costRange: string;
  reason: string;
  tips: string;
  hasDiscount: boolean;
  discountPercent: number;
  travelFromPrevious?: {
    distanceKm: number;
    durationMinutes: number;
    mode: string;
  };
}

export interface PlanResult {
  id: string;
  title: string;
  summary: string;
  startTime: string;
  endTime: string;
  totalDurationHours: number;
  totalTravelMinutes: number;
  totalDistanceKm: number;
  totalCost: number;
  budgetEgp: number;
  partySize: number;
  transportMode: 'driving' | 'walking' | 'bus';
  budgetStatus: 'within' | 'exceeded' | 'exact';
  stops: PlanStop[];
  routeGeoJSON?: any;
  isRealStreetRoute: boolean;
  practicalTips: string[];
}

/**
 * جلب مسار قيادة أو مشي حقيقي من OSRM بين محطات الرحلة
 */
export async function fetchOSRMRoute(
  stops: Array<{ lat: number; lon: number }>,
  mode: 'driving' | 'walking' = 'driving'
): Promise<{
  geometry: any;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: Array<{ distance: number; duration: number }>;
  isRealStreetRoute: boolean;
}> {
  if (stops.length < 2) {
    return {
      geometry: null,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      legs: [],
      isRealStreetRoute: false,
    };
  }

  try {
    const coordsStr = stops.map((s) => `${s.lon},${s.lat}`).join(';');
    const profile = mode === 'walking' ? 'foot' : 'driving';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;

    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          geometry: route.geometry,
          totalDistanceMeters: route.distance,
          totalDurationSeconds: route.duration,
          legs: (route.legs || []).map((l: any) => ({
            distance: l.distance,
            duration: l.duration,
          })),
          isRealStreetRoute: true,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, falling back to direct line:', err);
  }

  // Fallback: خط هندسي مباشر بين المحطات
  let fallbackDistanceMeters = 0;
  const fallbackLegs = [];
  const coordsLine: [number, number][] = [];

  for (let i = 0; i < stops.length; i++) {
    coordsLine.push([stops[i].lon, stops[i].lat]);
    if (i > 0) {
      const km = calculateDistanceKm(
        stops[i - 1].lat,
        stops[i - 1].lon,
        stops[i].lat,
        stops[i].lon
      );
      const meters = km * 1000;
      fallbackDistanceMeters += meters;
      fallbackLegs.push({
        distance: meters,
        duration: Math.round((km / 30) * 3600), // تقدير 30 كم/س
      });
    }
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates: coordsLine,
    },
    totalDistanceMeters: fallbackDistanceMeters,
    totalDurationSeconds: Math.round((fallbackDistanceMeters / 1000 / 30) * 3600),
    legs: fallbackLegs,
    isRealStreetRoute: false,
  };
}

/**
 * خوارزمية ذكية متخصصة لبناء جدول رحلة بورسعيد المتوازن والمثالي
 */
export function buildDeterministicPortSaidPlan(params: {
  intent: ExtractedQueryIntent;
  startPoint?: { name: string; lat: number; lon: number };
  endPoint?: { name: string; lat: number; lon: number };
  transportMode?: 'driving' | 'walking' | 'bus';
}): PlanStop[] {
  const { intent, startPoint } = params;

  // ترشيح الأماكن من INITIAL_PLACES
  const available = INITIAL_PLACES.filter((p) => {
    return isPointInPortSaid(p.lat, p.lon) && p.cat !== 'housing';
  });

  const selectedPlaceIds: string[] = [];

  // 1. المعالم والأنشطة التاريخية (Sightseeing)
  if (intent.categories.includes('fun')) {
    // اختيار الفنار أولاً
    const fanar = available.find((p) => p.n.includes('فنار'));
    if (fanar) selectedPlaceIds.push(fanar.id);
  }

  // 2. المأكولات والأسماك (Lunch / Dining)
  if (intent.categories.includes('food') || intent.categories.includes('shop')) {
    if (intent.vibe === 'budget') {
      const gendy = available.find((p) => p.n.includes('الجندي'));
      if (gendy) selectedPlaceIds.push(gendy.id);
    } else if (intent.categories.includes('shop')) {
      const market = available.find((p) => p.n.includes('سوق السمك'));
      if (market) selectedPlaceIds.push(market.id);
    } else {
      const kasten = available.find((p) => p.n.includes('كاستن'));
      if (kasten) selectedPlaceIds.push(kasten.id);
    }
  }

  // 3. التحلية والكاساتا (Sweets)
  if (intent.categories.includes('sweets') && intent.durationHours >= 3) {
    const silver = available.find((p) => p.n.includes('سيلفر'));
    if (silver) selectedPlaceIds.push(silver.id);
  }

  // 4. كافيه وإطلالة القناة (Cafe / Promenade)
  if (intent.categories.includes('cafe')) {
    const binos = available.find((p) => p.n.includes('بينوس'));
    if (binos) selectedPlaceIds.push(binos.id);
  }

  // 5. إذا كانت المدة طويلة (5 ساعات فأكثر)، نضمن إضافة ممشى ديليسبس
  if (intent.durationHours >= 5) {
    const delesseps = available.find((p) => p.n.includes('ديليسبس'));
    if (delesseps && !selectedPlaceIds.includes(delesseps.id)) {
      selectedPlaceIds.push(delesseps.id);
    }
  }

  // ترتيب المحطات بتسلسل زمني منطقي
  const categoryOrder: Record<string, number> = {
    fun: 1,
    food: 2,
    shop: 2,
    sweets: 3,
    cafe: 4,
  };

  const sortedPlaceIds = [...selectedPlaceIds].sort((aId, bId) => {
    const pA = available.find((p) => p.id === aId);
    const pB = available.find((p) => p.id === bId);
    const orderA = categoryOrder[pA?.cat || 'fun'] || 5;
    const orderB = categoryOrder[pB?.cat || 'fun'] || 5;
    return orderA - orderB;
  });

  // إنشاء مصفوفة المحطات مع الأوقات والتكاليف
  let currentHour = 11; // بداية الخروجة 11:00 صباحاً
  let currentMinute = 0;

  const planStops: PlanStop[] = sortedPlaceIds.map((pId, idx) => {
    const place = available.find((p) => p.id === pId)!;
    const meta = PLACES_METADATA[pId] || {
      estimatedCostPerPerson: 50,
      costRange: '30 - 70 ج.م',
      recommendedDurationMinutes: 45,
      tags: [],
    };

    const costPerPerson = meta.estimatedCostPerPerson;
    const totalCostForGroup = costPerPerson * intent.partySize;

    // تنسيق وقت الوصول
    const arrivalH = currentHour > 12 ? currentHour - 12 : currentHour;
    const arrivalPeriod = currentHour >= 12 ? 'م' : 'ص';
    const arrivalTime = `${arrivalH}:${currentMinute.toString().padStart(2, '0')} ${arrivalPeriod}`;

    // إضافة مدة البقاء
    currentMinute += meta.recommendedDurationMinutes;
    while (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }

    // وقت المغادرة
    const depH = currentHour > 12 ? currentHour - 12 : currentHour;
    const depPeriod = currentHour >= 12 ? 'م' : 'ص';
    const departureTime = `${depH}:${currentMinute.toString().padStart(2, '0')} ${depPeriod}`;

    // إضافة 15 دقيقة انتقال للمحطة التالية
    currentMinute += 15;
    while (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }

    let reason = '';
    let tips = '';

    if (place.cat === 'fun') {
      reason = 'زيارة معلم تاريخي أساسي في بورسعيد لالتقاط الصور والتعرف على تاريخ القناة العريق.';
      tips = 'استمتع بالتصوير الخارجي ومشاهدة التفاصيل المعمارية الفريدة.';
    } else if (place.cat === 'food' || place.cat === 'shop') {
      reason = `تناول وجبة أسماك طازجة ولذيذة تتناسب تماماً مع ميزانية الخروجة (${intent.budgetEgp} ج.م).`;
      tips = place.disc > 0 ? `استخدم كوبون Port Said Hub للحصول على خصم ${place.disc}% فوري!` : '';
    } else if (place.cat === 'sweets') {
      reason = 'تحلية بورسعيدية كلاسيكية بكاساتا سيلفر الشهيرة لإكمال يومك بنكهة لا تُنسى.';
      tips = 'جرب طبق الكاساتا بالمكسرات أو الآيس كريم المشكل.';
    } else if (place.cat === 'cafe') {
      reason = 'الاسترخاء في المساء مع مشروبك المفضل أمام السفن الضخمة العابرة لقناة السويس.';
      tips = 'أفضل وقت لزيارته مع الغروب لمشاهدة إضاءة المجرى الملاحي.';
    }

    return {
      order: idx + 1,
      placeId: place.id,
      name: place.n,
      category: place.cat,
      categoryLabel:
        place.cat === 'food'
          ? 'مطعم أسماك'
          : place.cat === 'cafe'
          ? 'كافيه وقناة السويس'
          : place.cat === 'sweets'
          ? 'حلويات وتحلية'
          : 'معلم سياحي',
      area: place.a,
      lat: place.lat,
      lon: place.lon,
      arrivalTime,
      departureTime,
      stayDurationMinutes: meta.recommendedDurationMinutes,
      estimatedCostPerPerson: costPerPerson,
      totalCost: totalCostForGroup,
      costRange: meta.costRange,
      reason,
      tips,
      hasDiscount: place.disc > 0,
      discountPercent: place.disc,
    };
  });

  return planStops;
}

/**
 * تعديل الخطة الحالية تفاعلياً بالمحادثة دون إعادة بنائها من الصفر
 */
export function applyRefinementToPlan(
  currentPlan: PlanResult,
  instruction: string
): PlanResult {
  const inst = (instruction || '').toLowerCase().trim();
  let updatedStops = [...currentPlan.stops];

  // 1. طلب حذف محطة معينة
  if (inst.includes('احذف') || inst.includes('شيل') || inst.includes('إلغاء') || inst.includes('امسح') || inst.includes('بدون')) {
    if (inst.includes('كافيه') || inst.includes('قهوة') || inst.includes('بينوس')) {
      updatedStops = updatedStops.filter((s) => s.category !== 'cafe');
    } else if (inst.includes('حلويات') || inst.includes('سيلفر') || inst.includes('كاساتا') || inst.includes('حلو')) {
      updatedStops = updatedStops.filter((s) => s.category !== 'sweets');
    } else if (inst.includes('مطعم') || inst.includes('كاستن') || inst.includes('غدا') || inst.includes('اكل')) {
      updatedStops = updatedStops.filter((s) => s.category !== 'food');
    } else if (inst.includes('سوق السمك') || inst.includes('السوق')) {
      updatedStops = updatedStops.filter((s) => !s.name.includes('سوق السمك'));
    } else if (inst.includes('فنار')) {
      updatedStops = updatedStops.filter((s) => !s.name.includes('فنار'));
    } else if (inst.includes('ديليسبس') || inst.includes('ممشى')) {
      updatedStops = updatedStops.filter((s) => !s.name.includes('ديليسبس'));
    }
  }

  // 2. طلب استبدال مكان بمكان آخر
  if (inst.includes('بدل') || inst.includes('غير') || inst.includes('استبدل')) {
    if (inst.includes('الجندي')) {
      const gendy = INITIAL_PLACES.find((p) => p.n.includes('الجندي'));
      if (gendy) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? {
                ...s,
                placeId: gendy.id,
                name: gendy.n,
                category: gendy.cat,
                lat: gendy.lat,
                lon: gendy.lon,
                area: gendy.a,
                estimatedCostPerPerson: 100,
                totalCost: 100 * currentPlan.partySize,
                costRange: '75 - 130 ج.م',
                reason: 'تم الاستبدال لمطعم الجندي لتناول أسماك بلدية مميزة وأسعار اقتصادية تناسب ميزانيتكم.',
                tips: 'استمتع بالجمبري المقلي وطاجن السبيط البلدي.',
                hasDiscount: gendy.disc > 0,
                discountPercent: gendy.disc,
              }
            : s
        );
      }
    } else if (inst.includes('سوق السمك')) {
      const market = INITIAL_PLACES.find((p) => p.n.includes('سوق السمك'));
      if (market) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? {
                ...s,
                placeId: market.id,
                name: market.n,
                category: market.cat,
                lat: market.lat,
                lon: market.lon,
                area: market.a,
                estimatedCostPerPerson: 130,
                totalCost: 130 * currentPlan.partySize,
                costRange: '90 - 170 ج.م',
                reason: 'تم الاستبدال لسوق السمك الحضاري لشراء واختيار الأسماك الطازجة وشيّها فوراً.',
                tips: 'اشترِ السمك البوري أو الدنيس واطلب شوائه ردة على الفحم.',
                hasDiscount: market.disc > 0,
                discountPercent: market.disc,
              }
            : s
        );
      }
    } else if (inst.includes('كاستن')) {
      const kasten = INITIAL_PLACES.find((p) => p.n.includes('كاستن'));
      if (kasten) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? {
                ...s,
                placeId: kasten.id,
                name: kasten.n,
                category: kasten.cat,
                lat: kasten.lat,
                lon: kasten.lon,
                area: kasten.a,
                estimatedCostPerPerson: 160,
                totalCost: 160 * currentPlan.partySize,
                costRange: '130 - 220 ج.م',
                reason: 'تم الاستبدال لمطعم كاستن العريق لتجربة راقية بإطلالة على الممشى وقناة السويس.',
                tips: 'اطلب شوربة السي فود وطاجن الجمبري بالخلطة البورسعيدية.',
                hasDiscount: kasten.disc > 0,
                discountPercent: kasten.disc,
              }
            : s
        );
      }
    }
  }

  // 3. طلب إضافة تحلية بكاساتا سيلفر
  if (inst.includes('ضيف') || inst.includes('عايز احلي') || inst.includes('كاساتا') || inst.includes('سيلفر') || inst.includes('حلويات')) {
    const hasSweets = updatedStops.some((s) => s.category === 'sweets');
    if (!hasSweets) {
      const silver = INITIAL_PLACES.find((p) => p.n.includes('سيلفر'));
      if (silver) {
        updatedStops.push({
          order: updatedStops.length + 1,
          placeId: silver.id,
          name: silver.n,
          category: silver.cat,
          categoryLabel: 'حلويات وكاساتا',
          area: silver.a,
          lat: silver.lat,
          lon: silver.lon,
          arrivalTime: '03:30 م',
          departureTime: '04:10 م',
          stayDurationMinutes: 40,
          estimatedCostPerPerson: 40,
          totalCost: 40 * currentPlan.partySize,
          costRange: '30 - 60 ج.م',
          reason: 'إضافة محطة التحلية بكاساتا بورسعيد الشهيرة بناءً على رغبتك.',
          tips: 'جرب طبق الكاساتا التقليدي بالمكسرات الطبيعية.',
          hasDiscount: true,
          discountPercent: silver.disc,
        });
      }
    }
  }

  // 4. تعديل الميزانية إذا تم ذكر رقم جديد
  let newBudget = currentPlan.budgetEgp;
  const newBudgetMatch = inst.match(/(\d+)\s*(جنيه|جنية|ج\.م)/);
  if (newBudgetMatch && newBudgetMatch[1]) {
    const parsed = parseInt(newBudgetMatch[1], 10);
    if (parsed >= 50) newBudget = parsed;
  }

  // إعادة ترقيم المحطات
  updatedStops = updatedStops.map((s, idx) => ({ ...s, order: idx + 1 }));

  // إعادة حساب التكلفة
  const newTotalCost = updatedStops.reduce((sum, s) => sum + s.totalCost, 0);

  return {
    ...currentPlan,
    budgetEgp: newBudget,
    stops: updatedStops,
    totalCost: newTotalCost,
    budgetStatus: newTotalCost <= newBudget ? 'within' : 'exceeded',
  };
}
