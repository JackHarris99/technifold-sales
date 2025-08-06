const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateAllData() {
  console.log('🔍 COMPREHENSIVE DATA VALIDATION REPORT');
  console.log('=' .repeat(60));
  console.log('Generated:', new Date().toISOString());
  console.log('=' .repeat(60) + '\n');

  const report = {
    timestamp: new Date().toISOString(),
    csvData: {},
    databaseData: {},
    validationErrors: [],
    missingData: [],
    dataIntegrity: {}
  };

  // ======================================
  // 1. VALIDATE PRODUCTS
  // ======================================
  console.log('📦 VALIDATING PRODUCTS...\n');
  
  // Read CSV
  const productsPath = path.join(__dirname, '../../Product_Sales_Summary.csv 05-08-2025.csv');
  const productsData = fs.readFileSync(productsPath, 'utf-8');
  const productsCSV = csv.parse(productsData, { columns: true, skip_empty_lines: true });
  
  report.csvData.products = {
    total: productsCSV.length,
    tools: productsCSV.filter(p => p.product_group === 'Tool').length,
    consumables: productsCSV.filter(p => p.product_group === 'Consumable').length,
    other: productsCSV.filter(p => !['Tool', 'Consumable'].includes(p.product_group)).length
  };

  // Check database - need to handle pagination
  const { count: dbProductCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // Fetch all products in batches
  let allDbProducts = [];
  const batchSize = 1000;
  for (let offset = 0; offset < dbProductCount; offset += batchSize) {
    const { data: batch } = await supabase
      .from('products')
      .select('*')
      .range(offset, offset + batchSize - 1);
    if (batch) allDbProducts = allDbProducts.concat(batch);
  }

  const dbProducts = allDbProducts;

  report.databaseData.products = {
    total: dbProductCount,
    tools: dbProducts.filter(p => p.product_group === 'Tool').length,
    consumables: dbProducts.filter(p => p.product_group === 'Consumable').length
  };

  // Find missing products
  const csvProductCodes = new Set(productsCSV.map(p => p.product_code));
  const dbProductCodes = new Set(dbProducts.map(p => p.product_code));
  const missingProducts = [...csvProductCodes].filter(code => !dbProductCodes.has(code));

  if (missingProducts.length > 0) {
    report.missingData.push({
      type: 'products',
      count: missingProducts.length,
      samples: missingProducts.slice(0, 10),
      severity: 'HIGH'
    });
  }

  console.log(`✅ Products: ${dbProductCount}/${productsCSV.length} (${((dbProductCount/productsCSV.length)*100).toFixed(1)}% imported)`);
  if (missingProducts.length > 0) {
    console.log(`⚠️  Missing ${missingProducts.length} products from database`);
  }

  // ======================================
  // 2. VALIDATE TOOL-MANUFACTURER DETAILS
  // ======================================
  console.log('\n🏭 VALIDATING TOOL-MANUFACTURER DETAILS...\n');

  const manufacturerPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
  let manufacturerData = fs.readFileSync(manufacturerPath, 'utf-8');
  if (manufacturerData.charCodeAt(0) === 0xFEFF) {
    manufacturerData = manufacturerData.slice(1);
  }
  const manufacturerCSV = csv.parse(manufacturerData, { columns: true, skip_empty_lines: true, bom: true });

  report.csvData.manufacturerDetails = {
    total: manufacturerCSV.length,
    uniqueTools: new Set(manufacturerCSV.map(m => m.product_code)).size
  };

  // Check database
  const { data: dbManufacturerDetails, count: dbManufacturerCount } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact' });

  report.databaseData.manufacturerDetails = {
    total: dbManufacturerCount
  };

  // Validate each manufacturer detail record
  let invalidManufacturerRefs = 0;
  const missingToolsInManufacturer = [];

  for (const detail of dbManufacturerDetails || []) {
    // Check if tool exists
    const toolExists = dbProductCodes.has(detail.tool_code);
    if (!toolExists) {
      missingToolsInManufacturer.push(detail.tool_code);
      invalidManufacturerRefs++;
    }
  }

  if (invalidManufacturerRefs > 0) {
    report.validationErrors.push({
      type: 'tool_manufacturer_details',
      issue: 'References to non-existent tools',
      count: invalidManufacturerRefs,
      samples: missingToolsInManufacturer.slice(0, 5),
      severity: 'MEDIUM'
    });
  }

  console.log(`✅ Tool-Manufacturer Details: ${dbManufacturerCount}/${manufacturerCSV.length} records`);
  if (invalidManufacturerRefs > 0) {
    console.log(`⚠️  ${invalidManufacturerRefs} records reference non-existent tools`);
  }

  // ======================================
  // 3. VALIDATE TOOL-CONSUMABLE COMPATIBILITY
  // ======================================
  console.log('\n🔗 VALIDATING TOOL-CONSUMABLE COMPATIBILITY...\n');

  const compatPath = path.join(__dirname, '../../Tool_Code_to_Consumable_Code_Pairings - Fron Chat GPT.csv');
  const compatData = fs.readFileSync(compatPath, 'utf-8');
  const compatCSV = csv.parse(compatData, { columns: true, skip_empty_lines: true });

  report.csvData.compatibility = {
    total: compatCSV.length,
    uniqueTools: new Set(compatCSV.map(c => c.tool_code)).size,
    uniqueConsumables: new Set(compatCSV.map(c => c.consumable_code)).size
  };

  // Check database
  const { data: dbCompatibility, count: dbCompatCount } = await supabase
    .from('tool_consumable_compatibility')
    .select(`
      *,
      tool:products!tool_product_id(product_code, product_group),
      consumable:products!consumable_product_id(product_code, product_group)
    `, { count: 'exact' });

  report.databaseData.compatibility = {
    total: dbCompatCount
  };

  // Validate each compatibility record
  let invalidToolRefs = 0;
  let invalidConsumableRefs = 0;
  let wrongProductTypes = 0;

  for (const compat of dbCompatibility || []) {
    if (!compat.tool) {
      invalidToolRefs++;
    } else if (compat.tool.product_group !== 'Tool') {
      wrongProductTypes++;
      report.validationErrors.push({
        type: 'compatibility',
        issue: 'Tool reference points to non-tool product',
        toolCode: compat.tool.product_code,
        actualType: compat.tool.product_group,
        severity: 'HIGH'
      });
    }

    if (!compat.consumable) {
      invalidConsumableRefs++;
    } else if (compat.consumable.product_group !== 'Consumable') {
      wrongProductTypes++;
      report.validationErrors.push({
        type: 'compatibility',
        issue: 'Consumable reference points to non-consumable product',
        consumableCode: compat.consumable.product_code,
        actualType: compat.consumable.product_group,
        severity: 'HIGH'
      });
    }
  }

  console.log(`✅ Tool-Consumable Compatibility: ${dbCompatCount} records`);
  if (invalidToolRefs > 0) console.log(`⚠️  ${invalidToolRefs} invalid tool references`);
  if (invalidConsumableRefs > 0) console.log(`⚠️  ${invalidConsumableRefs} invalid consumable references`);
  if (wrongProductTypes > 0) console.log(`❌ ${wrongProductTypes} wrong product type references`);

  // ======================================
  // 4. VALIDATE CUSTOMER-TOOL RELATIONSHIPS
  // ======================================
  console.log('\n👥 VALIDATING CUSTOMER-TOOL RELATIONSHIPS...\n');

  const customerToolPath = path.join(__dirname, '../../Customer_to_Tool_Mapping.csv');
  const customerToolData = fs.readFileSync(customerToolPath, 'utf-8');
  const customerToolCSV = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });

  report.csvData.customerTools = {
    total: customerToolCSV.length,
    uniqueCustomers: new Set(customerToolCSV.map(c => c.customer_code)).size,
    uniqueTools: new Set(customerToolCSV.map(c => c.tool_code)).size
  };

  // Check database
  const { data: dbCustomerTools, count: dbCustomerToolCount } = await supabase
    .from('customer_tool')
    .select(`
      *,
      customer:customers(customer_code, company_name),
      tool:products!tool_product_id(product_code, product_group)
    `, { count: 'exact' });

  report.databaseData.customerTools = {
    total: dbCustomerToolCount
  };

  // Validate customer records
  const { data: dbCustomers, count: dbCustomerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact' });

  report.databaseData.customers = {
    total: dbCustomerCount
  };

  // Check for orphaned customer-tool relationships
  let orphanedCustomerTools = 0;
  let invalidToolInCustomer = 0;
  const missingCustomers = new Set();
  const missingToolsInCustomerRel = new Set();

  for (const ct of dbCustomerTools || []) {
    if (!ct.customer) {
      orphanedCustomerTools++;
      missingCustomers.add(ct.customer_id);
    }
    if (!ct.tool) {
      invalidToolInCustomer++;
      missingToolsInCustomerRel.add(ct.tool_product_id);
    } else if (ct.tool.product_group !== 'Tool') {
      report.validationErrors.push({
        type: 'customer_tool',
        issue: 'Customer owns non-tool product',
        productCode: ct.tool.product_code,
        productType: ct.tool.product_group,
        severity: 'HIGH'
      });
    }
  }

  console.log(`✅ Customer-Tool Relationships: ${dbCustomerToolCount} records`);
  console.log(`✅ Customers: ${dbCustomerCount} records`);
  if (orphanedCustomerTools > 0) console.log(`⚠️  ${orphanedCustomerTools} orphaned customer-tool relationships`);
  if (invalidToolInCustomer > 0) console.log(`⚠️  ${invalidToolInCustomer} invalid tool references`);

  // ======================================
  // 5. CHECK FOR DATA CONSISTENCY
  // ======================================
  console.log('\n🔄 CHECKING DATA CONSISTENCY...\n');

  // Find tools that should have consumables but don't
  const toolsWithConsumables = new Set();
  for (const compat of dbCompatibility || []) {
    if (compat.tool) {
      toolsWithConsumables.add(compat.tool.product_code);
    }
  }

  const allToolCodes = dbProducts
    .filter(p => p.product_group === 'Tool')
    .map(p => p.product_code);

  const toolsWithoutConsumables = allToolCodes.filter(code => !toolsWithConsumables.has(code));

  if (toolsWithoutConsumables.length > 0) {
    console.log(`📌 ${toolsWithoutConsumables.length} tools have no consumables defined`);
    console.log('   Sample tools without consumables:', toolsWithoutConsumables.slice(0, 5));
  }

  // Check for consumables not linked to any tool
  const consumablesWithTools = new Set();
  for (const compat of dbCompatibility || []) {
    if (compat.consumable) {
      consumablesWithTools.add(compat.consumable.product_code);
    }
  }

  const allConsumableCodes = dbProducts
    .filter(p => p.product_group === 'Consumable')
    .map(p => p.product_code);

  const orphanedConsumables = allConsumableCodes.filter(code => !consumablesWithTools.has(code));

  if (orphanedConsumables.length > 0) {
    console.log(`📌 ${orphanedConsumables.length} consumables not linked to any tool`);
    console.log('   Sample orphaned consumables:', orphanedConsumables.slice(0, 5));
  }

  // ======================================
  // 6. GENERATE SUMMARY REPORT
  // ======================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 DATA VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const overallHealth = {
    products: ((dbProductCount / productsCSV.length) * 100).toFixed(1),
    manufacturerDetails: ((dbManufacturerCount / manufacturerCSV.length) * 100).toFixed(1),
    compatibility: dbCompatCount,
    customerTools: ((dbCustomerToolCount / customerToolCSV.length) * 100).toFixed(1)
  };

  console.log('\n✅ DATA IMPORT COMPLETENESS:');
  console.log(`   Products: ${overallHealth.products}% complete`);
  console.log(`   Manufacturer Details: ${overallHealth.manufacturerDetails}% complete`);
  console.log(`   Compatibility Records: ${overallHealth.compatibility} total`);
  console.log(`   Customer-Tool Mappings: ${overallHealth.customerTools}% complete`);

  const totalErrors = report.validationErrors.length + report.missingData.length;
  
  if (totalErrors > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    console.log(`   Total validation errors: ${report.validationErrors.length}`);
    console.log(`   Missing data issues: ${report.missingData.length}`);
    
    // Show high severity issues
    const highSeverity = report.validationErrors.filter(e => e.severity === 'HIGH');
    if (highSeverity.length > 0) {
      console.log('\n❌ HIGH SEVERITY ISSUES:');
      highSeverity.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.issue}`);
      });
    }
  } else {
    console.log('\n✅ NO CRITICAL ISSUES FOUND!');
  }

  // ======================================
  // 7. SAVE DETAILED REPORT
  // ======================================
  const reportPath = path.join(__dirname, `../data-validation-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // ======================================
  // 8. ACTIONABLE RECOMMENDATIONS
  // ======================================
  console.log('\n' + '='.repeat(60));
  console.log('🔧 RECOMMENDED ACTIONS:');
  console.log('='.repeat(60));

  if (missingProducts.length > 0) {
    console.log('\n1. RE-IMPORT MISSING PRODUCTS:');
    console.log('   Run: node scripts/fix-products-import.js');
  }

  if (dbManufacturerCount < manufacturerCSV.length) {
    console.log('\n2. COMPLETE MANUFACTURER DETAILS IMPORT:');
    console.log('   Some manufacturer details are missing from the database');
  }

  if (toolsWithoutConsumables.length > 100) {
    console.log('\n3. ADD CONSUMABLE COMPATIBILITY:');
    console.log(`   ${toolsWithoutConsumables.length} tools need consumables defined`);
    console.log('   Use the admin interface at /admin/compatibility');
  }

  if (orphanedConsumables.length > 100) {
    console.log('\n4. LINK ORPHANED CONSUMABLES:');
    console.log(`   ${orphanedConsumables.length} consumables need tool associations`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDATION COMPLETE');
  console.log('='.repeat(60));

  return report;
}

validateAllData().catch(console.error);