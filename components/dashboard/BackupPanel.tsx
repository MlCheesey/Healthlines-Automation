"use client";

import { useState } from "react";

export default function BackupPanel() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/backup-restore-list");
    const json = await res.json();
    setData(json);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Backup Monitor
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Workbook backups created before Excel writes.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Load Backups
        </button>
      </div>

      {!data ? (
        <p className="text-sm text-zinc-500">No backup data loaded.</p>
      ) : data.backups.length === 0 ? (
        <p className="text-sm text-zinc-500">No backups found.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-auto text-sm">
          {data.backups.slice(0, 30).map((backup: any, index: number) => (
            <div
              key={index}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
            >
              <p className="text-zinc-300">{backup.file}</p>
              <p className="text-zinc-500 text-xs">{backup.modified_at}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}