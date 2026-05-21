"use client";

import { useEffect, useState } from "react";

export default function OperationsStatusBoard() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/operations-status");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 15000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="text-zinc-500 text-sm">
          Loading operations board...
        </p>
      </section>
    );
  }

  const worker = data.worker || {};
  const ops = data.operations || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Operations Control Board
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Live operational overview of HealthLines AI automation.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          title="Worker Status"
          value={worker.running ? "Running" : "Stopped"}
          green={worker.running}
          red={!worker.running}
        />

        <Card
          title="Pending Actions"
          value={ops.pending_actions || 0}
        />

        <Card
          title="Blocked Invoices"
          value={ops.blocked_invoices || 0}
          red
        />

        <Card
          title="Invoice Ready"
          value={ops.invoice_ready || 0}
          green
        />

        <Card
          title="MRN Pending"
          value={ops.mrn_pending || 0}
        />

        <Card
          title="MRN Overdue"
          value={ops.mrn_overdue || 0}
          red
        />

        <Card
          title="Approved Packages"
          value={ops.approved_packages || 0}
          green
        />

        <Card
          title="Rejected Packages"
          value={ops.rejected_packages || 0}
          red
        />

        <Card
          title="Drafted Packages"
          value={ops.drafted_packages || 0}
        />

        <Card
          title="Sent Packages"
          value={ops.sent_packages || 0}
          green
        />

        <Card
          title="Scheduled Deliveries"
          value={ops.scheduled_deliveries || 0}
        />

        <Card
          title="Gmail Queue"
          value={ops.gmail_queue_pending || 0}
        />
      </div>

      <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm">
        <div className="grid md:grid-cols-3 gap-4">
          <Info
            label="Last Gmail Cycle"
            value={worker.gmail_last_run}
          />

          <Info
            label="Last Invoice Cycle"
            value={worker.invoice_last_run}
          />

          <Info
            label="Last MRN Watcher"
            value={worker.mrn_last_run}
          />
        </div>
      </div>
    </section>
  );
}

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: any;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        green
          ? "bg-emerald-950/20 border-emerald-900"
          : red
          ? "bg-red-950/20 border-red-900"
          : "bg-zinc-950 border-zinc-800"
      }`}
    >
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="text-2xl font-semibold text-white mt-2">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-zinc-500">
        {label}
      </p>

      <p className="text-white mt-1 break-all">
        {value || "-"}
      </p>
    </div>
  );
}