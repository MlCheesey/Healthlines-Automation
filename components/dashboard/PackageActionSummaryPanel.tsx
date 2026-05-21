"use client";

import { useEffect, useState } from "react";

export default function PackageActionSummaryPanel() {
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/package-action-summary");
    const data = await res.json();
    setRows(data.rows || []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Invoice Package Status Timeline
      </h2>

      <div className="space-y-3 max-h-96 overflow-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No invoice package statuses yet.</p>
        ) : (
          rows.map((row, index) => (
            <div
              key={index}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <p className="text-white text-sm">
                {row.invoice_number || row.dn_number || "Invoice Group"}
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                {row.invoice_status}
              </p>
              <p className="text-zinc-600 text-xs mt-2">
                Client: {row.client} · Location: {row.location} · MRN:{" "}
                {row.mrn_status || "-"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}