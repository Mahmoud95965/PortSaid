import { INITIAL_PLACES } from './constants';
import { isPointInPortSaid, calculateDistanceKm } from './geoUtils';

export interface PlaceCostInfo {
  estimatedCostPerPerson: number;
  costRange: string;
  recommendedDurationMinutes: number;
  bestTimeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';
  tags: string[];
}

// بناء بيانات التكاليف والمدة الموصى بها لكل مكان معتمد في بورسعيد
function buildPlacesMetadata(): Record<string, PlaceCostInfo> {
  const meta: Record<string, PlaceCostInfo> = {};
  for (const p of INITIAL_PLACES) {
    let cost = p.cost > 0 ? p.cost : 0;
    let costRange = cost > 0 ? `${cost} - ${Math.round(cost * 1.5)} ج.م` : 'مجاني تماماً';
    let duration = 60;
    let bestTime: 'morning' | 'midday' | 'afternoon' | 'evening' | 'any' = 'any';
    const tags: string[] = [p.a];

    if (p.cat === 'food') {
      cost = cost || (p.n.includes('سمك') ? 140 : 90);
      costRange = `${Math.round(cost * 0.8)} - ${Math.round(cost * 1.4)} ج.م`;
      duration = 70;
      bestTime = 'midday';
      tags.push('مطعم', 'مأكولات');
      if (p.n.includes('سمك')) tags.push('أسماك', 'سي فود');
    } else if (p.cat === 'cafe') {
      cost = cost || 45;
      costRange = '30 - 65 ج.م';
      duration = 60;
      bestTime = 'evening';
      tags.push('كافيه', 'مشروبات', 'جلسات');
    } else if (p.cat === 'sweets') {
      cost = cost || 35;
      costRange = '25 - 50 ج.م';
      duration = 30;
      bestTime = 'afternoon';
      tags.push('حلويات', 'تحلية', 'آيس كريم');
    } else if (p.cat === 'fun') {
      cost = 0;
      costRange = 'مجاني تماماً';
      duration = 50;
      bestTime = 'afternoon';
      tags.push('معالم', 'سياحة', 'فسحة', 'تصوير');
    } else if (p.cat === 'shop') {
      cost = cost || 40;
      costRange = 'تسوق حر';
      duration = 45;
      bestTime = 'any';
      tags.push('تسوق', 'أسواق');
    } else if (p.cat === 'sport') {
      cost = cost || 60;
      costRange = '50 - 100 ج.م';
      duration = 60;
      bestTime = 'morning';
      tags.push('رياضة', 'لياقة', 'نشاط');
    } else if (p.cat === 'housing') {
      cost = 0;
      costRange = 'حسب الإقامة';
      duration = 30;
      bestTime = 'any';
      tags.push('سكن', 'فندق');
    } else if (p.cat === 'bus') {
      cost = 0;
      costRange = 'زيارة تعليمية';
      duration = 45;
      bestTime = 'morning';
      tags.push('تعليم', 'جامعة');
    }

    if (p.n.includes('كاستن')) {
      cost = 160;
      costRange = '130 - 220 ج.م';
      duration = 75;
      tags.push('عريق', 'إطلالة بحرية');
    } else if (p.n.includes('الجندي')) {
      cost = 100;
      costRange = '75 - 130 ج.م';
      duration = 60;
      tags.push('بلدي', 'اقتصادي', 'طلبة');
    } else if (p.n.includes('سوق السمك') || p.n.includes('سوق الأسماك')) {
      cost = 130;
      costRange = '90 - 170 ج.م';
      duration = 75;
      tags.push('سمك طازة', 'شوي');
    } else if (p.n.includes('ديليسبس') || p.n.includes('الممشى السياحي')) {
      cost = 0;
      costRange = 'مجاني تماماً';
      duration = 60;
      bestTime = 'evening';
      tags.push('ممشى', 'قناة السويس', 'سفن');
    }

    meta[p.id] = {
      estimatedCostPerPerson: cost,
      costRange,
      recommendedDurationMinutes: duration,
      bestTimeOfDay: bestTime,
      tags,
    };
  }
  return meta;
}

export const PLACES_METADATA: Record<string, PlaceCostInfo> = buildPlacesMetadata();

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
  if (t.includes('معالم') || t.includes('زيارة') || t.includes('سياحة') || t.includes('فنار') || t.includes('ممشى')) {
    categories.push('fun');
  }
  if (t.includes('حلويات') || t.includes('كاساتا') || t.includes('سيلفر') || t.includes('حلو') || t.includes('ايس كريم') || t.includes('تمرية')) {
    categories.push('sweets');
  }
  if (t.includes('سوق') || t.includes('شراء') || t.includes('تسوق')) {
    categories.push('shop');
  }

  // إذا لم يحدد تصنيفات محددة، أو كانت خروجة/فسحة عامة، نضع المزيج المتوازن (معالم + مطعم + كافيه)
  if (categories.length === 0 || (categories.length === 1 && categories[0] === 'fun' && !t.includes('معالم فقط'))) {
    if (!categories.includes('fun')) categories.push('fun');
    if (!categories.includes('food')) categories.push('food');
    if (!categories.includes('cafe')) categories.push('cafe');
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

  // 1. المعالم والأنشطة السياحية والتاريخية (Sightseeing)
  if (intent.categories.includes('fun')) {
    const sight =
      available.find((p) => p.cat === 'fun' && (p.n.includes('ديليسبس') || p.n.includes('الممشى'))) ||
      available.find((p) => p.cat === 'fun');
    if (sight) selectedPlaceIds.push(sight.id);
  }

  // 2. المأكولات والأسماك (Lunch / Dining)
  if (intent.categories.includes('food') || intent.categories.includes('shop')) {
    const budgetPerPerson = intent.budgetEgp / (intent.partySize || 1);
    if (intent.vibe === 'budget' || budgetPerPerson <= 160) {
      const gendy = available.find((p) => p.n.includes('الجندي')) || available.find((p) => p.cat === 'food');
      if (gendy) selectedPlaceIds.push(gendy.id);
    } else if (intent.categories.includes('shop')) {
      const market = available.find((p) => p.n.includes('سوق السمك') || p.n.includes('سوق الأسماك')) || available.find((p) => p.cat === 'shop');
      if (market) selectedPlaceIds.push(market.id);
    } else {
      const kasten = available.find((p) => p.n.includes('كاستن')) || available.find((p) => p.cat === 'food');
      if (kasten) selectedPlaceIds.push(kasten.id);
    }
  }

  // 3. التحلية والحلويات (Sweets)
  if (intent.categories.includes('sweets') && intent.durationHours >= 3) {
    const sweet = available.find((p) => p.cat === 'sweets');
    if (sweet) selectedPlaceIds.push(sweet.id);
  }

  // 4. كافيه وإطلالة القناة أو الشاطئ (Cafe)
  if (intent.categories.includes('cafe')) {
    const cafe =
      available.find((p) => p.cat === 'cafe' && (p.n.includes('المنارة') || p.n.includes('الشاطئ') || p.a.includes('الممشى') || p.a.includes('طرح البحر'))) ||
      available.find((p) => p.cat === 'cafe');
    if (cafe && !selectedPlaceIds.includes(cafe.id)) selectedPlaceIds.push(cafe.id);
  }

  // 5. ضمان أن أي برنامج خروجة يحتوي على محطتين على الأقل
  if (selectedPlaceIds.length < 2) {
    const backup = available.find((p) => !selectedPlaceIds.includes(p.id) && (p.cat === 'fun' || p.cat === 'cafe'));
    if (backup) {
      selectedPlaceIds.push(backup.id);
    }
  }

  // 6. إذا كانت المدة 3 ساعات فأكثر ولم يكتمل البرنامج لـ 3 محطات
  if (intent.durationHours >= 3 && selectedPlaceIds.length < 3) {
    const extra = available.find((p) => !selectedPlaceIds.includes(p.id) && (p.cat === 'cafe' || p.cat === 'sweets' || p.cat === 'fun'));
    if (extra) {
      selectedPlaceIds.push(extra.id);
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

export function createStopFromPlace(
  place: (typeof INITIAL_PLACES)[0],
  order: number,
  partySize: number,
  customReason?: string
): PlanStop {
  const meta = PLACES_METADATA[place.id] || {
    estimatedCostPerPerson: 50,
    costRange: '30 - 70 ج.م',
    recommendedDurationMinutes: 45,
    tags: [],
  };
  const costPerPerson = meta.estimatedCostPerPerson;
  const totalCost = costPerPerson * partySize;

  let reason = customReason || '';
  if (!reason) {
    if (place.cat === 'fun') reason = 'زيارة واستكشاف معلم بورسعيدي مميز والتقاط أجمل الصور.';
    else if (place.cat === 'food' || place.cat === 'shop') reason = 'تناول وجبة بورسعيدية طازجة ومميزة تناسب الميزانية.';
    else if (place.cat === 'sweets') reason = 'تحلية بورسعيدية كلاسيكية بكاساتا سيلفر الشهيرة.';
    else if (place.cat === 'cafe') reason = 'جلسة رايقة ومشروب أمام سفن المجرى الملاحي لقناة السويس.';
  }

  return {
    order,
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
    arrivalTime: `${(11 + order - 1) % 12 || 12}:00 ${(11 + order - 1) >= 12 ? 'م' : 'ص'}`,
    departureTime: `${(11 + order) % 12 || 12}:00 ${(11 + order) >= 12 ? 'م' : 'ص'}`,
    stayDurationMinutes: meta.recommendedDurationMinutes || 45,
    estimatedCostPerPerson: costPerPerson,
    totalCost,
    costRange: meta.costRange,
    reason,
    tips: place.disc > 0 ? `خصم ${place.disc}% بكوبونات Port Said Hub` : '',
    hasDiscount: place.disc > 0,
    discountPercent: place.disc,
  };
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
  const partySize = currentPlan.partySize || 2;

  // 1. فحص طلب الحذف بالترتيب والموقع (المكان التاني، الأول، الأخير...)
  let targetIndexToRemove: number | null = null;
  if (
    inst.includes('المكان التاني') ||
    inst.includes('تاني مكان') ||
    inst.includes('المحطة التانية') ||
    inst.includes('رقم 2') ||
    inst.includes('تاني واحد')
  ) {
    targetIndexToRemove = 1;
  } else if (
    inst.includes('المكان الاول') ||
    inst.includes('المكان الأول') ||
    inst.includes('اول مكان') ||
    inst.includes('أول مكان') ||
    inst.includes('المحطة الاولى') ||
    inst.includes('المحطة الأولى') ||
    inst.includes('رقم 1') ||
    inst.includes('اول واحد')
  ) {
    targetIndexToRemove = 0;
  } else if (
    inst.includes('المكان التالت') ||
    inst.includes('تالت مكان') ||
    inst.includes('المحطة التالتة') ||
    inst.includes('رقم 3') ||
    inst.includes('تالت واحد')
  ) {
    targetIndexToRemove = 2;
  } else if (
    inst.includes('المكان الاخير') ||
    inst.includes('المكان الأخير') ||
    inst.includes('اخر مكان') ||
    inst.includes('آخر مكان') ||
    inst.includes('المحطة الاخيرة') ||
    inst.includes('المحطة الأخيرة') ||
    inst.includes('اخر محطة') ||
    inst.includes('آخر محطة')
  ) {
    targetIndexToRemove = updatedStops.length - 1;
  }

  // إذا تم طلب حذف مكاني محدد بالرقم
  if (targetIndexToRemove !== null && targetIndexToRemove >= 0 && targetIndexToRemove < updatedStops.length) {
    if (
      inst.includes('شيل') ||
      inst.includes('احذف') ||
      inst.includes('إلغاء') ||
      inst.includes('امسح') ||
      inst.includes('بدل') ||
      inst.includes('غير') ||
      inst.includes('استبدل')
    ) {
      updatedStops.splice(targetIndexToRemove, 1);
    }
  }

  // 2. طلب حذف محطة بنوعها أو اسمها
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

  // 3. طلب تفضيل مكان أقرب للبحر أو قناة السويس (مثلاً: "شيل المكان التاني وحط مكان أقرب للبحر")
  const wantsSeaPlace =
    inst.includes('بحر') ||
    inst.includes('البحر') ||
    inst.includes('قناة') ||
    inst.includes('الممشى') ||
    inst.includes('الشاطئ') ||
    inst.includes('مائي');

  if (wantsSeaPlace && (inst.includes('حط') || inst.includes('ضيف') || inst.includes('بدل') || inst.includes('مكان أقرب') || inst.includes('مكان اقرب'))) {
    // الأماكن المطلة على البحر وقناة السويس
    const seaCandidates = INITIAL_PLACES.filter(
      (p) =>
        p.n.includes('ديليسبس') ||
        p.n.includes('كاستن') ||
        p.n.includes('الشاطئ') ||
        p.a === 'طرح البحر' ||
        p.a === 'الممشى السياحي'
    );
    const candidateToAdd = seaCandidates.find((c) => !updatedStops.some((s) => s.placeId === c.id));
    if (candidateToAdd) {
      const newStop = createStopFromPlace(
        candidateToAdd,
        updatedStops.length + 1,
        partySize,
        'إضافة مكان بإطلالة ساحرة ومباشرة على قناة السويس والبحر بناءً على طلبك.'
      );
      if (targetIndexToRemove !== null && targetIndexToRemove <= updatedStops.length) {
        updatedStops.splice(targetIndexToRemove, 0, newStop);
      } else {
        updatedStops.push(newStop);
      }
    }
  }

  // 4. طلب استبدال مكان بمكان آخر بالاسم
  if (inst.includes('بدل') || inst.includes('غير') || inst.includes('استبدل')) {
    if (inst.includes('الجندي')) {
      const gendy = INITIAL_PLACES.find((p) => p.n.includes('الجندي'));
      if (gendy) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? createStopFromPlace(gendy, s.order, partySize, 'استبدال لمطعم الجندي لتناول أسماك بلدية مميزة وأسعار اقتصادية تناسب ميزانيتكم.')
            : s
        );
      }
    } else if (inst.includes('سوق السمك')) {
      const market = INITIAL_PLACES.find((p) => p.n.includes('سوق السمك'));
      if (market) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? createStopFromPlace(market, s.order, partySize, 'استبدال لسوق السمك الحضاري لشراء واختيار الأسماك الطازجة وشيّها فوراً.')
            : s
        );
      }
    } else if (inst.includes('كاستن')) {
      const kasten = INITIAL_PLACES.find((p) => p.n.includes('كاستن'));
      if (kasten) {
        updatedStops = updatedStops.map((s) =>
          s.category === 'food' || s.category === 'shop'
            ? createStopFromPlace(kasten, s.order, partySize, 'استبدال لمطعم كاستن العريق لتجربة راقية بإطلالة على ممشى قناة السويس.')
            : s
        );
      }
    }
  }

  // 5. طلب إضافة تحلية أو كافيه أو مكان معين بالاسم
  if (inst.includes('ضيف') || inst.includes('حط') || inst.includes('عايز احلي') || inst.includes('كاساتا') || inst.includes('سيلفر')) {
    if (inst.includes('سيلفر') || inst.includes('كاساتا') || inst.includes('حلويات') || inst.includes('حلو') || inst.includes('تحلية')) {
      const hasSweets = updatedStops.some((s) => s.category === 'sweets');
      if (!hasSweets) {
        const sweetCandidate = INITIAL_PLACES.find((p) => p.cat === 'sweets' || p.n.includes('سامي سالم') || p.n.includes('لورد') || p.n.includes('سلسبيل'));
        if (sweetCandidate) {
          updatedStops.push(createStopFromPlace(sweetCandidate, updatedStops.length + 1, partySize, `إضافة محطة التحلية في "${sweetCandidate.n}" بناءً على رغبتك.`));
        }
      }
    } else if (inst.includes('كافيه') || inst.includes('قهوة') || inst.includes('المنارة')) {
      const hasCafe = updatedStops.some((s) => s.category === 'cafe');
      if (!hasCafe) {
        const cafe = INITIAL_PLACES.find((p) => p.cat === 'cafe');
        if (cafe) {
          updatedStops.push(createStopFromPlace(cafe, updatedStops.length + 1, partySize, `إضافة كافيه "${cafe.n}" للاسترخاء وقضاء وقت ممتع.`));
        }
      }
    } else {
      // فحص هل ذُكر اسم مكان محدد من INITIAL_PLACES
      for (const p of INITIAL_PLACES) {
        if (inst.includes(p.n.toLowerCase()) && !updatedStops.some((s) => s.placeId === p.id)) {
          updatedStops.push(createStopFromPlace(p, updatedStops.length + 1, partySize, `إضافة "${p.n}" إلى برنامج الخروجة بناءً على طلبك.`));
          break;
        }
      }
    }
  }

  // 6. طلب إعادة الترتيب وخلي أقرب مكان الأول ("غيّر ترتيب الأماكن وخلي أقرب مكان الأول")
  const wantsReorderNearest =
    inst.includes('أقرب مكان الأول') ||
    inst.includes('اقرب مكان الاول') ||
    inst.includes('خلي أقرب') ||
    inst.includes('خلي اقرب') ||
    inst.includes('رتب حسب الأقرب') ||
    inst.includes('رتب حسب الاقرب') ||
    inst.includes('ترتيب الأماكن');

  if (wantsReorderNearest && updatedStops.length > 2) {
    // الترتيب الجغرافي من نقطة مرجعية (أول محطة) لتقليل مسافات التنقل
    const refLat = updatedStops[0].lat;
    const refLon = updatedStops[0].lon;
    const first = updatedStops[0];
    const rest = updatedStops.slice(1).sort((a, b) => {
      const distA = calculateDistanceKm(refLat, refLon, a.lat, a.lon);
      const distB = calculateDistanceKm(refLat, refLon, b.lat, b.lon);
      return distA - distB;
    });
    updatedStops = [first, ...rest];
  }

  // 7. تعديل الميزانية إذا تم ذكر رقم جديد
  let newBudget = currentPlan.budgetEgp;
  const newBudgetMatch = inst.match(/(\d+)\s*(جنيه|جنية|ج\.م)/);
  if (newBudgetMatch && newBudgetMatch[1]) {
    const parsed = parseInt(newBudgetMatch[1], 10);
    if (parsed >= 50) newBudget = parsed;
  }

  // إعادة ترقيم المحطات بالتسلسل 1, 2, 3...
  updatedStops = updatedStops.map((s, idx) => ({ ...s, order: idx + 1 }));

  // إعادة حساب التكلفة الإجمالية
  const newTotalCost = updatedStops.reduce((sum, s) => sum + s.totalCost, 0);

  return {
    ...currentPlan,
    budgetEgp: newBudget,
    stops: updatedStops,
    totalCost: newTotalCost,
    budgetStatus: newTotalCost <= newBudget ? 'within' : 'exceeded',
  };
}
