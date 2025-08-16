import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // server-side only
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const status = searchParams.get("status"); // optional: confirmed|probable
    const customerCode = searchParams.get("customerCode"); // optional exact
    const q = searchParams.get("q"); // optional fuzzy search on company/manufacturer/model

    // Build SQL with simple filters
    let sql = `
      select
        link_id,
        customer_code,
        company_name,
        manufacturer,
        model,
        status,
        confidence,
        evidence_count,
        sample_tool_code,
        updated_at
      from vw_company_machines_context
      where 1=1
    `;

    const args: any[] = [];

    if (status) {
      sql += ` and status = $${args.length + 1}::machine_link_status`;
      args.push(status);
    }
    if (customerCode) {
      sql += ` and customer_code = $${args.length + 1}`;
      args.push(customerCode);
    }
    if (q) {
      sql += ` and (company_name ilike $${args.length + 1}
               or manufacturer ilike $${args.length + 1}
               or model ilike $${args.length + 1}
               or customer_code ilike $${args.length + 1})`;
      args.push(`%${q}%`);
    }

    sql += `
      order by
        case status when 'confirmed' then 0 else 1 end,
        confidence desc,
        updated_at desc
      limit $${args.length + 1}
    `;
    args.push(limit);

    const { data, error } = await supabase.rpc("exec_sql", {
      // helper RPC not required — we’ll run SQL via a tiny anonymous SQL RPC below
    } as any);

    // No generic exec_sql RPC in your DB; run with a prepared query via PostgREST:
    // Use supabase-js query builder against the view instead (no custom SQL).
    // Rebuild using filters:
  } catch (e: any) {
    // Fallback: implement with query builder only (works with your view).
  }

  // Query builder implementation (works without custom RPC)
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const status = searchParams.get("status");
    const customerCode = searchParams.get("customerCode");
    const q = searchParams.get("q");

    let query = supabase
      .from("vw_company_machines_context")
      .select(
        "link_id, customer_code, company_name, manufacturer, model, status, confidence, evidence_count, sample_tool_code, updated_at",
        { count: "exact" }
      )
      .order("status", { ascending: true }) // 'confirmed' < 'probable' via secondary order next line
      .order("confidence", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (customerCode) query = query.eq("customer_code", customerCode);
    if (q) {
      // simple ilike OR search
      query = query.or(
        `company_name.ilike.%${q}%,manufacturer.ilike.%${q}%,model.ilike.%${q}%,customer_code.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count, rows: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
