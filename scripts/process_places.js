const fs = require('fs');

function parseCSV(content) {
  const lines = content.split('\n').filter(Boolean);
  const rows = [];
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
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 3) {
      rows.push({
        source_no: parseInt(cols[0], 10),
        name: cols[1],
        category: cols[2],
        city: cols[3],
        area: cols[4] || '',
        maps_url: cols[5] || '',
        needs_review: cols[6] === 'True',
        review_note: cols[7] || ''
      });
    }
  }
  return rows;
}

const raw = fs.readFileSync('official_places.csv', 'utf8');
const rows = parseCSV(raw);

console.log('Total rows parsed:', rows.length);
// Check for duplicates or review notes
const reviewNeeded = rows.filter(r => r.needs_review);
console.log('Needs review count:', reviewNeeded.length);
reviewNeeded.forEach(r => console.log(`[${r.source_no}] ${r.name} (${r.category}) -> ${r.review_note}`));
