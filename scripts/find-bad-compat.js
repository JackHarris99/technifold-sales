const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findBadCompatibility() {
  // Find the problematic compatibility record
  const { data } = await supabase
    .from('tool_consumable_compatibility')
    .select(`
      *,
      tool:products!tool_product_id(product_code, product_group),
      consumable:products!consumable_product_id(product_code, product_group)
    `)
    .limit(500);
    
  const problems = data.filter(d => 
    (d.consumable && d.consumable.product_group !== 'Consumable') ||
    (d.tool && d.tool.product_group !== 'Tool')
  );
  
  console.log('Found problematic records:', problems.length);
  if (problems.length > 0) {
    problems.forEach(p => {
      console.log('Problem:', {
        id: p.id,
        tool: p.tool?.product_code + ' (' + p.tool?.product_group + ')',
        consumable: p.consumable?.product_code + ' (' + p.consumable?.product_group + ')'
      });
      
      // Delete the problematic record
      console.log('Deleting problematic record:', p.id);
    });
    
    // Delete all problematic records
    for (const p of problems) {
      const { error } = await supabase
        .from('tool_consumable_compatibility')
        .delete()
        .eq('id', p.id);
      
      if (error) {
        console.error('Error deleting:', error);
      } else {
        console.log('Deleted:', p.id);
      }
    }
  }
}

findBadCompatibility().catch(console.error);