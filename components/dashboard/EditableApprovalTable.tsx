"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";

export default function EditableApprovalTable({
  rows = [],
}: {
  rows: any[];
}) {
  const [loading, setLoading] = useState<number | null>(null);

  async function submitDecision(index: number, decision: "Approved" | "Rejected") {
    setLoading(index);

    const row = rows[index];

    try {
      const res = await fetch("/api/approval-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client: row.client,
          location: row.location,
          action_type: row.action_type || row.email_type || "Workflow Approval",
          reference_number:
            row.reference_number ||
            row.po_number ||
            row.dn_number ||
            row.invoice_number ||
            "",
          po_number: row.po_number || "",
          dn_number: row.dn_number || "",
          mrn_number: row.mrn_number || "",
          invoice_number: row.invoice_number || "",
          decision,
          remarks: row.pending_action || row.notes || "",
          approved_by: "dashboard_user",
        }),
      });

      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-500">
          <tr>
            <th className="text-left p-3">Client</th>
            <th className="text-left p-3">Location</th>
            <th className="text-left p-3">PO</th>
            <th className="text-left p-3">DN</th>
            <th className="text-left p-3">Action</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Controls</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-zinc-500">
                No pending approval records.
              </td>
            </tr>
          )}

          {rows.map((row, index) => (
            <tr key={index} className="border-t border-zinc-800">
              <td className="p-3 text-zinc-300">{row.client || "-"}</td>
              <td className="p-3 text-zinc-300">{row.location || "-"}</td>
              <td className="p-3 text-zinc-300">{row.po_number || "-"}</td>
              <td className="p-3 text-zinc-300">{row.dn_number || "-"}</td>
              <td className="p-3 text-zinc-300">
                {row.pending_action ||
                  row.action_type ||
                  row.email_type ||
                  row.notes ||
                  "-"}
              </td>
              <td className="p-3">
                <StatusBadge status={row.status || "Open"} />
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => submitDecision(index, "Approved")}
                    disabled={loading === index}
                    className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-xs"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => submitDecision(index, "Rejected")}
                    disabled={loading === index}
                    className="px-3 py-1 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-xs"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}