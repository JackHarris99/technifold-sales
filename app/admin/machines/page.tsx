// app/admin/machines/page.tsx
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // view is read-only; service key ensures no RLS surprises
  { auth: { persistSession: false } }
);

type Row = {
  link_id: string;
  customer_code: string | null;
  manufacturer: string | null;
  model: string | null;
  is_placeholder: boolean | null;
  status: "probable" | "confirmed" | "rejected";
  confidence: number;
  evidence_count: number | null;
  sample_tool_code: string | null;
  updated_at: string;
  company_id: string | null;
  company_ref: string | null;
  machine_id: string;
};

export const revalidate = 0; // always fresh while we iterate

async function getRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("vw_company_machines_context")
    .select(
      "link_id,customer_code,manufacturer,model,is_placeholder,status,confidence,evidence_count,sample_tool_code,updated_at,company_id,company_ref,machine_id"
    )
    .order("updated_at", { ascending: false })
    .order("confidence", { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data as Row[];
}

export default async function Page() {
  const rows = await getRows();

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Company → Machines (Context)</h1>

      <div className="text-sm text-gray-600">
        Showing {rows.length} links. Columns: customer_code, manufacturer/model,
        status, confidence, evidence count, sample tool code, updated.
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Machine</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Conf.</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Sample Tool</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const customer =
                r.customer_code ??
                r.company_ref ??
                (r.company_id ? r.company_id.slice(0, 8) : "—");
              const machine = `${r.manufacturer ?? "?"} ${r.model ?? ""}`.trim();

              const qsBase = new URLSearchParams({
                machineId: r.machine_id,
                redirect: "/admin/machines",
              });

              if (r.company_id) qsBase.set("companyId", r.company_id);
              if (r.company_ref) qsBase.set("companyRef", r.company_ref);

              const confirmUrl = `/api/machines/confirm?${new URLSearchParams({
                ...Object.fromEntries(qsBase),
                correct: "1",
              }).toString()}`;

              const wrongUrl = `/api/machines/confirm?${new URLSearchParams({
                ...Object.fromEntries(qsBase),
                correct: "0",
              }).toString()}`;

              return (
                <tr key={r.link_id} className="border-t">
                  <td className="px-3 py-2 font-medium">{customer}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{machine}</span>
                      {r.is_placeholder ? (
                        <span className="text-xs rounded bg-yellow-100 px-2 py-0.5">
                          shaft placeholder
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">
                    {(r.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">{r.evidence_count ?? 0}</td>
                  <td className="px-3 py-2">{r.sample_tool_code ?? "—"}</td>
                  <td className="px-3 py-2">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <a
                        href={confirmUrl}
                        className="rounded-lg px-3 py-1 border bg-green-50 hover:bg-green-100"
                      >
                        Confirm
                      </a>
                      <a
                        href={wrongUrl}
                        className="rounded-lg px-3 py-1 border bg-rose-50 hover:bg-rose-100"
                      >
                        Wrong
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
