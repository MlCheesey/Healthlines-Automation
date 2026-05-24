"use client";

import { useState } from "react";

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import KPISection from "@/components/dashboard/KPISection";

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex flex-col">
        <Header />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            <KPISection />

            <div className="space-y-8">
              {activeTab === "Dashboard" && (
                <>
                  <OperationsStatusBoard />
                  <SystemOverviewPanel />
                  <WorkerActivityPanel />
                  <AnalyticsSummaryPanel />
                  <NotificationsPanel />
                  <OpenActionsPanel />
                </>
              )}

              {activeTab === "Delivery Tasks" && (
                <>
                  <DeliveryTasksPanel />
                  <DeliverySchedulePanel />
                  <PackageActionSummaryPanel />
                  <DiscrepancyPanel />
                </>
              )}

              {activeTab === "Locations" && (
                <>
                  <DeliverySchedulePanel />
                  <PackageActionSummaryPanel />
                  <OpenActionsPanel />
                </>
              )}

              {activeTab === "MRNs" && (
                <>
                  <OpenActionsPanel />
                  <NotificationsPanel />
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

              {activeTab === "Emails" && (
                <>
                  <GmailQueuePanel />
                  <InvoiceSendQueuePanel />
                </>
              )}

              {activeTab === "Issues" && (
                <>
                  <ApprovalQueuePanel />
                  <ApprovalActionsPanel />
                  <HumanOverridePanel />
                  <RetryQueuePanel />
                  <NotificationsPanel />
                </>
              )}

              {activeTab === "AI Activity" && (
                <>
                  <AIActivityPanel />
                  <AIFeedbackPanel />
                  <LearningMemoryPanel />
                  <AttachmentPanel />
                  <ParserHealthPanel />
                </>
              )}

              {activeTab === "Settings" && (
                <>
                  <WorkflowHealthPanel />
                  <WorkflowHistoryPanel />
                  <AuditTimelinePanel />
                  <SystemLogsPanel />
                  <BackupPanel />
                  <SecurityStatusPanel />
                  <FinalReadinessPanel />
                  <ProductionReadinessPanel />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}