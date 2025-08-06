const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=================================');
  console.log('CUSTOMER-TOOL MAPPING ANALYSIS');
  console.log('=================================\n');

  // Read the Customer_to_Tool_Mapping CSV
  const csvData = fs.readFileSync('../Customer_to_Tool_Mapping.csv', 'utf-8');
  const mappings = csv.parse(csvData, { columns: true, skip_empty_lines: true });
  
  console.log('Total mappings in CSV:', mappings.length);
  
  // Get unique customers and tools from CSV
  const csvCustomers = new Set();
  const csvTools = new Set();
  mappings.forEach(m => {
    csvCustomers.add(m.customer_code);
    csvTools.add(m.tool_code);
  });
  
  console.log('Unique customers in CSV:', csvCustomers.size);
  console.log('Unique tools in CSV:', csvTools.size);
  
  // Get all customers from database
  const { data: dbCustomers } = await supabase
    .from('customers')
    .select('customer_code')
    .limit(5000);
  const dbCustomerCodes = new Set(dbCustomers?.map(c => c.customer_code) || []);
  
  // Get all products from database
  const { data: dbProducts } = await supabase
    .from('products')
    .select('product_code')
    .limit(5000);
  const dbProductCodes = new Set(dbProducts?.map(p => p.product_code) || []);
  
  console.log('\nDatabase status:');
  console.log('Customers in database:', dbCustomerCodes.size);
  console.log('Products in database:', dbProductCodes.size);
  
  // Check how many mappings can be imported
  let canImport = 0;
  let missingCustomer = 0;
  let missingTool = 0;
  let missingBoth = 0;
  const missingToolCodes = new Set();
  const missingCustomerCodes = new Set();
  
  mappings.forEach(m => {
    const hasCustomer = dbCustomerCodes.has(m.customer_code);
    const hasTool = dbProductCodes.has(m.tool_code);
    
    if (hasCustomer && hasTool) {
      canImport++;
    } else if (!hasCustomer && !hasTool) {
      missingBoth++;
      missingCustomerCodes.add(m.customer_code);
      missingToolCodes.add(m.tool_code);
    } else if (!hasCustomer) {
      missingCustomer++;
      missingCustomerCodes.add(m.customer_code);
    } else {
      missingTool++;
      missingToolCodes.add(m.tool_code);
    }
  });
  
  console.log('\n🔍 IMPORT ANALYSIS:');
  console.log('Can import:', canImport, `(${(canImport/mappings.length*100).toFixed(1)}%)`);
  console.log('Cannot import - missing customer:', missingCustomer);
  console.log('Cannot import - missing tool:', missingTool);
  console.log('Cannot import - missing both:', missingBoth);
  
  console.log('\n🚨 ROOT CAUSE:');
  console.log(`${missingToolCodes.size} tool codes in CSV don't exist in products table`);
  console.log(`${missingCustomerCodes.size} customer codes in CSV don't exist in customers table`);
  
  if (missingToolCodes.size > 0) {
    console.log('\nFirst 20 missing tool codes:');
    [...missingToolCodes].slice(0, 20).forEach(code => console.log('  -', code));
  }
  
  // Check actual imported count
  const { count } = await supabase
    .from('customer_tool')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n✅ Actually imported to database:', count);
  console.log('Expected based on analysis:', canImport);
  
})().catch(console.error);