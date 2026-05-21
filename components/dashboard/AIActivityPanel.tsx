"use client";

import { useEffect, useState } from "react";

export default function AIActivityPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    try {
      const res = await fetch("/api/system-logs");
      const data = await res.json();

      setEvents(Array.isArray(data.events) ? data.events : []);
      setErrors(Array.isArray(data.errors) ? data.errors : []);
    } catch {
      setEvents([]);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();

    const interval = setInterval(loadLogs, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            AI Activity Monitor
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Background automation activity and errors.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">
          Loading activity...
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Events
            </h3>

            {events.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No events yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {events.map((log, index) => (
                  <LogCard key={index} log={log} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-red-300 mb-3">
              Errors
            </h3>

            {errors.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No errors.
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {errors.map((log, index) => (
                  <LogCard key={index} log={log} error />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function LogCard({
  log,
  error = false,
}: {
  log: any;
  error?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        error
          ? "bg-red-950/30 border-red-900"
          : "bg-zinc-950 border-zinc-800"
      }`}
    >
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">
            {log.event || log.context || "System"}
          </p>

          <p className="text-sm text-zinc-400 mt-1">
            {log.message || "-"}
          </p>
        </div>

        <div className="text-xs text-zinc-500 whitespace-nowrap">
          {log.created_at || "-"}
        </div>
      </div>

      {log.metadata && (
        <pre className="mt-3 text-xs text-zinc-500 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}