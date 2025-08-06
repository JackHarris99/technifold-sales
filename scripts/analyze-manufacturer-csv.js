const fs = require('fs');
const csv = require('csv-parse/sync');

let csvData = fs.readFileSync('../../FINAL tool to manufacturer to details link.csv', 'utf-8');
if (csvData.charCodeAt(0) === 0xFEFF) csvData = csvData.slice(1);

const records = csv.parse(csvData, { columns: true, skip_empty_lines: true });
console.log('Total CSV records parsed:', records.length);

// Check for duplicates
const uniqueKeys = new Set();
const duplicates = [];
const seenKeys = new Map();

records.forEach((r, idx) => {
  const key = `${r.product_code}-${r.manufacturer}-${r.detail}`;
  if (seenKeys.has(key)) {
    duplicates.push({ 
      row: idx + 2, 
      product_code: r.product_code,
      manufacturer: r.manufacturer,
      detail: r.detail,
      firstSeen: seenKeys.get(key)
    });
  } else {
    uniqueKeys.add(key);
    seenKeys.set(key, idx + 2);
  }
});

console.log('Unique combinations:', uniqueKeys.size);
console.log('Duplicate rows found:', duplicates.length);

if (duplicates.length > 0) {
  console.log('\nFirst 10 duplicates:');
  duplicates.slice(0, 10).forEach(d => {
    console.log(`  Row ${d.row}: ${d.product_code} - ${d.manufacturer} - ${d.detail} (first seen row ${d.firstSeen})`);
  });
}

// Check for missing fields
let missingProduct = 0;
let missingManufacturer = 0;
let missingDetail = 0;
const rowsWithMissingData = [];

records.forEach((r, idx) => {
  let hasMissing = false;
  if (!r.product_code || !r.product_code.trim()) {
    missingProduct++;
    hasMissing = true;
  }
  if (!r.manufacturer || !r.manufacturer.trim()) {
    missingManufacturer++;
    hasMissing = true;
  }
  if (!r.detail || !r.detail.trim()) {
    missingDetail++;
    hasMissing = true;
  }
  if (hasMissing && rowsWithMissingData.length < 10) {
    rowsWithMissingData.push({
      row: idx + 2,
      product_code: r.product_code || '(missing)',
      manufacturer: r.manufacturer || '(missing)',
      detail: r.detail || '(missing)'
    });
  }
});

console.log('\nRows with missing data:');
console.log('  Missing product_code:', missingProduct);
console.log('  Missing manufacturer:', missingManufacturer);
console.log('  Missing detail:', missingDetail);

if (rowsWithMissingData.length > 0) {
  console.log('\nFirst rows with missing data:');
  rowsWithMissingData.forEach(r => {
    console.log(`  Row ${r.row}: ${r.product_code} - ${r.manufacturer} - ${r.detail}`);
  });
}

// Check what our script would actually import
const wouldImport = records.filter(r => 
  r.product_code && r.product_code.trim() &&
  r.manufacturer && r.manufacturer.trim() &&
  r.detail && r.detail.trim()
);

console.log('\n=================================');
console.log('IMPORT ANALYSIS:');
console.log('Total rows in CSV:', records.length);
console.log('Rows with complete data:', wouldImport.length);
console.log('After removing duplicates:', uniqueKeys.size);
console.log('=================================');