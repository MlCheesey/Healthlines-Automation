"use client";

import { useEffect, useState } from "react";

export default function InvoiceLifecyclePanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/operations-status"
    );

    const json =
      await res.json();

    setData(json.operations);
  }

  useEffect(() => {
    load();

    const interval =
      setInterval(load, 15000);

    return () =>
      clearInterval(interval);
  }, []);

  const ops = data || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-5">
        Invoice Lifecycle
      </h2>

      <div className="grid md:grid-cols-6 gap-3">
        <Mini
          title="Ready"
          value={
            ops.invoice_ready || 0
          }
        />

        <Mini
          title="Blocked"
          value={
            ops.blocked_invoices ||
            0
          }
        />

        <Mini
          title="Approved"
          value={
            ops.approved_packages ||
            0
          }
        />

        <Mini
          title="Drafted"
          value={
            ops.drafted_packages ||
            0
          }
        />

        <Mini
          title="Sent"
          value={
            ops.sent_packages || 0
          }
        />

        <Mini
          title="MRN Overdue"
          value={
            ops.mrn_overdue || 0
          }
        />
      </div>
    </section>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500">
        {title}
      </p>

      <p className="text-white text-2xl font-semibold mt-1">
        {value}
      </p>
    </div>
  );
}