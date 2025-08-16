"use client";

import { useEffect, useState } from "react";

type MachineRow = {
  link_id: string;
  customer_code: string;
  company_name: string;
  manufacturer: string;
  model: string;
  status: string;
  confidence: number;
  evidence_count: number;
  sample_tool_code: string;
  updated_at: string;
};

export default function MachinesAdminPage() {
  const [rows, setRows] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/admin/machines-list");
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }

  async function updateStatus(link_id: string, newStatus: string) {
    await fetch("/api/admin/machines-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link_id, status: newStatus }),
    });
    fetchData(); // reload
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Machine Matches</h1>
      {loading ? <p>Loading…</p> : (
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
            {rows.map(r => (
              <tr key={r.link_id}>
                <td className="border px-2 py-1">{r.customer_code}</td>
                <td className="border px-2 py-1">{r.company_name}</td>
                <td className="border px-2 py-1">
                  {r.manufacturer} {r.model}
                </td>
                <td className="border px-2 py-1">{r.status}</td>
                <td className="border px-2 py-1">{(r.confidence*100).toFixed(1)}%</td>
                <td className="border px-2 py-1">{r.evidence_count}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button
                    onClick={() => updateStatus(r.link_id, "confirmed")}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(r.link_id, "rejected")}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

