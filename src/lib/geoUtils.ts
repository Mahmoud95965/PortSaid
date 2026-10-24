import boundaryData from './data/portSaidBoundary.json';

// النطاق الجغرافي الإداري المعتمد لمحافظة بورسعيد (OpenStreetMap Relation 4103406)
export const PORT_SAID_BOUNDS = {
  // الحد الغربي والشرقي (Longitude)
  minLng: 32.0335783,
  maxLng: 32.6541734,
  // الحد الجنوبي والشمالي (Latitude)
  minLat: 30.868452,
  maxLat: 31.507415,
};

// مركز مدينة بورسعيد وبورفؤاد (Port Said Center - City & Canal)
export const PORT_SAID_CENTER: [number, number] = [32.3019, 31.2653]; // [Longitude, Latitude] for MapLibre

// الحدود القصوى لحركة الخريطة لمنع السحب خارج المحافظة (Max Bounds for MapLibre)
export const PORT_SAID_MAX_BOUNDS: [[number, number], [number, number]] = [
  [32.03, 30.86], // جنوب غرب [minLng, minLat]
  [32.66, 31.51], // شمال شرق [maxLng, maxLat]
];

// استخراج مضلع الحدود الرسمية
const polygonCoords: [number, number][] =
  boundaryData?.geometry?.coordinates?.[0] as [number, number][] || [];

/**
 * خوارزمية Ray-Casting لفحص وقوع النقطة داخل مضلع الحدود الإدارية المعتمدة لبورسعيد
 */
export function isPointInPortSaid(lat: number, lon: number): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return false;
  }

  // فحص المستطيل المحيط أولاً للسرعة
  if (
    lat < PORT_SAID_BOUNDS.minLat ||
    lat > PORT_SAID_BOUNDS.maxLat ||
    lon < PORT_SAID_BOUNDS.minLng ||
    lon > PORT_SAID_BOUNDS.maxLng
  ) {
    return false;
  }

  // إذا كانت مصفوفة المضلع متوفرة، نفحص بالمضلع الدقيق
  if (polygonCoords && polygonCoords.length > 2) {
    let inside = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = polygonCoords[i][0]; // lon
      const yi = polygonCoords[i][1]; // lat
      const xj = polygonCoords[j][0]; // lon
      const yj = polygonCoords[j][1]; // lat

      const intersect =
        yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  return true;
}

/**
 * حساب المسافة بين نقطتين بالكيلومتر عبر Haversine Formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}
