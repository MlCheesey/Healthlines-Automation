import OperationsStatusBoard from "@/components/dashboard/OperationsStatusBoard";
import InvoiceCyclePanel from "@/components/dashboard/InvoiceCyclePanel";
import InvoiceDraftEditorPanel from "@/components/dashboard/InvoiceDraftEditorPanel";
import InvoiceSendQueuePanel from "@/components/dashboard/InvoiceSendQueuePanel";
import ApprovedInvoicePackagesPanel from "@/components/dashboard/ApprovedInvoicePackagesPanel";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import BackupPanel from "@/components/dashboard/BackupPanel";
import AIFeedbackPanel from "@/components/dashboard/AIFeedbackPanel";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-6">
        {/* HEADER */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              HealthLines AI Operations
            </h1>

            <p className="text-zinc-500 mt-2">
              AI-assisted medical supply operations control center.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500">Mode</p>
              <p className="text-sm text-emerald-400">
                Human Controlled
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500">Environment</p>
              <p className="text-sm text-yellow-400">
                Local Development
              </p>
            </div>
          </div>
        </section>

        {/* OPERATIONS BOARD */}
        <OperationsStatusBoard />

        {/* PRIMARY OPERATIONS */}
        <div className="grid xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <InvoiceCyclePanel />
            <InvoiceDraftEditorPanel />
            <InvoiceSendQueuePanel />
          </div>

          <div className="space-y-6">
            <ApprovedInvoicePackagesPanel />
            <NotificationsPanel />
          </div>
        </div>

        {/* SECONDARY PANELS */}
        <div className="grid xl:grid-cols-2 gap-6">
          <BackupPanel />
          <AIFeedbackPanel />
        </div>

        {/* FOOTER */}
        <footer className="border-t border-zinc-900 pt-6 pb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">
                HealthLines AI Automation Platform
              </p>

              <p className="text-xs text-zinc-700 mt-1">
                AI observes, prepares, drafts and recommends. Humans approve operational actions.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <span>Invoice Workflow</span>
              <span>•</span>
              <span>MRN Tracking</span>
              <span>•</span>
              <span>Delivery Control</span>
              <span>•</span>
              <span>Audit Logging</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}