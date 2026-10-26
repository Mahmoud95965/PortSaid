const fs = require('fs');

// We can load geoUtils boundary check
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

console.log('Testing Port Said point:', isPointInPortSaid(31.2640, 32.3025)); // حي الشرق
console.log('Testing Port Fouad point:', isPointInPortSaid(31.2450, 32.3210)); // بورفؤاد
console.log('Testing Cairo point:', isPointInPortSaid(30.0444, 31.2357)); // should be false
