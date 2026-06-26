export async function GET() {
  return Response.json({
    success: true,
    title: "Saudi Production Validation Checklist",
    purpose:
      "Use this after pulling the latest India-PC code on the Saudi production PC.",

    phases: [
      {
        phase: "1. Pull latest code",
        status: "pending_saudi_access",
        commands: [
          "cd C:\\healthlines\\Healthlines-Automation",
          "git pull",
          "npm run build",
        ],
        expected_result: "Build succeeds without TypeScript or Next.js errors.",
      },
      {
        phase: "2. Restart production app and worker",
        status: "pending_saudi_access",
        commands: [
          "pm2 restart healthlines-app --update-env",
          "pm2 restart healthlines-worker --update-env",
          "pm2 save",
          "pm2 status",
        ],
        expected_result:
          "Both healthlines-app and healthlines-worker show online in PM2.",
      },
      {
        phase: "3. Validate production readiness APIs",
        status: "pending_saudi_access",
        urls: [
          "http://localhost:3000/api/local-final-check",
          "http://localhost:3000/api/production-readiness",
          "http://localhost:3000/api/automation-status",
        ],
        expected_result:
          "local-final-check passes, production-readiness mostly passes, automation-status is fresh.",
      },
      {
        phase: "4. Validate Gmail automation",
        status: "pending_saudi_access",
        urls: [
          "http://localhost:3000/api/gmail/process-new",
          "http://localhost:3000/api/automation-status",
          "http://localhost:3000/api/needs-review",
        ],
        expected_result:
          "Allowed DaVita emails process. Non-allowed senders skip. Needs Review captures uncertain items.",
      },
      {
        phase: "5. Validate Tally delivery note sync",
        status: "pending_saudi_access",
        urls: [
          "http://localhost:3000/api/tally/sync-delivery-notes?dryRun=true",
        ],
        expected_result:
          "Tally delivery notes are read. SALES ledger is not treated as VAT. Missing VAT is flagged for review.",
      },
      {
        phase: "6. Validate MRN watcher",
        status: "pending_saudi_access",
        urls: ["http://localhost:3000/api/mrn-watcher"],
        expected_result:
          "MRN watcher scans real DaVita workbooks without crashing on locked/missing/corrupt files.",
      },
      {
        phase: "7. Validate invoice package safety",
        status: "pending_saudi_access",
        urls: [
          "http://localhost:3000/api/invoice-package-test",
          "http://localhost:3000/api/needs-review",
        ],
        expected_result:
          "Missing rate, VAT review, MRN pending, and MRN overdue lines are blocked and shown in Needs Review.",
      },
      {
        phase: "8. Validate manual review fixing",
        status: "pending_saudi_access",
        dashboard_tabs: ["Needs Review", "Invoices"],
        expected_result:
          "Manual rate/VAT fix works. Re-running invoice test moves fixed lines toward ready status.",
      },
      {
        phase: "9. Validate invoice PDF",
        status: "pending_saudi_access",
        urls: [
          "http://localhost:3000/api/invoice-package-test?generatePdf=true&allowBlocked=true",
        ],
        expected_result:
          "PDF generates, logo appears, totals/VAT are correct, blocked invoices are not silently approved.",
      },
      {
        phase: "10. Final production monitoring",
        status: "pending_saudi_access",
        dashboard_tabs: ["Settings", "Needs Review", "Invoices", "Emails"],
        expected_result:
          "Dashboard clearly shows current system health, open review items, Gmail queue, and invoice cycle status.",
      },
    ],

    stop_conditions: [
      "Do not send real Gmail drafts if invoice lines are blocked.",
      "Do not approve invoice packages with missing rates.",
      "Do not approve invoice packages with VAT review required.",
      "Do not approve invoice packages with MRN pending/overdue unless management allows DN-based invoicing.",
      "Do not treat Tally SALES ledger amount as VAT.",
    ],

    final_result_needed:
      "Saudi PC should show fresh automation status, successful build, PM2 online, and real DaVita workflow validation.",
  });
}