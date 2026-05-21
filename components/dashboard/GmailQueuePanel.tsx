"use client";

import {
  useEffect,
  useState,
} from "react";

export default function GmailQueuePanel() {
  const [rows, setRows] =
    useState<any[]>([]);

  async function load() {
    const res = await fetch(
      "/api/gmail-queue"
    );

    const data =
      await res.json();

    setRows(data.queue || []);
  }

  useEffect(() => {
  load();

  const interval = setInterval(load, 10000);

  return () => clearInterval(interval);
}, []);

  async function updateStatus(
    id: string,
    status: string
  ) {
    await fetch(
      "/api/gmail-queue",
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          id,

          updates: {
            status,
          },
        }),
      }
    );

    load();
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Gmail Draft Queue
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Gmail-ready draft/send
            queue.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 text-sm"
        >
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No Gmail queue items.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-white">
                    {row.subject ||
                      "(No subject)"}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {row.recipient ||
                      "-"}
                  </p>

                  <p className="text-xs text-zinc-600 mt-2">
                    Package:{" "}
                    {row.package_id ||
                      "-"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-zinc-400">
                    {row.status}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateStatus(
                          row.id,
                          "DRAFTED"
                        )
                      }
                      className="px-2 py-1 rounded bg-yellow-700 text-xs"
                    >
                      Drafted
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(
                          row.id,
                          "SENT"
                        )
                      }
                      className="px-2 py-1 rounded bg-emerald-700 text-xs"
                    >
                      Sent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}