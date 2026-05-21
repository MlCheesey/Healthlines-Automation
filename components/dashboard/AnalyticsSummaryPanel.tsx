"use client";

import {
  useEffect,
  useState,
} from "react";

export default function AnalyticsSummaryPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/analytics-summary"
    );

    const json =
      await res.json();

    setData(json);
  }

  useEffect(() => {
    load();

    const interval =
      setInterval(load, 15000);

    return () =>
      clearInterval(interval);
  }, []);

  if (!data) return null;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-5">
        System Analytics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Mini
          title="Notifications"
          value={
            data.notifications
          }
        />

        <Mini
          title="Retry Jobs"
          value={
            data.retry_jobs
          }
        />

        <Mini
          title="Attachments"
          value={
            data.attachments
          }
        />

        <Mini
          title="Failed Jobs"
          value={
            data.failed_jobs
          }
        />
      </div>
    </section>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-xs">
        {title}
      </p>

      <p className="text-white text-2xl font-semibold mt-1">
        {value}
      </p>
    </div>
  );
}