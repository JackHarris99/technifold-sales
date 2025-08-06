const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get all manufacturer details
  const { data, count } = await supabase
    .from('tool_manufacturer_details')
    .select('manufacturer, detail', { count: 'exact' })
    .limit(500);
    
  const manufacturerMap = new Map();
  data?.forEach(record => {
    if (!manufacturerMap.has(record.manufacturer)) {
      manufacturerMap.set(record.manufacturer, new Set());
    }
    manufacturerMap.get(record.manufacturer).add(record.detail);
  });
  
  console.log('✅ MANUFACTURER DATA STATUS');
  console.log('================================');
  console.log('Total records:', count);
  console.log('Unique manufacturers:', manufacturerMap.size);
  console.log('\n🏭 MANUFACTURERS WITH MACHINE DETAILS:');
  console.log('----------------------------------------');
  
  [...manufacturerMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([mfr, details]) => {
      const detailList = [...details].sort().join(', ');
      console.log(`${mfr} (${details.size}): ${detailList}`);
    });
  
  // Check compatibility data too
  const { count: compatCount } = await supabase
    .from('tool_consumable_compatibility')
    .select('*', { count: 'exact', head: true });
    
  const { count: customerToolCount } = await supabase
    .from('customer_tool')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📊 OTHER DATA:');
  console.log('----------------------------------------');
  console.log('Tool-Consumable Compatibility:', compatCount, 'records');
  console.log('Customer-Tool Relationships:', customerToolCount, 'records');
})().catch(console.error);