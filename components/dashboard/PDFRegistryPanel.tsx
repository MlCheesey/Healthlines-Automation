"use client";

import {
  useEffect,
  useState,
} from "react";

export default function PDFRegistryPanel() {
  const [rows, setRows] =
    useState<any[]>([]);

  async function load() {
    const res = await fetch(
      "/api/pdf-registry"
    );

    const data =
      await res.json();

    setRows(data.rows || []);
  }

  useEffect(() => {
    load();

    const interval =
      setInterval(load, 15000);

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        PDF Registry
      </h2>

      <div className="space-y-3 max-h-96 overflow-auto">
        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
          >
            <p className="text-white text-sm">
              {row.invoice_number}
            </p>

            <p className="text-zinc-500 text-xs mt-1">
              DN: {row.dn_number}
            </p>

            <a
              href={`/api/file-preview?path=${encodeURIComponent(
                row.pdfPath
              )}`}
              target="_blank"
              className="inline-block mt-2 text-blue-400 text-xs hover:underline"
            >
              Open PDF
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}