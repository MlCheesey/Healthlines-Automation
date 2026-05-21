import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoiceCycleExcel } from "@/lib/invoices/generateInvoiceCycleExcel";
import { generateInvoicePdf } from "@/lib/invoices/generateInvoicePdf";
import { markInvoiceGroupsPackaged } from "@/lib/invoices/invoiceStatusUpdater";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const client = url.searchParams.get("client") || DEFAULT_CLIENT_ID;

    const cycle = buildInvoiceCycle(client);

    if (cycle.read_errors?.length > 0) {
      logSystemError("invoice-package-worker-workbook-access", cycle.read_errors);

      return Response.json(
        {
          success: false,
          blocked: true,
          reason: "workbook_access_error",
          message:
            "Worker skipped invoice package because one or more Excel workbooks could not be accessed.",
          read_errors: cycle.read_errors,
        },
        { status: 423 }
      );
    }

    const blockedGroups = cycle.invoice_groups.filter(
      (group: any) => group.has_missing_rate
    );

    const readyGroups = cycle.invoice_groups.filter(
      (group: any) => !group.has_missing_rate
    );

    const packageId = `PKG-${Date.now()}`;

    const excelPath = await generateInvoiceCycleExcel(
      cycle.invoice_rows.map((row: any) => ({
        client,
        location: row.location,
        po_number: row.po_number,
        dn_number: row.dn_number,
        mrn_number: row.mrn_number || "",
        mrn_status: row.mrn_status || "Pending",
        invoice_number: row.dn_number ? `INV-${row.dn_number}` : "",
        qty: Number(row.qty || 0),
        amount:
          row.rate === ""
            ? 0
            : Number(row.qty || 0) * Number(row.rate || 0),
        status: row.status,
      }))
    );

    const pdfs: any[] = [];

    for (const group of readyGroups) {
      const pdfPath = await generateInvoicePdf({
        invoice_number: group.invoice_number,
        client: group.client,
        location: group.location,
        po_number: group.po_number,
        dn_number: group.dn_number,
        dn_date: group.dn_date,
        mrn_number: group.mrn_number || "",
        mrn_status: group.mrn_status || "Pending",
        items: group.items.map((item: any) => ({
          item_code: item.item_code || "",
          item_name: item.item_name,
          qty: Number(item.qty || 0),
          unit: item.unit || "",
          rate: Number(item.rate),
          batch: item.batch || "",
          expiry: item.expiry || "",
          vat_percent: item.vat_percent,
          taxability: item.taxability || "",
          tax_reason: item.tax_reason || "",
        })),
      });

      pdfs.push({
        invoice_number: group.invoice_number,
        dn_number: group.dn_number,
        mrn_number: group.mrn_number || "",
        mrn_status: group.mrn_status || "Pending",
        pdfPath,
      });
    }

    const markResult =
      readyGroups.length > 0
        ? markInvoiceGroupsPackaged({
            client,
            package_id: packageId,
            groups: readyGroups,
          })
        : null;

    logSystemEvent(
      "invoice_worker_package_prepared",
      "Invoice worker prepared package",
      {
        client,
        package_id: packageId,
        excelPath,
        pdf_count: pdfs.length,
        blocked_groups: blockedGroups.length,
        skipped_already_packaged: cycle.skipped_already_packaged.length,
        mrn_pending: cycle.mrn_pending.length,
        mrn_overdue: cycle.mrn_overdue.length,
      }
    );

    return Response.json({
      success: true,
      mode: "worker_prepared_for_human_approval",
      client,
      package_id: packageId,
      excelPath,
      pdf_count: pdfs.length,
      pdfs,
      markResult,
      blocked_invoice_groups: blockedGroups,
      missing_rate_count: cycle.missing_rates.length,
      missing_rate_rows: cycle.missing_rates,
      skipped_already_packaged: cycle.skipped_already_packaged,
      counts: {
        total_delivery_rows: cycle.invoice_rows.length,
        total_invoice_groups: cycle.invoice_groups.length,
        ready_invoice_groups: readyGroups.length,
        blocked_invoice_groups: blockedGroups.length,
        skipped_already_packaged: cycle.skipped_already_packaged.length,
        mrn_received: cycle.mrn_received.length,
        mrn_pending: cycle.mrn_pending.length,
        mrn_overdue: cycle.mrn_overdue.length,
        missing_rates: cycle.missing_rates.length,
      },
    });
  } catch (error: any) {
    logSystemError("invoice-package-worker", error);

    return Response.json(
      { error: error.message || "Invoice worker failed" },
      { status: 500 }
    );
  }
}