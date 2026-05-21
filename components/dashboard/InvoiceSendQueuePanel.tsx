"use client";

import { useEffect, useState } from "react";

export default function InvoiceSendQueuePanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/operations-status"
    );

    const json = await res.json();

    setData(json);
  }

  useEffect(() => {
    load();

    const interval = setInterval(
      load,
      15000
    );

    return () =>
      clearInterval(interval);
  }, []);

  async function updateStatus(
    packageId: string,
    status: "Drafted" | "Sent"
  ) {
    const client =
      process.env
        .NEXT_PUBLIC_DEFAULT_CLIENT ||
      "";

    const res = await fetch(
      "/api/invoice-send-status",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          client,
          package_id: packageId,
          status,
        }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      alert(
        json.error ||
          "Status update failed"
      );

      return;
    }

    alert(
      `Package marked ${status}`
    );
  }

  const packages =
    data?.approved_packages || [];

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Invoice Send Queue
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Approved packages waiting for Gmail draft/send stage.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {!packages.length ? (
        <p className="text-sm text-zinc-500">
          No approved packages yet.
        </p>
      ) : (
        <div className="space-y-3">
          {packages.map(
            (
              pkg: any,
              index: number
            ) => (
              <div
                key={index}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex justify-between items-center gap-4"
              >
                <div>
                  <p className="text-white">
                    {pkg.package_id}
                  </p>

                  <p className="text-sm text-zinc-500 mt-1">
                    {pkg.created_at ||
                      "-"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateStatus(
                        pkg.package_id,
                        "Drafted"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-sm"
                  >
                    Mark Drafted
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(
                        pkg.package_id,
                        "Sent"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm"
                  >
                    Mark Sent
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}