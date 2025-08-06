const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importAllProducts() {
  console.log('🚨 IMPORTING ALL PRODUCTS TO CORRECT DATABASE\n');
  
  // Read the CSV
  const csvPath = path.join(__dirname, '../../Product_Sales_Summary.csv 05-08-2025.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(csvData, { 
    columns: true, 
    skip_empty_lines: true,
    bom: true 
  });
  
  console.log(`📄 Found ${records.length} products in CSV\n`);
  
  // Count by category
  const counts = { Tool: 0, Consumable: 0, Parts: 0, Other: 0 };
  const products = [];
  
  for (const record of records) {
    const productCode = record.product_code?.trim();
    const description = record.description?.trim();
    const salesPrice = parseFloat(record.sales_price) || 0;
    const costPrice = parseFloat(record.cost_price) || 0;
    const productGroup = record.product_group?.trim();
    const productGroupDetail = record.product_group_detail?.trim();
    
    if (!productCode) continue;
    
    // Use EXACTLY what's in the CSV for product_group
    if (productGroup === 'Tool') counts.Tool++;
    else if (productGroup === 'Consumable') counts.Consumable++;
    else if (productGroup === 'Parts') counts.Parts++;
    else counts.Other++;
    
    // Determine the actual product group
    let actualGroup = productGroup;
    if (!actualGroup || actualGroup.trim() === '') {
      // If no group specified, try to determine from product code or description
      if (productCode.startsWith('FF-') || productGroupDetail?.includes('Fast-Fit')) {
        actualGroup = 'Tool';
      } else if (productCode.startsWith('MOULD-') || productCode.includes('CB-') || productCode.includes('CK-')) {
        actualGroup = 'Consumable';
      } else {
        actualGroup = 'Parts';
      }
    }
    
    products.push({
      product_code: productCode,
      description: description,
      sales_price: salesPrice,
      cost_price: costPrice,
      product_group: actualGroup,
      product_group_detail: productGroupDetail || null
    });
  }
  
  console.log('📊 Product Categories from CSV:');
  console.log(`   Tools: ${counts.Tool}`);
  console.log(`   Consumables: ${counts.Consumable}`);
  console.log(`   Parts: ${counts.Parts}`);
  console.log(`   Other/Missing: ${counts.Other}\n`);
  
  // Show some examples of Tools
  const toolExamples = products.filter(p => p.product_group === 'Tool').slice(0, 10);
  console.log('🔧 Example Tools that SHOULD be imported:');
  toolExamples.forEach(t => {
    console.log(`   ${t.product_code}: ${t.description.substring(0, 50)}... (${t.product_group_detail})`);
  });
  
  // Clear existing products
  console.log('\n🗑️  Clearing existing products...');
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (deleteError) {
    console.error('Error clearing products:', deleteError);
    return;
  }
  
  // Import in batches
  console.log(`\n📦 Importing ${products.length} products...`);
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();
      
    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      errorCount += batch.length;
    } else if (data) {
      successCount += data.length;
      process.stdout.write(`\r✅ Imported: ${successCount}/${products.length}`);
    }
  }
  
  console.log('\n');
  
  // Verify the import
  const { data: toolCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_group', 'Tool');
    
  const { data: consumableCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_group', 'Consumable');
    
  const { count: totalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log('✅ IMPORT COMPLETE!');
  console.log('=================================');
  console.log(`Total products in database: ${totalCount}`);
  console.log(`Tools: ${toolCount.length || 0}`);
  console.log(`Consumables: ${consumableCount.length || 0}`);
  console.log('=================================');
  
  // Check for Fast-Fit Tri-Creasers specifically
  const { data: fastFitTools } = await supabase
    .from('products')
    .select('product_code, description, product_group_detail')
    .eq('product_group', 'Tool')
    .ilike('product_group_detail', '%fast%fit%')
    .limit(10);
    
  if (fastFitTools && fastFitTools.length > 0) {
    console.log('\n🎯 Fast-Fit Tools found:');
    fastFitTools.forEach(t => {
      console.log(`   ${t.product_code}: ${t.product_group_detail}`);
    });
  } else {
    console.log('\n⚠️  No Fast-Fit Tools found - check if they exist in the CSV');
  }
}

importAllProducts().catch(console.error);