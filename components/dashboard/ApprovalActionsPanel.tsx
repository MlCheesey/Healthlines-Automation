"use client";

import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";

export default function ApprovalActionsPanel() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadApprovals() {
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard-overview");
      const data = await res.json();

      const rows = data?.summary?.approvals || [];
      setApprovals(rows.slice(0, 10));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Approval Actions
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Recently approved/rejected workflow actions.
          </p>
        </div>

        <button
          onClick={loadApprovals}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-500">
            <tr>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Reference</th>
              <th className="text-left p-3">Decision</th>
            </tr>
          </thead>

          <tbody>
            {approvals.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-zinc-500">
                  No approval actions yet.
                </td>
              </tr>
            )}

            {approvals.map((row, index) => (
              <tr key={index} className="border-t border-zinc-800">
                <td className="p-3 text-zinc-300">{row.client || "-"}</td>
                <td className="p-3 text-zinc-300">{row.location || "-"}</td>
                <td className="p-3 text-zinc-300">{row.action_type || "-"}</td>
                <td className="p-3 text-zinc-300">
                  {row.reference_number ||
                    row.po_number ||
                    row.dn_number ||
                    row.invoice_number ||
                    "-"}
                </td>
                <td className="p-3">
                  <StatusBadge status={row.decision || row.status || "Logged"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}