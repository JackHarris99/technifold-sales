const fs = require('fs');
const csv = require('csv-parse/sync');

console.log('=================================');
console.log('CSV CROSS-REFERENCE ANALYSIS');
console.log('=================================\n');

// Read all CSVs
const productsData = fs.readFileSync('../Product_Sales_Summary.csv 05-08-2025.csv', 'utf-8');
const products = csv.parse(productsData, { columns: true, skip_empty_lines: true, bom: true });

const customerToolData = fs.readFileSync('../Customer_to_Tool_Mapping.csv', 'utf-8');
const customerTools = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });

const customersData = fs.readFileSync('../all technifold customers sage.csv', 'utf-8');
const customers = csv.parse(customersData, { columns: true, skip_empty_lines: true });

let manufacturerData = fs.readFileSync('../FINAL tool to manufacturer to details link.csv', 'utf-8');
if (manufacturerData.charCodeAt(0) === 0xFEFF) manufacturerData = manufacturerData.slice(1);
const manufacturers = csv.parse(manufacturerData, { columns: true, skip_empty_lines: true });

// Get all product codes from products CSV
const productCodes = new Set(products.map(p => p.product_code));
console.log('📦 PRODUCTS CSV:');
console.log('Total products:', products.length);
console.log('Unique product codes:', productCodes.size);

// Analyze product groups
const groups = {};
products.forEach(p => {
  const group = p.product_group || 'EMPTY';
  groups[group] = (groups[group] || 0) + 1;
});
console.log('Product groups:', groups);

// Get all customer codes
const customerCodes = new Set(customers.map(c => c.customer_code));
console.log('\n👥 CUSTOMERS CSV:');
console.log('Total customers:', customers.length);
console.log('Unique customer codes:', customerCodes.size);

// Analyze Customer_to_Tool_Mapping
console.log('\n🔗 CUSTOMER_TO_TOOL_MAPPING CSV:');
console.log('Total mappings:', customerTools.length);

const toolsInMapping = new Set();
const customersInMapping = new Set();
customerTools.forEach(m => {
  toolsInMapping.add(m.tool_code);
  customersInMapping.add(m.customer_code);
});

console.log('Unique tools referenced:', toolsInMapping.size);
console.log('Unique customers referenced:', customersInMapping.size);

// Check which tools in mapping exist in products
const toolsNotInProducts = [...toolsInMapping].filter(t => !productCodes.has(t));
console.log('\n❌ Tools in mapping NOT in products CSV:', toolsNotInProducts.length);
if (toolsNotInProducts.length > 0 && toolsNotInProducts.length <= 50) {
  console.log('Missing tools:', toolsNotInProducts);
}

// Check which customers in mapping exist in customers CSV
const customersNotInFile = [...customersInMapping].filter(c => !customerCodes.has(c));
console.log('❌ Customers in mapping NOT in customers CSV:', customersNotInFile.length);

// Analyze manufacturer CSV
console.log('\n🏭 MANUFACTURER DETAILS CSV:');
console.log('Total records:', manufacturers.length);

const toolsInManufacturer = new Set();
manufacturers.forEach(m => {
  const code = m.product_code?.trim();
  if (code) toolsInManufacturer.add(code);
});

console.log('Unique tools referenced:', toolsInManufacturer.size);

const manufacturerToolsNotInProducts = [...toolsInManufacturer].filter(t => !productCodes.has(t));
console.log('❌ Tools in manufacturer CSV NOT in products CSV:', manufacturerToolsNotInProducts.length);
if (manufacturerToolsNotInProducts.length > 0 && manufacturerToolsNotInProducts.length <= 50) {
  console.log('Missing tools:', manufacturerToolsNotInProducts);
}

// Summary
console.log('\n=================================');
console.log('🎯 SUMMARY - WHY IMPORTS ARE FAILING:');
console.log('=================================');

const customerToolSuccess = customerTools.filter(m => 
  productCodes.has(m.tool_code) && customerCodes.has(m.customer_code)
).length;

const manufacturerSuccess = manufacturers.filter(m => 
  productCodes.has(m.product_code?.trim())
).length;

console.log('\nCustomer-Tool Mappings:');
console.log(`  Can import: ${customerToolSuccess}/${customerTools.length} (${(customerToolSuccess/customerTools.length*100).toFixed(1)}%)`);
console.log(`  Failed: ${toolsNotInProducts.length} tools don't exist in products`);
console.log(`  Failed: ${customersNotInFile.length} customers don't exist`);

console.log('\nManufacturer Details:');
console.log(`  Can import: ${manufacturerSuccess}/${manufacturers.length} (${(manufacturerSuccess/manufacturers.length*100).toFixed(1)}%)`);
console.log(`  Failed: ${manufacturerToolsNotInProducts.length} tools don't exist in products`);

if (groups.EMPTY > 0) {
  console.log('\n⚠️  ALSO: ' + groups.EMPTY + ' products have EMPTY product_group which may cause import issues!');
}