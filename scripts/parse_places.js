const fs = require('fs');

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

const placesById = new Map();
const duplicates = [];

for (const [sheet, rows] of Object.entries(sheetsData)) {
  for (const row of rows) {
    const placeId = row[12]?.trim();
    const name = row[1]?.trim();
    if (!placeId) {
      console.warn(`Warning: Row without placeId in sheet ${sheet}:`, name);
      continue;
    }
    if (placesById.has(placeId)) {
      duplicates.push({
        placeId,
        name,
        sheet1: placesById.get(placeId).sheet,
        sheet2: sheet,
        row
      });
    } else {
      placesById.set(placeId, { sheet, name, row });
    }
  }
}

console.log('Total unique places (Place IDs):', placesById.size);
console.log('Total duplicate entries across sheets:', duplicates.length);
duplicates.forEach((d) => {
  console.log(`- Place ID: ${d.placeId} | "${d.name}" (first in: ${d.sheet1}, duplicate in: ${d.sheet2})`);
});
