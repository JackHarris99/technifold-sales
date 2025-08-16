import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const status = searchParams.get("status") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    // Pull from company_machine_links (has evidence + IDs),
    // join machines (manufacturer/model) and customers via company_id.
    // For rows that only have company_ref, we’ll still return the code and leave name null.
    const { data, error } = await supabase
      .from("company_machine_links")
      .select(
        `
        id,
        company_id,
        company_ref,
        machine_id,
        status,
        confidence,
        evidence,
        updated_at,
        machines:machine_id (
          manufacturer,
          model
        ),
        customer:company_id (
          customer_code,
          company_name
        )
      `
      )
      .limit(limit);

    if (error) throw error;

    const rows = (data || [])
      .map((r: any) => {
        const ev: any[] = Array.isArray(r.evidence) ? r.evidence : [];
        const sampleTool = ev.length > 0 ? ev[0]?.tool_product_code ?? null : null;

        const customer_code: string | null =
          r.customer?.customer_code ?? r.company_ref ?? null;
        const company_name: string | null = r.customer?.company_name ?? null;

        const manufacturer: string | null = r.machines?.manufacturer ?? null;
        const model: string | null = r.machines?.model ?? null;

        return {
          link_id: r.id as string,
          customer_code,
          company_name,
          manufacturer,
          model,
          status: r.status as string,
          confidence: Number(r.confidence ?? 0),
          evidence_count: ev.length,
          sample_tool_code: sampleTool,
          updated_at: r.updated_at as string,

          // IDs needed by the Confirm/Reject handler:
          link_company_id: r.company_id as string | null,
          link_company_ref: r.company_ref as string | null,
          link_machine_id: r.machine_id as string | null,
        };
      })
      // optional filtering in-memory (simple & safe)
      .filter((row: any) => {
        if (status && row.status !== status) return false;
        if (!q) return true;
        const hay =
          (row.customer_code || "") +
          " " +
          (row.company_name || "") +
          " " +
          (row.manufacturer || "") +
          " " +
          (row.model || "") +
          " " +
          (row.sample_tool_code || "");
        return hay.toLowerCase().includes(q);
      })
      .sort((a: any, b: any) => {
        const ar = a.status === "confirmed" ? 0 : 1;
        const br = b.status === "confirmed" ? 0 : 1;
        if (ar !== br) return ar - br;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    return NextResponse.json({ count: rows.length, rows });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

