"use client";

import { useEffect, useState } from "react";

function badgeClass(status: string) {
  const text = String(status || "").toLowerCase();

  if (text.includes("error")) return "bg-red-950 text-red-300 border-red-800";
  if (text.includes("duplicate"))
    return "bg-yellow-950 text-yellow-300 border-yellow-800";
  if (text.includes("review"))
    return "bg-orange-950 text-orange-300 border-orange-800";

  return "bg-zinc-900 text-zinc-300 border-zinc-700";
}

export default function NeedsReviewPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/needs-review");
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Needs Review</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Low-confidence, Other, duplicate, failed, or human-review emails.
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2">
          <p className="text-xs text-zinc-500">Open Review Items</p>
          <p className="text-2xl font-semibold text-white">{rows.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading review queue...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-emerald-400">
          No review items found.
        </p>
      ) : (
        <div className="space-y-3 max-h-[650px] overflow-auto">
          {rows.map((row, index) => (
            <div
              key={`${row.source_email_id || index}-${index}`}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-xs border px-2 py-1 rounded-full ${badgeClass(
                    row.status
                  )}`}
                >
                  {row.status || "Needs Review"}
                </span>

                <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                  {row.source || "Workflow"}
                </span>

                <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                  {row.email_type || row.issue_type || "Other"}
                </span>

                {row.confidence !== "" && row.confidence !== undefined && (
                  <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                    Confidence: {row.confidence}
                  </span>
                )}
              </div>

              <p className="text-white text-sm font-medium">
                {row.subject || row.pending_action || "Untitled email/action"}
              </p>

              <p className="text-zinc-500 text-xs mt-1">
                From: {row.from || "-"} · Client: {row.client || "-"} ·
                Location: {row.location || "-"}
              </p>

              <p className="text-zinc-400 text-sm mt-3">
                {row.reason ||
                  row.pending_action ||
                  row.recommended_action ||
                  row.notes ||
                  "Review manually."}
              </p>

              {(row.po_numbers || row.dn_numbers || row.mrn_numbers) && (
                <p className="text-zinc-600 text-xs mt-2">
                  PO: {row.po_numbers || "-"} · DN: {row.dn_numbers || "-"} ·
                  MRN: {row.mrn_numbers || "-"}
                </p>
              )}

              <p className="text-zinc-700 text-xs mt-3">
                {row.email_time_logged || row.created_at || "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}