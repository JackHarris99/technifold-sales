"use client";

import { useEffect, useMemo, useState } from "react";

type RowFromApi = {
  link_id: string;
  customer_code: string | null;
  company_name: string | null;
  manufacturer: string | null;
  model: string | null;
  status: "probable" | "confirmed" | "rejected" | string;
  confidence: number;
  evidence_count: number;
  sample_tool_code: string | null;
  updated_at: string;

  // these may or may not be present depending on your API
  link_company_id?: string | null;
  link_company_ref?: string | null;
  link_machine_id?: string | null;
};

type UiRow = RowFromApi & {
  ambiguous: boolean;
};

function isAmbiguous(model: string | null, tool: string | null): boolean {
  // Placeholder models like SHAFT-35mm + multi-OEM tool code patterns are ambiguous.
  const m = (model || "").toUpperCase();
  const t = (tool || "").toUpperCase();

  const isShaftModel = m.startsWith("SHAFT-");
  const multiOemTool =
    t.includes("SM/35") ||
    t.includes("MF/30") ||
    t.includes("EF-SM/35") ||
    t.includes("FF-SM/35") ||
    t.includes("EF-MF/30") ||
    t.includes("FF-MF/30");

  return isShaftModel && multiOemTool;
}

export default function MachinesAdminPage() {
  const [rows, setRows] = useState<UiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "probable" | "confirmed" | "rejected">("");
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/machines-list?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fetch failed");
      const mapped: UiRow[] = (data.rows || []).map((r: RowFromApi) => ({
        ...r,
        ambiguous: isAmbiguous(r.model, r.sample_tool_code),
      }));
      setRows(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canServerConfirm = useMemo(() => {
    // Only allow confirm when API provided identifiers we can send to /api/machines/confirm
    return rows.some(
      (r) =>
        !!r.link_machine_id ||
        // sometimes machine_id wasn’t exposed; we’ll block confirm if missing
        false
    );
  }, [rows]);

  async function confirmOrReject(row: UiRow, correct: boolean) {
    // We use the existing GET-based API: /api/machines/confirm
    // Requires machineId and either companyId or companyRef.
    const machineId = row.link_machine_id;
    const companyId = row.link_company_id;
    const companyRef = row.link_company_ref || row.customer_code || null;

    if (!machineId) {
      alert("Machine ID not available from API. Please refresh or update the list API to include link_machine_id.");
      return;
    }

    const url = new URL("/api/machines/confirm", window.location.origin);
    if (companyId) url.searchParams.set("companyId", companyId);
    if (!companyId && companyRef) url.searchParams.set("companyRef", companyRef);
    url.searchParams.set("machineId", machineId);
    url.searchParams.set("correct", correct ? "1" : "0");
    url.searchParams.set("redirect", "/admin/machines");

    // Redirect approach gives user feedback and reload for free
    window.location.href = url.toString();
  }

  function StatusChip({ status }: { status: UiRow["status"] }) {
    const base = "rounded text-xs px-2 py-0.5";
    if (status === "confirmed") return <span className={`${base} bg-green-600/20 text-green-300`}>confirmed</span>;
    if (status === "probable") return <span className={`${base} bg-amber-600/20 text-amber-300`}>probable</span>;
    if (status === "rejected") return <span className={`${base} bg-rose-600/20 text-rose-300`}>rejected</span>;
    return <span className={`${base} bg-zinc-700/60 text-zinc-200`}>{status}</span>;
  }

  const visible = useMemo(() => {
    let list = rows;
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(
        (r) =>
          (r.company_name || "").toLowerCase().includes(qq) ||
          (r.customer_code || "").toLowerCase().includes(qq) ||
          (r.manufacturer || "").toLowerCase().includes(qq) ||
          (r.model || "").toLowerCase().includes(qq) ||
          (r.sample_tool_code || "").toLowerCase().includes(qq)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    // sort: confirmed first, then by confidence desc, then updated desc
    return [...list].sort((a, b) => {
      const aRank = a.status === "confirmed" ? 0 : 1;
      const bRank = b.status === "confirmed" ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [rows, q, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Machine Matches</h1>

      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search company, code, OEM, model, tool code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border rounded px-2 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="probable">Probable</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          className="bg-black text-white px-3 py-2 rounded"
          onClick={fetchData}
        >
          Refresh
        </button>
        {error && <span className="text-rose-500 text-sm">{error}</span>}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Customer</th>
                <th className="border px-2 py-1">Company</th>
                <th className="border px-2 py-1">Machine</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Confidence</th>
                <th className="border px-2 py-1">Evidence</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const canConfirm = !!r.link_machine_id && (r.link_company_id || r.link_company_ref || r.customer_code);
                const ambiguous = r.ambiguous;

                return (
                  <tr key={r.link_id}>
                    <td className="border px-2 py-1">{r.customer_code || "—"}</td>
                    <td className="border px-2 py-1">{r.company_name || "—"}</td>
                    <td className="border px-2 py-1">
                      {(r.manufacturer || "—") + " " + (r.model || "")}
                      {ambiguous && (
                        <span className="ml-2 text-xs rounded bg-zinc-700/60 text-zinc-200 px-2 py-0.5">
                          ambiguous
                        </span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="border px-2 py-1">{(r.confidence * 100).toFixed(1)}%</td>
                    <td className="border px-2 py-1">{r.evidence_count}</td>
                    <td className="border px-2 py-1 space-x-2">
                      {ambiguous ? (
                        <span className="inline-flex items-center rounded bg-zinc-700/60 px-3 py-1 text-xs text-zinc-200 cursor-not-allowed">
                          Needs resolution
                        </span>
                      ) : canConfirm ? (
                        <>
                          <button
                            onClick={() => confirmOrReject(r, true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                            title="Confirm this machine for the customer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => confirmOrReject(r, false)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded"
                            title="Reject this suggestion"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center rounded bg-amber-600/20 text-amber-800 px-3 py-1 text-xs">
                          IDs missing; update API
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && !loading && (
                <tr>
                  <td className="border px-2 py-6 text-center" colSpan={7}>
                    No rows. Try clearing filters or click Refresh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-zinc-500 mt-2">
            Note: Confirm/Reject uses <code>/api/machines/confirm</code>. If actions are disabled, expose <code>link_company_id</code>,
            <code>link_company_ref</code> and <code>link_machine_id</code> from your <code>/api/admin/machines-list</code> endpoint.
          </p>
        </div>
      )}
    </div>
  );
}

