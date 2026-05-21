"use client";

import { useEffect, useState } from "react";
import EditableApprovalTable from "./EditableApprovalTable";

export default function ApprovalQueuePanel() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadApprovals() {
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard-overview");
      const data = await res.json();

      const pendingActions = data?.summary?.pending_actions || [];

      const approvalRows = pendingActions.filter((row: any) => {
        const status = String(row.status || "").toLowerCase();
        return status === "open" || status.includes("pending");
      });

      setApprovals(approvalRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Human Approval Queue
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Review pending AI actions across all locations.
          </p>
        </div>

        <button
          onClick={loadApprovals}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading approvals...</p>
      ) : approvals.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No pending approvals right now.
        </p>
      ) : (
        <EditableApprovalTable rows={approvals} />
      )}
    </section>
  );
}