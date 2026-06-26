"use client";

import { useEffect, useState } from "react";

export default function SaudiValidationPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/saudi-validation-checklist");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="text-sm text-zinc-500">Loading Saudi validation checklist...</p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">
          Saudi Validation Checklist
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          {data?.purpose || "Checklist for Saudi production validation."}
        </p>
      </div>

      <div className="space-y-4">
        {(data?.phases || []).map((phase: any, index: number) => (
          <div
            key={`${phase.phase}-${index}`}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">
                {phase.phase}
              </h3>

              <span className="text-xs bg-yellow-950 text-yellow-300 border border-yellow-800 rounded-full px-2 py-1">
                {phase.status || "pending"}
              </span>
            </div>

            {phase.commands?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-zinc-500 mb-2">Commands</p>
                <pre className="text-xs text-emerald-300 bg-zinc-900 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap">
                  {phase.commands.join("\n")}
                </pre>
              </div>
            )}

            {phase.urls?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-zinc-500 mb-2">URLs</p>
                <div className="space-y-1">
                  {phase.urls.map((url: string) => (
                    <p key={url} className="text-xs text-blue-300 break-all">
                      {url}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {phase.dashboard_tabs?.length > 0 && (
              <p className="text-xs text-zinc-400 mt-3">
                Dashboard tabs: {phase.dashboard_tabs.join(", ")}
              </p>
            )}

            <p className="text-sm text-zinc-400 mt-3">
              Expected: {phase.expected_result}
            </p>
          </div>
        ))}
      </div>

      {data?.stop_conditions?.length > 0 && (
        <div className="bg-red-950/40 border border-red-900 rounded-xl p-4 mt-5">
          <h3 className="text-sm font-semibold text-red-200">
            Stop Conditions
          </h3>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-red-100">
            {data.stop_conditions.map((item: string, index: number) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-zinc-600 mt-5">
        Final target: {data?.final_result_needed || "-"}
      </p>
    </section>
  );
}