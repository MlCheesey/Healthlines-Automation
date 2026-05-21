import SystemLockdownPanel from "@/components/dashboard/SystemLockdownPanel";
import WorkflowSimulationPanel from "@/components/dashboard/WorkflowSimulationPanel";
import ProductionReadinessPanel from "@/components/dashboard/ProductionReadinessPanel";
import ParserHealthPanel from "@/components/dashboard/ParserHealthPanel";
import AnalyticsSummaryPanel from "@/components/dashboard/AnalyticsSummaryPanel";
import LocalTestPanel from "@/components/dashboard/LocalTestPanel";
import PackageActionSummaryPanel from "@/components/dashboard/PackageActionSummaryPanel";
import FinalReadinessPanel from "@/components/dashboard/FinalReadinessPanel";
import InvoiceLifecyclePanel from "@/components/dashboard/InvoiceLifecyclePanel";
import WorkerActivityPanel from "@/components/dashboard/WorkerActivityPanel";
import DiscrepancyPanel from "@/components/dashboard/DiscrepancyPanel";
import LearningMemoryPanel from "@/components/dashboard/LearningMemoryPanel";
import OpenActionsPanel from "@/components/dashboard/OpenActionsPanel";
import WorkflowHealthPanel from "@/components/dashboard/WorkflowHealthPanel";
import InvoicePackagePreviewPanel from "@/components/dashboard/InvoicePackagePreviewPanel";
import AttachmentPanel from "@/components/dashboard/AttachmentPanel";
import AuditTimelinePanel from "@/components/dashboard/AuditTimelinePanel";
import RetryQueuePanel from "@/components/dashboard/RetryQueuePanel";
import PDFRegistryPanel from "@/components/dashboard/PDFRegistryPanel";
import DeliverySchedulePanel from "@/components/dashboard/DeliverySchedulePanel";
import GmailQueuePanel from "@/components/dashboard/GmailQueuePanel";
import SecurityStatusPanel from "@/components/dashboard/SecurityStatusPanel";
import InvoiceDraftEditorPanel from "@/components/dashboard/InvoiceDraftEditorPanel";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import AIFeedbackPanel from "@/components/dashboard/AIFeedbackPanel";
import InvoiceSendQueuePanel from "@/components/dashboard/InvoiceSendQueuePanel";
import OperationsStatusBoard from "@/components/dashboard/OperationsStatusBoard";
import BackupPanel from "@/components/dashboard/BackupPanel";
import ApprovedInvoicePackagesPanel from "@/components/dashboard/ApprovedInvoicePackagesPanel";
import SystemLogsPanel from "@/components/dashboard/SystemLogsPanel";

import WorkflowHistoryPanel from "@/components/dashboard/WorkflowHistoryPanel";
import AutomationControlPanel from "@/components/dashboard/AutomationControlPanel";
import HumanOverridePanel from "@/components/dashboard/HumanOverridePanel";
import SystemOverviewPanel from "@/components/dashboard/SystemOverviewPanel";
import ApprovalActionsPanel from "@/components/dashboard/ApprovalActionsPanel";
import InvoiceCyclePanel from "@/components/dashboard/InvoiceCyclePanel";

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import KPISection from "@/components/dashboard/KPISection";
import DeliveryTasksPanel from "@/components/dashboard/DeliveryTasksPanel";
import ApprovalQueuePanel from "@/components/dashboard/ApprovalQueuePanel";
import AIActivityPanel from "@/components/dashboard/AIActivityPanel";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";

export default async function DashboardPage() {

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-8">
            <KPISection />

            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                <OperationsStatusBoard />

                <SystemOverviewPanel />

                <AutomationControlPanel />

                <WorkflowHistoryPanel />

                <HumanOverridePanel />

                <ApprovalActionsPanel />

                <InvoiceCyclePanel />

                <InvoiceCyclePanel />

                <AnalyticsSummaryPanel />

                <ApprovedInvoicePackagesPanel />

                <DeliveryTasksPanel />

                <ApprovalQueuePanel />

                <AIActivityPanel />

                <SystemLogsPanel />

                <PackageActionSummaryPanel />

                <BackupPanel />

                <InvoiceCyclePanel />

                <DeliverySchedulePanel />

                <ApprovedInvoicePackagesPanel />
                
                <BackupPanel />

                <InvoiceSendQueuePanel />

                <NotificationsPanel />

                <AIFeedbackPanel />

                <InvoiceDraftEditorPanel />

                <SecurityStatusPanel />

                <GmailQueuePanel />

                <PDFRegistryPanel />

                <AttachmentPanel />

                <AuditTimelinePanel />

                <RetryQueuePanel />

                <InvoicePackagePreviewPanel />

                <PDFRegistryPanel />

                <WorkflowHealthPanel />

                <AttachmentPanel />
                
                <AuditTimelinePanel />

                <RetryQueuePanel />

                <OpenActionsPanel />

                <DiscrepancyPanel />

                <LearningMemoryPanel />
                
                <InvoiceLifecyclePanel />
                 
                <WorkerActivityPanel />

                <FinalReadinessPanel />

                <LocalTestPanel />

                <ParserHealthPanel />

                <SystemLockdownPanel />

                <WorkflowSimulationPanel />
                
                <ProductionReadinessPanel />
              </div>

              <div>{/* future widgets */}</div>
            </div>
          </div>
        </div>
      </div>

      <AIAssistantPanel />
    </main>
  );
}