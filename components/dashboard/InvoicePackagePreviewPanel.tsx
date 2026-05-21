"use client";

import { useState } from "react";

export default function InvoicePackagePreviewPanel() {
  const defaultClient = process.env.NEXT_PUBLIC_DEFAULT_CLIENT || "";
  const [client, setClient] = useState(defaultClient);
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch(
      `/api/invoice-package-preview?client=${encodeURIComponent(client)}`
    );
    const json = await res.json();
    setData(json);
  }

  const summary = data?.summary || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Invoice Package Preview
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Preview what the next package will include before generation.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="client"
          />

          <button
            onClick={load}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Preview
          </button>
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-zinc-500">No preview loaded.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Mini title="Ready" value={summary.ready_groups || 0} />
            <Mini title="Blocked" value={summary.blocked_groups || 0} />
            <Mini title="Missing Rates" value={summary.missing_rates || 0} />
            <Mini title="MRN Pending" value={summary.mrn_pending || 0} />
            <Mini title="MRN Overdue" value={summary.mrn_overdue || 0} />
            <Mini
              title="Skipped"
              value={summary.skipped_already_packaged || 0}
            />
          </div>

          {(data.blocked || []).length > 0 && (
            <div className="bg-red-950/20 border border-red-900 rounded-xl p-4">
              <p className="text-red-300 text-sm font-medium">
                Blocked DN groups exist. Fill missing rates before final package.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Mini({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="text-lg text-white font-semibold mt-1">{value}</p>
    </div>
  );
}