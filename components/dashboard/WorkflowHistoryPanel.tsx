"use client";

import { useEffect, useState } from "react";

export default function WorkflowHistoryPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/workflow-history"
    );

    const json = await res.json();

    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Workflow History
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Audit trail of AI and human
            actions
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {!data ? (
        <div className="text-zinc-500">
          Loading...
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-auto">
          {data.history
            ?.slice(0, 50)
            .map(
              (
                item: any,
                index: number
              ) => (
                <div
                  key={index}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-medium">
                        {item.sheet}
                      </div>

                      <div className="text-zinc-500 text-sm mt-1">
                        Client:{" "}
                        {item.client}
                      </div>

                      <div className="text-zinc-500 text-sm">
                        Location:{" "}
                        {item.location ||
                          "-"}
                      </div>

                      <div className="text-zinc-400 text-sm mt-2">
                        {item.action_type ||
                          item.pending_action ||
                          item.notes ||
                          "Workflow event"}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600">
                      {item.created_at ||
                        "-"}
                    </div>
                  </div>
                </div>
              )
            )}
        </div>
      )}
    </section>
  );
}