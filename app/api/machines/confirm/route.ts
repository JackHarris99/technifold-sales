import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function confirmOrReject({
  companyId,
  companyRef,
  machineId,
  correct,
}: {
  companyId?: string | null;
  companyRef?: string | null;
  machineId: string;
  correct: boolean;
}) {
  if (correct) {
    const { error } = await supabase.rpc("sp_confirm_machine_link", {
      p_company_id: companyId ?? null,
      p_company_ref: companyRef ?? null,
      p_machine_id: machineId,
    });
    if (error) throw error;
    return { status: "confirmed" as const };
  } else {
    const { error } = await supabase.rpc("sp_reject_machine_link", {
      p_company_id: companyId ?? null,
      p_company_ref: companyRef ?? null,
      p_machine_id: machineId,
    });
    if (error) throw error;
    return { status: "rejected" as const };
  }
}

export async function POST(req: NextRequest) {
  const { companyId, companyRef, machineId, correct } = await req.json();
  if ((!companyId && !companyRef) || !machineId || typeof correct !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    const res = await confirmOrReject({ companyId, companyRef, machineId, correct });
    return NextResponse.json(res);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // /api/machines/confirm?companyId=<uuid>|companyRef=<code>&machineId=<uuid>&correct=1|0&redirect=/machines
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const companyRef = searchParams.get("companyRef");
  const machineId = searchParams.get("machineId");
  const correct = searchParams.get("correct");
  const redirect = searchParams.get("redirect") || "/machines?ack=ok";

  if ((!companyId && !companyRef) || !machineId || (correct !== "1" && correct !== "0")) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await confirmOrReject({
      companyId: companyId ?? undefined,
      companyRef: companyRef ?? undefined,
      machineId,
      correct: correct === "1",
    });
    return NextResponse.redirect(new URL(redirect, req.url));
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
