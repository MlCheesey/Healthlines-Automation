"use client";

import { useEffect, useState } from "react";

export default function ApprovedInvoicePackagesPanel() {
  const defaultClient = process.env.NEXT_PUBLIC_DEFAULT_CLIENT || "";
  const [client, setClient] = useState(defaultClient);
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch(
      `/api/invoice-approved-packages?client=${encodeURIComponent(client)}`
    );

    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    if (client) load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between gap-4 items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Approved Invoice Packages
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Packages approved and ready for Gmail draft/send step.
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
            Refresh
          </button>
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-zinc-500">No data loaded.</p>
      ) : data.packages?.length === 0 ? (
        <p className="text-sm text-zinc-500">No approved packages yet.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left py-2">Package ID</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Approved By</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {data.packages.map((row: any, index: number) => (
                <tr key={index} className="border-b border-zinc-800">
                  <td className="py-2">{row.package_id || "-"}</td>
                  <td className="py-2 text-emerald-300">
                    {row.status || "-"}
                  </td>
                  <td className="py-2">{row.approved_by || "-"}</td>
                  <td className="py-2">{row.created_at || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}