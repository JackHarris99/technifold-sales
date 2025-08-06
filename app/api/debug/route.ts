import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: {
      url: process.env.VERCEL_URL,
      env: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
    },
    supabase: {
      urlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      expectedUrl: 'https://zvrmxyabhhocqlhkpzzp.supabase.co',
      urlMatches: process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://zvrmxyabhhocqlhkpzzp.supabase.co',
    },
    connection: {
      status: 'unknown',
      error: null,
      data: null,
    }
  };

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Try to fetch a simple count
    const { count, error } = await supabase
      .from('tool_manufacturer_details')
      .select('*', { count: 'exact', head: true });

    if (error) {
      debugInfo.connection.status = 'failed';
      debugInfo.connection.error = error.message;
    } else {
      debugInfo.connection.status = 'success';
      debugInfo.connection.data = {
        manufacturer_details_count: count,
      };

      // Try to get more counts
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      debugInfo.connection.data.products_count = productCount;
      debugInfo.connection.data.customers_count = customerCount;
    }
  } catch (error: any) {
    debugInfo.connection.status = 'error';
    debugInfo.connection.error = error?.message || 'Unknown error';
  }

  return NextResponse.json(debugInfo, { status: 200 });
}