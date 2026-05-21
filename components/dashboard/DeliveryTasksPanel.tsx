"use client";

import { useEffect, useState } from "react";

export default function DeliveryTasksPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function loadData() {
    const res = await fetch("/api/dashboard-data");
    const data = await res.json();
    setTasks(data.tasks || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Delivery Tasks
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Live active delivery tasks from operational workbooks.
          </p>
        </div>

        <div className="text-sm text-zinc-500">
          {tasks.length} active tasks
        </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 && (
          <p className="text-sm text-zinc-500">No delivery tasks yet.</p>
        )}

        {tasks.map((task, index) => {
          const expanded = expandedId === index;

          return (
            <div
              key={index}
              className="border border-zinc-800 rounded-2xl bg-zinc-950 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : index)}
                className="w-full p-5 text-left hover:bg-zinc-900/60"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-white font-medium">
                      {task.location || "General"}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {task.action || task.requirement_type || "Delivery task"}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-yellow-950/40 border border-yellow-900 text-yellow-400 text-sm">
                    {task.status || "Pending"}
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-zinc-800 p-5 bg-zinc-900/40">
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(task, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}