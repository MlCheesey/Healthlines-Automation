"use client";

import { useEffect, useState } from "react";

function statusClass(status: string) {
  const text = String(status || "").toLowerCase();

  if (
    text.includes("pass") ||
    text.includes("ready") ||
    text.includes("healthy") ||
    text.includes("ok")
  ) {
    return "bg-emerald-950 text-emerald-300 border-emerald-800";
  }

  if (
    text.includes("waiting") ||
    text.includes("mostly") ||
    text.includes("partial") ||
    text.includes("pending") ||
    text.includes("stale")
  ) {
    return "bg-yellow-950 text-yellow-300 border-yellow-800";
  }

  if (text.includes("attention") || text.includes("error") || text.includes("not")) {
    return "bg-red-950 text-red-300 border-red-800";
  }

  return "bg-zinc-950 text-zinc-300 border-zinc-800";
}

function CheckGroup({
  title,
  checks,
  note,
}: {
  title: string;
  checks: Record<string, any>;
  note?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>

      {note && <p className="text-xs text-zinc-600 mb-3">{note}</p>}

      <div className="space-y-2">
        {Object.entries(checks || {}).map(([key, check]: any) => (
          <div
            key={key}
            className="flex items-start justify-between gap-3 border-b border-zinc-900 pb-2 last:border-b-0 last:pb-0"
          >
            <div>
              <p className="text-sm text-zinc-300">{check.message || key}</p>
              {check.fix && (
                <p className="text-xs text-zinc-600 mt-1">{check.fix}</p>
              )}
            </div>

            <span
              className={`shrink-0 text-xs border px-2 py-1 rounded-full ${statusClass(
                check.status
              )}`}
            >
              {check.status || "unknown"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationCard({ title, check }: { title: string; check: any }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span
          className={`text-xs border px-2 py-1 rounded-full ${statusClass(
            check?.status || check?.level
          )}`}
        >
          {check?.status || check?.level || "unknown"}
        </span>
      </div>

      <div className="mt-3 text-xs text-zinc-500 space-y-1">
        <p>{check?.message || "Pending validation."}</p>
        {check?.fix && <p className="text-zinc-600">Next: {check.fix}</p>}
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  status,
  subtitle,
}: {
  title: string;
  score: any;
  status: string;
  subtitle: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-3xl font-semibold text-white mt-1">
            {score?.percent ?? 0}%
          </p>
          <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>
        </div>

        <span
          className={`text-xs border px-2 py-1 rounded-full ${statusClass(status)}`}
        >
          {status || "unknown"}
        </span>
      </div>

      <p className="text-xs text-zinc-500 mt-3">
        Passed {score?.passed ?? 0} of {score?.total ?? 0}
      </p>
    </div>
  );
}

export default function ProductionReadinessPanel() {
  const [readiness, setReadiness] = useState<any>(null);
  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [readinessRes, automationRes] = await Promise.all([
        fetch("/api/production-readiness"),
        fetch("/api/automation-status"),
      ]);

      const readinessData = await readinessRes.json();
      const automationData = await automationRes.json();

      setReadiness(readinessData);
      setAutomation(automationData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="text-sm text-zinc-500">Loading production readiness...</p>
      </section>
    );
  }

  const checks = readiness?.checks || {};
  const saudiAutomation = checks.saudi_automation || {};
  const automationChecks = automation?.checks || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Production Readiness
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            India code readiness is separated from Saudi live production validation.
          </p>
        </div>

        <span
          className={`self-center text-xs border px-3 py-2 rounded-full ${statusClass(
            readiness?.status
          )}`}
        >
          {readiness?.status || "unknown"}
        </span>
      </div>

      <div
        className={`border rounded-xl p-4 mb-5 ${statusClass(readiness?.status)}`}
      >
        <p className="text-sm font-semibold">
          {readiness?.headline || "Readiness status unavailable."}
        </p>
        <p className="text-xs mt-1">
          Saudi-only items like GOOGLE_REFRESH_TOKEN, shared DATA_ROOT, Tally, and PM2 worker validation cannot be cleared from India PC.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <ScoreCard
          title="India Code Readiness"
          score={readiness?.india_code_readiness?.score}
          status={readiness?.india_code_readiness?.status}
          subtitle="Build/code/local storage readiness"
        />

        <ScoreCard
          title="Saudi Live Readiness"
          score={readiness?.saudi_live_readiness?.score}
          status={readiness?.saudi_live_readiness?.status}
          subtitle="Gmail, Tally, PM2, shared folder"
        />

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Worker Status</p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              automation?.worker_running ? "text-emerald-300" : "text-yellow-300"
            }`}
          >
            {automation?.worker_running ? "Running" : "Pending / Stale"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {automation?.message || "Worker status will be fresh after Saudi PM2 restart."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <AutomationCard
          title="Gmail Cycle"
          check={automationChecks.gmail_cycle || saudiAutomation.gmail_cycle}
        />
        <AutomationCard
          title="Tally Sync"
          check={
            automationChecks.tally_delivery_sync || saudiAutomation.tally_sync
          }
        />
        <AutomationCard
          title="MRN Watcher"
          check={automationChecks.mrn_watcher || saudiAutomation.mrn_watcher}
        />
        <AutomationCard
          title="Invoice Cycle"
          check={automationChecks.invoice_cycle || saudiAutomation.invoice_cycle}
        />
      </div>

      {readiness?.next_actions?.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-900 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-emerald-200">
            Current Next Actions
          </h3>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-emerald-100">
            {readiness.next_actions.map((action: string, index: number) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {readiness?.saudi_pending_actions?.length > 0 && (
        <div className="bg-yellow-950/30 border border-yellow-900 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-yellow-200">
            Saudi Pending Actions
          </h3>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-yellow-100">
            {readiness.saudi_pending_actions.map((action: string, index: number) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CheckGroup
          title="India Storage"
          checks={checks.india_storage || {}}
          note="These should pass on India PC."
        />

        <CheckGroup
          title="India Environment"
          checks={checks.india_environment || {}}
          note="These are enough for India development and build testing."
        />

        <CheckGroup
          title="Saudi Environment"
          checks={checks.saudi_environment || {}}
          note="These are expected to remain pending until Saudi PC access."
        />

        <CheckGroup
          title="Saudi Automation"
          checks={checks.saudi_automation || {}}
          note="These become meaningful only after PM2 restart on Saudi PC."
        />
      </div>

      {readiness?.remaining_validation_on_saudi?.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mt-5">
          <h3 className="text-sm font-semibold text-white">
            Saudi PC Validation Still Needed
          </h3>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-zinc-400">
            {readiness.remaining_validation_on_saudi.map(
              (item: string, index: number) => (
                <li key={`${item}-${index}`}>{item}</li>
              )
            )}
          </ul>
        </div>
      )}

      <button
        onClick={load}
        className="mt-5 text-xs border rounded-full px-3 py-1 bg-zinc-950 text-zinc-400 border-zinc-800"
      >
        Refresh
      </button>
    </section>
  );
}