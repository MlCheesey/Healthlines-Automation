import { addWorkflowNotification } from "@/lib/operations/workflowNotifications";
import { addRetryJob } from "@/lib/system/retryQueue";
import { registerAttachment } from "@/lib/system/attachmentRegistry";
import { registerPdf } from "@/lib/invoices/pdfRegistry";
import { addToGmailQueue } from "@/lib/gmail/gmailQueue";

async function runLocalWorkflowTest() {
  const timestamp = new Date().toISOString();

  const notification = addWorkflowNotification({
    title: "Local workflow test",
    message: `Workflow test notification created successfully at ${timestamp}.`,
    severity: "info",
    source: "local-test",
  });

  const retry = addRetryJob({
    type: "local-test-job",
    payload: {
      test: true,
      created_at: timestamp,
    },
    error: "Test retry job only",
  });

  const attachment = registerAttachment({
    filename: `test-attachment-${Date.now()}.xlsx`,
    type: ".xlsx",
    parser_status: "test",
    notes: "Local test registry row",
  });

  const pdf = registerPdf({
    client: "davita",
    location: "test_location",
    dn_number: `TEST-DN-${Date.now()}`,
    invoice_number: `TEST-INV-${Date.now()}`,
    pdfPath: "data/test/test.pdf",
  });

  const queue = addToGmailQueue({
    client: "davita",
    package_id: `TEST-PKG-${Date.now()}`,
    subject: "Test Invoice Queue",
    body: "This is a local test queue item. Do not send.",
    recipient: "",
    attachments: [],
  });

  return {
    success: true,
    mode: "write_test",
    warning:
      "This route writes test rows to local registry/queue files. It does not send email or touch real invoices.",
    timestamp,
    notification,
    retry,
    attachment,
    pdf,
    queue,
  };
}

export async function GET() {
  return Response.json({
    success: true,
    route: "/api/local-workflow-test",
    safe: true,
    message:
      "Use POST to run the local write test. GET does not create test rows.",
    post_test_will_create: [
      "workflow notification test row",
      "retry queue test row",
      "attachment registry test row",
      "PDF registry test row",
      "Gmail queue draft test row",
    ],
    does_not_do: [
      "does not send Gmail",
      "does not call Tally",
      "does not mark real delivery rows packaged",
      "does not approve invoices",
    ],
  });
}

export async function POST() {
  try {
    const result = await runLocalWorkflowTest();
    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || "Local workflow test failed",
      },
      { status: 500 }
    );
  }
}