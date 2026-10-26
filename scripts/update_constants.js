const fs = require('fs');

const enriched = JSON.parse(fs.readFileSync('scripts/enriched_places.json', 'utf8'));
const constantsPath = 'src/lib/constants.ts';
let constantsCode = fs.readFileSync(constantsPath, 'utf8');

const marker = 'export const INITIAL_PLACES = [';
const markerIndex = constantsCode.indexOf(marker);

if (markerIndex === -1) {
  console.error('Could not find INITIAL_PLACES in constants.ts');
  process.exit(1);
}

const before = constantsCode.slice(0, markerIndex);

const placesCode = `export const INITIAL_PLACES = ${JSON.stringify(enriched, null, 2)};\n`;

const newConstantsCode = before + placesCode;
fs.writeFileSync(constantsPath, newConstantsCode, 'utf8');
console.log('Successfully updated src/lib/constants.ts with 252 official places!');
