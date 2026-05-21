"use client";

import { useEffect, useState } from "react";

export default function AttachmentPanel() {
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/attachments");
    const data = await res.json();
    setRows(data.rows || []);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Attachment Registry
      </h2>

      <div className="space-y-3 max-h-96 overflow-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No attachments registered yet.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <p className="text-white text-sm">
                {row.filename || "-"}
              </p>

              <p className="text-zinc-500 text-xs mt-1">
                Type: {row.type || row.mime_type || "-"}
              </p>

              <p className="text-zinc-500 text-xs mt-1">
                Status: {row.parser_status || "-"}
              </p>

              {row.notes && (
                <p className="text-zinc-600 text-xs mt-2">
                  {row.notes}
                </p>
              )}

              <p className="text-zinc-600 text-xs mt-2">
                {row.created_at}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}