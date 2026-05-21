"use client";

import { useEffect, useState } from "react";

export default function DeliverySchedulePanel() {
  const defaultClient = process.env.NEXT_PUBLIC_DEFAULT_CLIENT || "";
  const [client, setClient] = useState(defaultClient);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const res = await fetch(
      `/api/delivery-schedule?client=${encodeURIComponent(client)}`
    );

    const data = await res.json();
    setRows(data.rows || []);
  }

  useEffect(() => {
    if (client) load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Delivery Schedule
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            PO items where customer specified delivery date.
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

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No scheduled delivery-date PO items yet.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left py-2">Delivery Date</th>
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">PO</th>
                <th className="text-left py-2">Item</th>
                <th className="text-left py-2">Qty</th>
                <th className="text-left py-2">Unit</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-zinc-800">
                  <td className="py-2 text-yellow-300">
                    {row.delivery_date || "-"}
                  </td>
                  <td className="py-2">{row.location || "-"}</td>
                  <td className="py-2">{row.po_number || "-"}</td>
                  <td className="py-2">{row.item_name || "-"}</td>
                  <td className="py-2">{row.required_qty || "-"}</td>
                  <td className="py-2">{row.unit || "-"}</td>
                  <td className="py-2">{row.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}