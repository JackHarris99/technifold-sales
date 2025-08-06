const csv = require('csv-parse/sync');
const fs = require('fs');

const data = fs.readFileSync('../Product_Sales_Summary.csv 05-08-2025.csv', 'utf-8');
const products = csv.parse(data, { columns: true, skip_empty_lines: true });

const groups = {};
products.forEach(p => {
  const group = p.product_group || 'EMPTY';
  groups[group] = (groups[group] || 0) + 1;
});

console.log('Product groups in CSV:');
Object.entries(groups).forEach(([group, count]) => {
  console.log('  ' + group + ': ' + count);
});

// Check if any are not Tool or Consumable
const other = products.filter(p => p.product_group !== 'Tool' && p.product_group !== 'Consumable');
console.log('\nNon Tool/Consumable entries:', other.length);
if (other.length > 0) {
  console.log('First 10:', other.slice(0, 10).map(p => p.product_code + ' (' + p.product_group + ')'));
}