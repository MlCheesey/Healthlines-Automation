"use client";

import { useState } from "react";

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import KPISection from "@/components/dashboard/KPISection";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";

import OperationsStatusBoard from "@/components/dashboard/OperationsStatusBoard";
import SystemOverviewPanel from "@/components/dashboard/SystemOverviewPanel";
import WorkerActivityPanel from "@/components/dashboard/WorkerActivityPanel";
import AnalyticsSummaryPanel from "@/components/dashboard/AnalyticsSummaryPanel";

import OpenActionsPanel from "@/components/dashboard/OpenActionsPanel";
import DeliveryTasksPanel from "@/components/dashboard/DeliveryTasksPanel";
import DeliverySchedulePanel from "@/components/dashboard/DeliverySchedulePanel";
import PackageActionSummaryPanel from "@/components/dashboard/PackageActionSummaryPanel";

import InvoiceCyclePanel from "@/components/dashboard/InvoiceCyclePanel";
import InvoiceLifecyclePanel from "@/components/dashboard/InvoiceLifecyclePanel";
import InvoicePackagePreviewPanel from "@/components/dashboard/InvoicePackagePreviewPanel";
import InvoiceDraftEditorPanel from "@/components/dashboard/InvoiceDraftEditorPanel";
import ApprovedInvoicePackagesPanel from "@/components/dashboard/ApprovedInvoicePackagesPanel";
import InvoiceSendQueuePanel from "@/components/dashboard/InvoiceSendQueuePanel";
import PDFRegistryPanel from "@/components/dashboard/PDFRegistryPanel";
import GmailQueuePanel from "@/components/dashboard/GmailQueuePanel";

import ApprovalQueuePanel from "@/components/dashboard/ApprovalQueuePanel";
import ApprovalActionsPanel from "@/components/dashboard/ApprovalActionsPanel";
import HumanOverridePanel from "@/components/dashboard/HumanOverridePanel";

import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import AuditTimelinePanel from "@/components/dashboard/AuditTimelinePanel";
import SystemLogsPanel from "@/components/dashboard/SystemLogsPanel";
import BackupPanel from "@/components/dashboard/BackupPanel";
import RetryQueuePanel from "@/components/dashboard/RetryQueuePanel";

import AttachmentPanel from "@/components/dashboard/AttachmentPanel";
import ParserHealthPanel from "@/components/dashboard/ParserHealthPanel";
import AIFeedbackPanel from "@/components/dashboard/AIFeedbackPanel";
import LearningMemoryPanel from "@/components/dashboard/LearningMemoryPanel";
import AIActivityPanel from "@/components/dashboard/AIActivityPanel";
import DiscrepancyPanel from "@/components/dashboard/DiscrepancyPanel";

import SecurityStatusPanel from "@/components/dashboard/SecurityStatusPanel";
import WorkflowHealthPanel from "@/components/dashboard/WorkflowHealthPanel";
import WorkflowHistoryPanel from "@/components/dashboard/WorkflowHistoryPanel";
import FinalReadinessPanel from "@/components/dashboard/FinalReadinessPanel";
import ProductionReadinessPanel from "@/components/dashboard/ProductionReadinessPanel";
import SystemLockdownPanel from "@/components/dashboard/SystemLockdownPanel";
import WorkflowSimulationPanel from "@/components/dashboard/WorkflowSimulationPanel";
import LocalTestPanel from "@/components/dashboard/LocalTestPanel";
import AutomationControlPanel from "@/components/dashboard/AutomationControlPanel";

const tabs = [
  "Overview",
  "Deliveries",
  "Invoices",
  "Approvals",
  "Gmail Queue",
  "AI",
  "System",
  "Testing",
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            <KPISection />

            <div className="flex flex-wrap gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm ${
                    activeTab === tab
                      ? "bg-blue-700 text-white"
                      : "bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-8">
              {activeTab === "Overview" && (
                <>
                  <OperationsStatusBoard />
                  <SystemOverviewPanel />
                  <WorkerActivityPanel />
                  <AnalyticsSummaryPanel />
                  <NotificationsPanel />
                  <OpenActionsPanel />
                </>
              )}

              {activeTab === "Deliveries" && (
                <>
                  <DeliveryTasksPanel />
                  <DeliverySchedulePanel />
                  <PackageActionSummaryPanel />
                  <DiscrepancyPanel />
                </>
              )}

              {activeTab === "Invoices" && (
                <>
                  <InvoiceCyclePanel />
                  <InvoiceLifecyclePanel />
                  <InvoicePackagePreviewPanel />
                  <InvoiceDraftEditorPanel />
                  <ApprovedInvoicePackagesPanel />
                  <InvoiceSendQueuePanel />
                  <PDFRegistryPanel />
                </>
              )}

              {activeTab === "Approvals" && (
                <>
                  <ApprovalQueuePanel />
                  <ApprovalActionsPanel />
                  <HumanOverridePanel />
                </>
              )}

              {activeTab === "Gmail Queue" && (
                <>
                  <GmailQueuePanel />
                  <InvoiceSendQueuePanel />
                </>
              )}

              {activeTab === "AI" && (
                <>
                  <AIActivityPanel />
                  <AIFeedbackPanel />
                  <LearningMemoryPanel />
                  <AttachmentPanel />
                  <ParserHealthPanel />
                </>
              )}

              {activeTab === "System" && (
                <>
                  <AutomationControlPanel />
                  <WorkflowHealthPanel />
                  <WorkflowHistoryPanel />
                  <AuditTimelinePanel />
                  <SystemLogsPanel />
                  <BackupPanel />
                  <RetryQueuePanel />
                  <SecurityStatusPanel />
                  <FinalReadinessPanel />
                  <ProductionReadinessPanel />
                </>
              )}

              {activeTab === "Testing" && (
                <>
                  <SystemLockdownPanel />
                  <WorkflowSimulationPanel />
                  <LocalTestPanel />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AIAssistantPanel />
    </main>
  );
}