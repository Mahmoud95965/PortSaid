const fs = require('fs');

const places = JSON.parse(fs.readFileSync('scripts/compiled_places.json', 'utf8'));
const constantsPath = 'src/lib/constants.ts';
let constantsCode = fs.readFileSync(constantsPath, 'utf8');

const marker = 'export const INITIAL_PLACES = [';
const markerIndex = constantsCode.indexOf(marker);

if (markerIndex === -1) {
  console.error('Could not find marker in constants.ts');
  process.exit(1);
}

const before = constantsCode.slice(0, markerIndex);
const newCode = before + `export const INITIAL_PLACES = ${JSON.stringify(places, null, 2)};\n`;

fs.writeFileSync(constantsPath, newCode, 'utf8');
console.log(`Successfully updated ${constantsPath} with ${places.length} real places!`);
