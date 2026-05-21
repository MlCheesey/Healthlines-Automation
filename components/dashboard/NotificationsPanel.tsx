"use client";

import { useEffect, useState } from "react";

export default function NotificationsPanel() {
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setRows(data.rows || []);
  }

  async function closeNotification(id: string) {
    await fetch("/api/notification-close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    load();
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 10000);

    return () => clearInterval(interval);
  }, []);

  const openRows = rows.filter((row) => row.status !== "Closed");

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Notifications
      </h2>

      <div className="space-y-3 max-h-96 overflow-auto">
        {openRows.length === 0 ? (
          <p className="text-zinc-500 text-sm">No open notifications.</p>
        ) : (
          openRows.map((row) => (
            <div
              key={row.id}
              className={`rounded-xl border p-4 ${
                row.severity === "critical"
                  ? "bg-red-950/20 border-red-900"
                  : row.severity === "warning"
                  ? "bg-yellow-950/20 border-yellow-900"
                  : "bg-zinc-950 border-zinc-800"
              }`}
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-white text-sm">{row.title}</p>

                  <p className="text-zinc-400 text-sm mt-1">
                    {row.message}
                  </p>

                  <p className="text-xs text-zinc-600 mt-2">
                    {row.created_at}
                  </p>
                </div>

                <button
                  onClick={() => closeNotification(row.id)}
                  className="h-fit px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}