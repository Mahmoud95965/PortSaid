const fs = require('fs');
const crypto = require('crypto');

function placeIdToUuid(placeId) {
  const hash = crypto.createHash('md5').update('portsaid_place:' + placeId).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

const raw = fs.readFileSync('scripts/raw_user_places.csv', 'utf8');
const lines = raw.split(/\r?\n/);

let currentSheet = null;
const sheetsData = {};

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (trimmed.startsWith('# SHEET:')) {
    currentSheet = trimmed.replace('# SHEET:', '').trim();
    sheetsData[currentSheet] = [];
    continue;
  }
  if (trimmed.startsWith('م,الاسم,')) continue;
  
  const row = parseCsvLine(line);
  if (row && row[0] && /^\d+$/.test(row[0].trim())) {
    sheetsData[currentSheet].push(row);
  }
}

function normalizeArea(rawArea) {
  const a = (rawArea || '').trim();
  if (a.includes('الشرق')) return 'حي الشرق';
  if (a.includes('العرب')) return 'حي العرب';
  if (a.includes('المناخ')) return 'حي المناخ';
  if (a.includes('الزهور')) return 'حي الزهور';
  if (a.includes('بورفؤاد') || a.includes('بور فؤاد')) return 'بورفؤاد';
  if (a.includes('الضواحي')) return 'حي الضواحي';
  if (a.includes('الجنوب') || a.includes('أشتوم')) return 'حي الجنوب';
  return 'حي الشرق';
}

function determineCategory(sheet, typeAr, name) {
  if (sheet === 'مطاعم') return 'food';
  if (sheet === 'كافيهات ومشروبات') return 'cafe';
  if (sheet === 'حلويات ومخابز') return 'sweets';
  if (sheet === 'ملابس وأحذية') return 'clothes';
  if (sheet === 'محلات ومولات') return 'shop';
  if (sheet === 'جيمات') return 'sport';
  
  if (sheet === 'ترفيه وأنشطة') {
    if (typeAr.includes('بادل') || typeAr.includes('رياضي') || typeAr.includes('ملاعب') || name.includes('بادل') || name.includes('نادي بورفؤاد الرياضي')) {
      return 'sport';
    }
    return 'fun';
  }
  
  if (sheet === 'مزارات وفنادق') {
    if (typeAr.includes('فندق') || typeAr.includes('منتجع') || name.includes('فندق') || name.includes('Resort') || name.includes('اكوابارك')) {
      return 'hotels';
    }
    return 'fun';
  }
  
  if (sheet === 'الجراج') {
    if (name === 'الجراج' || typeAr.startsWith('مول')) return 'shop';
    if (name.includes('كافيه')) return 'cafe';
    return 'food';
  }
  
  return 'food';
}

const placesMap = new Map();

function processRow(sheet, row) {
  const name = row[1]?.trim() || '';
  const typeAr = row[2]?.trim() || '';
  const rawArea = row[3]?.trim() || '';
  const detailedAddress = row[4]?.trim() || '';
  const rating = parseFloat(row[5]) || 0;
  const reviewsCount = parseInt(row[6], 10) || 0;
  const rawPhone = row[7]?.trim() || '';
  const phone = (rawPhone === 'غير متوفر على جوجل' || !rawPhone) ? '' : rawPhone;
  const hours = row[8]?.trim() || 'غير متوفر';
  const lat = parseFloat(row[9]) || 31.2653;
  const lon = parseFloat(row[10]) || 32.3019;
  const mapsUrl = row[11]?.trim() || '';
  const placeId = row[12]?.trim() || '';
  const statusRaw = row[13]?.trim() || '';
  const notes = row[14]?.trim() || '';
  const garageRelation = row[15]?.trim() || '';

  if (!placeId) return;

  const area = normalizeArea(rawArea);
  const cat = determineCategory(sheet, typeAr, name);

  let status = 'active';
  let statusNote = '';
  if (statusRaw.includes('مغلق مؤقتًا') || statusRaw.includes('مغلق مؤقتا')) {
    status = 'active';
    statusNote = 'مغلق مؤقتاً للتطوير';
  } else if (statusRaw.includes('قد يكون مغلقًا') || statusRaw.includes('قد يكون مغلقا')) {
    status = 'active';
    statusNote = 'قد يكون مغلقاً (حسب جوجل)';
  }

  const inGarage = sheet === 'الجراج' && (garageRelation === 'جوه الجراج' || !garageRelation);

  let dsParts = [];
  if (typeAr) dsParts.push(typeAr);
  if (detailedAddress) dsParts.push(`في ${detailedAddress}`);
  if (rating > 0) dsParts.push(`تقييم ${rating}★ على جوجل (${reviewsCount.toLocaleString('ar-EG')} تقييم)`);
  if (hours && hours !== 'غير متوفر') dsParts.push(`مواعيد العمل: ${hours}`);
  if (notes) dsParts.push(notes);
  if (statusNote) dsParts.push(`[ملاحظة: ${statusNote}]`);
  
  const ds = dsParts.join(' · ');

  let p = 20;
  let disc = 10;
  let cost = 40;

  if (cat === 'fun') {
    p = 25;
    disc = 0;
    cost = 0;
    if (typeAr.includes('ملاهي') || typeAr.includes('سينما') || typeAr.includes('بلايستيشن')) {
      disc = 15;
      cost = 50;
    }
  } else if (cat === 'food' || cat === 'cafe') {
    p = 20;
    disc = 10;
    cost = 40;
  } else if (cat === 'sweets') {
    p = 20;
    disc = 10;
    cost = 35;
  } else if (cat === 'clothes') {
    p = 20;
    disc = 15;
    cost = 50;
  } else if (cat === 'shop') {
    p = 20;
    disc = 10;
    cost = 40;
  } else if (cat === 'sport') {
    p = 25;
    disc = 15;
    cost = 50;
  } else if (cat === 'hotels') {
    p = 30;
    disc = 10;
    cost = 60;
  }

  const deterministicUuid = placeIdToUuid(placeId);

  const placeObj = {
    id: deterministicUuid,
    cat,
    n: name,
    a: area,
    ds,
    lat,
    lon,
    p,
    disc,
    cost,
    maps_url: mapsUrl,
    phone,
    hours,
    rating,
    reviews_count: reviewsCount,
    address: detailedAddress,
    type_ar: typeAr,
    place_id: placeId,
    status,
    status_note: statusNote,
    notes,
    in_garage: inGarage,
    garage_relation: garageRelation,
  };

  return placeObj;
}

const sheetOrder = [
  'مطاعم',
  'كافيهات ومشروبات',
  'حلويات ومخابز',
  'ملابس وأحذية',
  'محلات ومولات',
  'جيمات',
  'ترفيه وأنشطة',
  'مزارات وفنادق',
  'الجراج',
];

for (const sheet of sheetOrder) {
  const rows = sheetsData[sheet] || [];
  for (const row of rows) {
    const place = processRow(sheet, row);
    if (!place) continue;

    if (placesMap.has(place.place_id)) {
      const existing = placesMap.get(place.place_id);
      if (sheet === 'الجراج') {
        const garageRel = row[15]?.trim();
        if (garageRel) existing.garage_relation = garageRel;
        if (garageRel === 'جوه الجراج' || !garageRel) existing.in_garage = true;
      }
    } else {
      placesMap.set(place.place_id, place);
    }
  }
}

const allPlaces = Array.from(placesMap.values());
console.log('Total places compiled:', allPlaces.length);

fs.writeFileSync('scripts/compiled_places.json', JSON.stringify(allPlaces, null, 2), 'utf8');
fs.writeFileSync('scripts/enriched_places.json', JSON.stringify(allPlaces, null, 2), 'utf8');
fs.writeFileSync('scripts/generated_places.json', JSON.stringify(allPlaces, null, 2), 'utf8');
console.log('Saved compiled_places.json, enriched_places.json, and generated_places.json successfully.');
