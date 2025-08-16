// app/api/admin/machines-list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Utility: pull a sample tool code out of the evidence array
function firstToolCode(evidence: any[] | null): string | null {
  if (!Array.isArray(evidence)) return null;
  for (const e of evidence) {
    if (e && typeof e === "object" && typeof e.tool_product_code === "string") {
      return e.tool_product_code as string;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const statusFilter = (searchParams.get("status") || "").trim(); // '', 'probable', 'confirmed', 'rejected'
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Base select with FKs so PostgREST can join (we added the FKs earlier)
    // NOTE: we pull raw IDs so the UI can call confirm/reject endpoints.
    let query = supabase
      .from("company_machine_links")
      .select(
        [
          "id",                // link_id
          "company_id",
          "company_ref",
          "machine_id",
          "status",
          "confidence",
          "evidence",
          "updated_at",
          "customers!company_id (customer_code, company_name)", // join via FK company_id
          "machines!machine_id (manufacturer, model)",          // join via FK machine_id
        ].join(",")
      )
      .order("status", { ascending: true })
      .order("confidence", { ascending: false })
      .limit(limit);

    // Apply status filter if provided
    if (statusFilter === "probable" || statusFilter === "confirmed" || statusFilter === "rejected") {
      query = query.eq("status", statusFilter);
    }

    // Execute
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Shape rows + client-side search across joined fields + tool code
    type Row = {
      id: string;
      company_id: string | null;
      company_ref: string | null;
      machine_id: string;
      status: string;
      confidence: number;
      evidence: any[] | null;
      updated_at: string;
      customers?: { customer_code: string | null; company_name: string | null } | null;
      machines?: { manufacturer: string | null; model: string | null } | null;
    };

    const shaped = (data as Row[]).map((r) => {
      const toolCode = firstToolCode(r.evidence || null);
      return {
        link_id: r.id,
        company_id: r.company_id,
        company_ref: r.company_ref,
        machine_id: r.machine_id,
        status: r.status,
        confidence: r.confidence,
        updated_at: r.updated_at,
        evidence_count: Array.isArray(r.evidence) ? r.evidence.length : 0,
        sample_tool_code: toolCode,
        customer_code: r.customers?.customer_code ?? null,
        company_name: r.customers?.company_name ?? null,
        manufacturer: r.machines?.manufacturer ?? null,
        model: r.machines?.model ?? null,
      };
    });

    // Client-side search (covers code, name, mfr, model, tool code); keeps API simple & fast
    const needle = q.toLowerCase();
    const filtered = needle
      ? shaped.filter((r) => {
          return (
            (r.customer_code ?? "").toLowerCase().includes(needle) ||
            (r.company_name ?? "").toLowerCase().includes(needle) ||
            (r.manufacturer ?? "").toLowerCase().includes(needle) ||
            (r.model ?? "").toLowerCase().includes(needle) ||
            (r.sample_tool_code ?? "").toLowerCase().includes(needle)
          );
        })
      : shaped;

    return NextResponse.json({
      count: filtered.length,
      rows: filtered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}


