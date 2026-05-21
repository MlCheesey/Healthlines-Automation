import { addWorkflowNotification } from "@/lib/operations/workflowNotifications";
import { addRetryJob } from "@/lib/system/retryQueue";
import { registerAttachment } from "@/lib/system/attachmentRegistry";
import { registerPdf } from "@/lib/invoices/pdfRegistry";
import { addToGmailQueue } from "@/lib/gmail/gmailQueue";

export async function POST() {
  const notification = addWorkflowNotification({
    title: "Local workflow test",
    message: "Workflow test notification created successfully.",
    severity: "info",
    source: "local-test",
  });

  const retry = addRetryJob({
    type: "local-test-job",
    payload: { test: true },
    error: "Test retry job only",
  });

  const attachment = registerAttachment({
    filename: "test-attachment.xlsx",
    type: ".xlsx",
    parser_status: "test",
    notes: "Local test registry row",
  });

  const pdf = registerPdf({
    client: "davita",
    location: "test_location",
    dn_number: "TEST-DN",
    invoice_number: "TEST-INV",
    pdfPath: "data/test/test.pdf",
  });

  const queue = addToGmailQueue({
    client: "davita",
    package_id: "TEST-PKG",
    subject: "Test Invoice Queue",
    body: "This is a local test queue item.",
    recipient: "",
    attachments: [],
  });

  return Response.json({
    success: true,
    notification,
    retry,
    attachment,
    pdf,
    queue,
  });
}