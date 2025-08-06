const fs = require('fs');
const csv = require('csv-parse/sync');

const csvPath = '../Product_Sales_Summary.csv 05-08-2025.csv';
const csvData = fs.readFileSync(csvPath, 'utf-8');

// Parse with proper CSV parser
const records = csv.parse(csvData, { 
  columns: true, 
  skip_empty_lines: true,
  bom: true 
});

console.log('Total records in CSV:', records.length);

// Check for empty product_group
let emptyGroups = [];
let hasGroup = { Tool: 0, Consumable: 0, Parts: 0, Other: 0 };

records.forEach((r, idx) => {
  const group = r.product_group?.trim();
  
  if (!group || group === '') {
    emptyGroups.push({
      index: idx + 1,
      code: r.product_code,
      description: r.description?.substring(0, 40)
    });
  } else if (group === 'Tool') {
    hasGroup.Tool++;
  } else if (group === 'Consumable') {
    hasGroup.Consumable++;
  } else if (group === 'Parts') {
    hasGroup.Parts++;
  } else {
    hasGroup.Other++;
  }
});

console.log('\nProduct groups in CSV:');
console.log('  Tools:', hasGroup.Tool);
console.log('  Consumables:', hasGroup.Consumable);
console.log('  Parts:', hasGroup.Parts);
console.log('  Other:', hasGroup.Other);
console.log('  Empty/Missing:', emptyGroups.length);

if (emptyGroups.length > 0) {
  console.log('\nFirst 10 products with EMPTY product_group:');
  emptyGroups.slice(0, 10).forEach(p => {
    console.log(`  Line ${p.index}: ${p.code} - ${p.description}`);
  });
  
  // Check if these are the missing 444
  console.log('\n🚨 These', emptyGroups.length, 'products with empty groups are likely why import is failing!');
}