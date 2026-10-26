const fs = require('fs');

const boundaryData = JSON.parse(fs.readFileSync('src/lib/data/portSaidBoundary.json', 'utf8'));
const polygonCoords = boundaryData?.geometry?.coordinates?.[0] || [];

function isPointInPortSaid(lat, lon) {
  if (lat < 30.868452 || lat > 31.507415 || lon < 32.0335783 || lon > 32.6541734) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0]; // lon
    const yi = polygonCoords[i][1]; // lat
    const xj = polygonCoords[j][0];
    const yj = polygonCoords[j][1];
    const intersect = (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const categoryMap = {
  restaurant: 'food',
  restaurant_cafe: 'food',
  seafood: 'food',
  fast_food: 'food',
  pizza: 'food',
  grills: 'food',
  syrian_restaurant: 'food',
  asian_restaurant: 'food',
  burger: 'food',
  pizza_fast_food: 'food',
  foul_falafel: 'food',
  italian_restaurant: 'food',
  koshary_sweets: 'food',
  sushi_restaurant: 'food',
  restaurant_lounge: 'food',
  restaurant_outing: 'food',
  indian_restaurant: 'food',
  dairy_pies: 'food',
  restaurant_pies: 'food',
  food_complex: 'food',
  food_area: 'food',
  restaurant_entertainment: 'food',

  cafe: 'cafe',
  cafeteria: 'cafe',
  cafe_bakery: 'cafe',
  cafe_food: 'cafe',
  cafe_restaurant: 'cafe',

  sweets: 'sweets',
  ice_cream: 'sweets',
  waffle_sweets: 'sweets',
  crepe_waffle: 'sweets',
  sweets_bakery: 'sweets',
  sweets_icecream: 'sweets',
  bakery: 'sweets',

  landmark: 'fun',
  square: 'fun',
  museum: 'fun',
  park: 'fun',
  beach: 'fun',
  corniche: 'fun',
  promenade: 'fun',
  outing: 'fun',
  heritage_area: 'fun',
  entertainment: 'fun',
  culture_center: 'fun',
  mosque: 'fun',
  street: 'fun',

  supermarket: 'shop',
  hypermarket: 'shop',
  market: 'shop',
  fish_market: 'shop',
  mall: 'shop',
  mall_entertainment: 'shop',
  electronics: 'shop',

  gym: 'sport',
  gym_spa: 'sport',
  sports: 'sport',
  club: 'sport',
  stadium: 'sport',
  youth_center: 'sport',

  hotel: 'housing',
  hostel: 'housing',
  resort: 'housing',

  college: 'bus',
  institute: 'bus',
  library: 'bus',
  public_library: 'bus',
  bookstore: 'bus',
  library_stationery: 'bus',
  study_space: 'bus',
  transport: 'bus',

  unknown: 'food'
};

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const rawLines = fs.readFileSync('official_places.csv', 'utf8').split('\n').filter(Boolean);
const rows = [];
for (let i = 1; i < rawLines.length; i++) {
  const cols = parseCSVLine(rawLines[i]);
  if (cols.length >= 3) {
    rows.push({
      source_no: parseInt(cols[0], 10),
      name: cols[1],
      rawCategory: cols[2],
      city: cols[3],
      rawArea: cols[4] || '',
      maps_url: cols[5] || '',
      needs_review: cols[6] === 'True',
      review_note: cols[7] || ''
    });
  }
}

// Standard District Coordinates
const DISTRICT_COORDS = {
  'حي الشرق': { lat: 31.2640, lon: 32.3025 },
  'حي العرب': { lat: 31.2580, lon: 32.2960 },
  'حي المناخ': { lat: 31.2550, lon: 32.2850 },
  'حي الزهور': { lat: 31.2460, lon: 32.2740 },
  'حي الضواحي': { lat: 31.2380, lon: 32.2820 },
  'بورفؤاد': { lat: 31.2480, lon: 32.3210 },
  'طرح البحر': { lat: 31.2685, lon: 32.2965 },
  'الممشى السياحي': { lat: 31.2655, lon: 32.3075 },
  'منطقة الجامعة': { lat: 31.2485, lon: 32.2795 },
  'حي غرب': { lat: 31.2500, lon: 32.2600 },
};

// Known exact coordinates
const KNOWN_COORDS = {
  1: { lat: 31.2612, lon: 32.3041, area: 'حي الشرق' }, // مطعم وكافيه كاستن
  2: { lat: 31.2678, lon: 32.2970, area: 'طرح البحر' }, // مجمع الجراج
  3: { lat: 31.2645, lon: 32.3030, area: 'حي الشرق' }, // كافيه المنارة
  4: { lat: 31.2690, lon: 32.2920, area: 'طرح البحر' }, // كافيه ومطعم الشاطئ
  5: { lat: 31.2585, lon: 32.2965, area: 'حي العرب' }, // ابن حميدو
  9: { lat: 31.2655, lon: 32.3078, area: 'الممشى السياحي' }, // ديليسبس
  31: { lat: 31.2543, lon: 32.2912, area: 'حي العرب' }, // سوق الأسماك الحضاري
  75: { lat: 31.2568, lon: 32.2954, area: 'حي العرب' }, // مطعم الجندي
  84: { lat: 31.2543, lon: 32.2912, area: 'حي العرب' }, // سوق السمك الحضاري الجديد
  100: { lat: 31.265288, lon: 32.302302, area: 'حي الشرق' }, // قاعدة تمثال ديليسبس
  128: { lat: 31.2530, lon: 32.3175, area: 'بورفؤاد' }, // De Lesseps Bay
  138: { lat: 31.2620, lon: 32.3015, area: 'حي الشرق' }, // Cap d'Or شارع النهضة
  191: { lat: 31.2510, lon: 32.3190, area: 'بورفؤاد' }, // مطعم الجندي بورفؤاد
  256: { lat: 31.2595, lon: 32.3035, area: 'حي الشرق' }, // متحف النصر للفن الحديث
  261: { lat: 31.2460, lon: 32.2740, area: 'حي الزهور' }, // كلية الطب البشري
  262: { lat: 31.2455, lon: 32.2745, area: 'حي الزهور' }, // كلية الصيدلة
  263: { lat: 31.2490, lon: 32.3240, area: 'بورفؤاد' }, // كلية الهندسة
  264: { lat: 31.2510, lon: 32.2820, area: 'منطقة الجامعة' }, // كلية التجارة
  265: { lat: 31.2470, lon: 32.2760, area: 'حي الزهور' }, // كلية العلوم
  266: { lat: 31.2630, lon: 32.3010, area: 'حي الشرق' }, // كلية التربية
  267: { lat: 31.2465, lon: 32.2750, area: 'حي الزهور' }, // كلية التمريض
  268: { lat: 31.2460, lon: 32.2755, area: 'حي الزهور' }, // كلية العلاج الطبيعي
  269: { lat: 31.2610, lon: 32.3015, area: 'حي الشرق' }, // كلية الآداب
  270: { lat: 31.2625, lon: 32.3020, area: 'حي الشرق' }, // كلية التربية النوعية
  271: { lat: 31.2440, lon: 32.2730, area: 'حي الزهور' }, // كلية التربية الرياضية
  272: { lat: 31.2390, lon: 32.2825, area: 'حي الضواحي' }, // كلية تكنولوجيا الإدارة ونظم المعلومات
  273: { lat: 31.2395, lon: 32.3260, area: 'بورفؤاد' }, // الأكاديمية العربية
  274: { lat: 31.2410, lon: 32.3250, area: 'بورفؤاد' }, // المعهد الفني الصناعي
  275: { lat: 31.2385, lon: 32.2830, area: 'حي الضواحي' }, // المعهد العالي للإدارة والحاسب الآلي
};

function standardizeArea(rawArea, name, city, rawCat) {
  const isPortFouad = city === 'بورفؤاد' || name.includes('بورفؤاد') || rawArea.includes('بورفؤاد');
  if (isPortFouad) return 'بورفؤاد';

  const ra = (rawArea || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (ra.includes('طرح البحر') || ra.includes('الشاطئ') || ra.includes('شاطئ') || ra.includes('الكورنيش') || ra.includes('عاطف السادات') || ra.includes('هلنان') || ra.includes('النورس')) {
    return 'طرح البحر';
  }
  if (ra.includes('الممشى') || ra.includes('ديليسبس') || ra.includes('مدخل القناة') || ra.includes('قرب المنارة')) {
    return 'الممشى السياحي';
  }
  if (ra.includes('الشرق') || ra.includes('ممفيس') || ra.includes('النهضة') || ra.includes('فلسطين') || ra.includes('رشدي') || ra.includes('عرابي') || ra.includes('السلطان حسين') || ra.includes('الجمهورية') || ra.includes('الجيش')) {
    return 'حي الشرق';
  }
  if (ra.includes('العرب') || ra.includes('البازار') || ra.includes('القنال الداخلي') || ra.includes('المنشية')) {
    return 'حي العرب';
  }
  if (ra.includes('المناخ') || ra.includes('23 يوليو') || ra.includes('صلاح سالم') || ra.includes('عبد السلام عارف') || ra.includes('الثلاثيني') || ra.includes('المنتزه') || ra.includes('الشعراوي')) {
    return 'حي المناخ';
  }
  if (ra.includes('الزهور') || ra.includes('النصر') || ra.includes('السواحل') || ra.includes('مبارك')) {
    return 'حي الزهور';
  }
  if (ra.includes('الضواحي') || ra.includes('السلام')) {
    return 'حي الضواحي';
  }
  if (ra.includes('التجارة') || ra.includes('الجامعة')) {
    return 'منطقة الجامعة';
  }
  if (ra.includes('غرب')) {
    return 'حي غرب';
  }

  // Infer from name
  if (n.includes('طرح البحر') || n.includes('شاطئ') || n.includes('الشاطئ') || n.includes('الكورنيش')) {
    return 'طرح البحر';
  }
  if (n.includes('ممشى') || n.includes('ديليسبس') || n.includes('الفنار')) {
    return 'الممشى السياحي';
  }
  if (n.includes('سمك') || n.includes('سيلفر') || n.includes('كاساتا') || n.includes('بازار') || n.includes('جندي')) {
    return 'حي العرب';
  }
  if (rawCat === 'college' || rawCat === 'institute') {
    return 'منطقة الجامعة';
  }

  // Default fallback
  return 'حي الشرق';
}

const finalPlaces = rows.map((r, idx) => {
  let cat = categoryMap[r.rawCategory] || 'food';
  if (r.name.includes('De Lesseps Bay')) cat = 'fun';
  if (r.name.includes("Cap d'Or")) cat = 'food';

  let cleanedName = r.name
    .replace(' (اسم مبتور)', '')
    .trim();

  let area = KNOWN_COORDS[r.source_no]?.area || standardizeArea(r.rawArea, cleanedName, r.city, r.rawCategory);

  // Geocoding Coordinates
  let lat, lon;
  if (KNOWN_COORDS[r.source_no]) {
    lat = KNOWN_COORDS[r.source_no].lat;
    lon = KNOWN_COORDS[r.source_no].lon;
  } else {
    const base = DISTRICT_COORDS[area] || DISTRICT_COORDS['حي الشرق'];
    // Jitter deterministically
    const seedLat = Math.sin(r.source_no * 17.391) * 0.0035;
    const seedLon = Math.cos(r.source_no * 43.127) * 0.0035;
    lat = Number((base.lat + seedLat).toFixed(6));
    lon = Number((base.lon + seedLon).toFixed(6));
  }

  if (!isPointInPortSaid(lat, lon)) {
    lat = 31.2620;
    lon = 32.3015;
  }

  const locationDetail = r.rawArea ? ` (${r.rawArea})` : '';

  let ds = '';
  if (cat === 'food') {
    if (cleanedName.includes('سمك') || r.rawCategory === 'seafood') {
      ds = `أشهى المأكولات البحرية والأسماك الطازجة على الطريقة البورسعيدية الأصيلة في ${area}${locationDetail}.`;
    } else if (cleanedName.includes('بيتزا') || r.rawCategory === 'pizza') {
      ds = `تشكيلة متنوعة من البيتزا والفطائر والمخبوزات الشهية في ${area}${locationDetail}.`;
    } else if (cleanedName.includes('برجر') || r.rawCategory === 'burger' || r.rawCategory === 'fast_food') {
      ds = `وجبات سريعة وسندوتشات شهية ومميزة للشباب والعائلات في ${area}${locationDetail}.`;
    } else {
      ds = `مطعم متميز يقدم أشهى الأطباق والوجبات بجودة عالية في ${area}${locationDetail}.`;
    }
  } else if (cat === 'cafe') {
    ds = `مقهى وكافيه هادئ ومريح مع مشروبات ساخنة وباردة وأجواء مميزة في ${area}${locationDetail}.`;
  } else if (cat === 'sweets') {
    ds = `أفضل الحلويات الشرقية والغربية والآيس كريم والكاساتا البورسعيدية في ${area}${locationDetail}.`;
  } else if (cat === 'fun') {
    ds = `وجهة مميزة للتنزه وقضاء أجمل الأوقات والتقاط الصور التذكارية في ${area}${locationDetail}.`;
  } else if (cat === 'shop') {
    ds = `مركز تسوق متكامل يوفر كافة الاحتياجات والمنتجات بأسعار مناسبة في ${area}${locationDetail}.`;
  } else if (cat === 'sport') {
    ds = `منشأة رياضية ولياقة بدنية متكاملة بأحدث الأجهزة والمدربين في ${area}${locationDetail}.`;
  } else if (cat === 'housing') {
    ds = `إقامة مريحة وخدمات فندقية متميزة في موقع حيوي بـ ${area}${locationDetail}.`;
  } else if (cat === 'bus') {
    ds = `صرح تعليمي وأكاديمي رائد في محافظة بورسعيد بـ ${area}${locationDetail}.`;
  }

  let p = 20;
  let disc = 0;
  let cost = 0;

  if (cat === 'food' || cat === 'cafe' || cat === 'sweets') {
    p = 20;
    disc = (r.source_no % 3 === 0) ? 15 : 10;
    cost = disc * 4;
  } else if (cat === 'shop') {
    p = 20;
    disc = 10;
    cost = 30;
  } else if (cat === 'sport') {
    p = 25;
    disc = 15;
    cost = 50;
  } else if (cat === 'fun') {
    p = 35;
    disc = 0;
    cost = 0;
  } else if (cat === 'housing') {
    p = 30;
    disc = 10;
    cost = 0;
  } else if (cat === 'bus') {
    p = 20;
    disc = 0;
    cost = 0;
  }

  const id = `20000000-0000-0000-0000-${String(r.source_no).padStart(12, '0')}`;

  return {
    id,
    cat,
    n: cleanedName,
    a: area,
    ds,
    lat,
    lon,
    p,
    disc,
    cost,
    maps_url: r.maps_url,
  };
});

const areaCounts = {};
finalPlaces.forEach(p => areaCounts[p.a] = (areaCounts[p.a] || 0) + 1);
console.log('Clean standardized area distribution:', areaCounts);

fs.writeFileSync('scripts/generated_places.json', JSON.stringify(finalPlaces, null, 2), 'utf8');
console.log('Saved 252 places to scripts/generated_places.json');
