import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { customerId, expiresInDays = 30 } = await request.json();
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Create the customer link
    const { data, error } = await supabase
      .from('customer_links')
      .insert({
        customer_id: customerId,
        link_token: token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer link:', error);
      return NextResponse.json(
        { error: 'Failed to create customer link' },
        { status: 500 }
      );
    }

    // Generate the full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/customer-portal/${token}`;

    return NextResponse.json({
      success: true,
      portalUrl,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error in generate-customer-link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate links for all customers (for bulk email campaigns)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, customer_code, company_name, email')
      .limit(100); // Limit for safety, paginate if needed

    if (customersError) {
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const links = [];

    // Generate links for each customer
    for (const customer of customers || []) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      // Insert link to database
      const { error: linkError } = await supabase
        .from('customer_links')
        .insert({
          customer_id: customer.id,
          link_token: token,
          expires_at: expiresAt.toISOString()
        });

      if (!linkError) {
        links.push({
          customer_code: customer.customer_code,
          company_name: customer.company_name,
          email: customer.email,
          portal_url: `${baseUrl}/customer-portal/${token}`,
          expires_at: expiresAt.toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated: links.length,
      links
    });
  } catch (error) {
    console.error('Error generating bulk links:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}