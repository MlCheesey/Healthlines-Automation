import { buildInvoiceCycle } from "@/lib/invoices/buildInvoiceCycle";
import { generateInvoicePdf } from "@/lib/invoices/generateInvoicePdf";
import { DEFAULT_CLIENT_ID } from "@/lib/config/clientProfiles";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function asBoolean(value: string | null) {
  return String(value || "").toLowerCase() === "true";
}

function safeString(value: any) {
  return String(value || "").trim();
}

function groupHasVatReview(group: any) {
  return (group.items || []).some((item: any) => {
    const explicitNeedsReview =
      item.needs_vat_review === true ||
      String(item.needs_vat_review || "").toLowerCase() === "yes" ||
      String(item.needs_vat_review || "").toLowerCase() === "true";

    const vatPercentMissing =
      item.vat_percent === undefined ||
      item.vat_percent === null ||
      item.vat_percent === "";

    const vatReviewText =
      String(item.taxability || "").toLowerCase().includes("review") ||
      String(item.tax_reason || "").toLowerCase().includes("review") ||
      String(item.tax_reason || "").toLowerCase().includes("did not contain a vat ledger");

    return explicitNeedsReview || vatPercentMissing || vatReviewText;
  });
}

function groupHasMissingRate(group: any) {
  return (
    group.has_missing_rate ||
    (group.items || []).some((item: any) => {
      const rate = item.rate;
      return rate === undefined || rate === null || rate === "" || Number.isNaN(Number(rate));
    })
  );
}

function getBlockedReasons(group: any) {
  const reasons: string[] = [];

  if (groupHasMissingRate(group)) {
    reasons.push("Missing unit rate");
  }

  if (groupHasVatReview(group)) {
    reasons.push("VAT review required");
  }

  const mrnStatus = String(group.mrn_status || "").toLowerCase();

  if (mrnStatus.includes("pending")) {
    reasons.push("MRN pending");
  }

  if (mrnStatus.includes("overdue")) {
    reasons.push("MRN overdue");
  }

  if (group.invoice_package_id || group.invoice_number_already_exists) {
    reasons.push("Already packaged/invoiced");
  }

  return reasons;
}

function summarizeGroup(group: any) {
  const blockedReasons = getBlockedReasons(group);

  return {
    client: group.client,
    location: group.location,
    po_number: group.po_number,
    dn_number: group.dn_number,
    dn_date: group.dn_date,
    mrn_number: group.mrn_number,
    mrn_status: group.mrn_status,
    invoice_number: group.invoice_number,
    invoice_package_id: group.invoice_package_id,
    source_workbook: group.source_workbook,
    item_count: Array.isArray(group.items) ? group.items.length : 0,
    blocked: blockedReasons.length > 0,
    blocked_reasons: blockedReasons,
    has_missing_rate: groupHasMissingRate(group),
    has_vat_review: groupHasVatReview(group),
    items: (group.items || []).map((item: any) => ({
      item_code: item.item_code || "",
      item_name: item.item_name || "",
      qty: item.qty ?? item.delivered_qty ?? "",
      unit: item.unit || "",
      rate: item.rate ?? "",
      taxable_amount: item.taxable_amount ?? "",
      vat_amount: item.vat_amount ?? "",
      vat_percent: item.vat_percent ?? "",
      taxability: item.taxability || "",
      tax_reason: item.tax_reason || "",
      needs_vat_review: item.needs_vat_review ?? "",
      batch: item.batch || "",
      expiry: item.expiry || "",
    })),
  };
}

function findTargetGroup(groups: any[], dnNumber: string, invoiceNumber: string) {
  if (dnNumber) {
    return groups.find(
      (group: any) =>
        safeString(group.dn_number).toLowerCase() === dnNumber.toLowerCase()
    );
  }

  if (invoiceNumber) {
    return groups.find(
      (group: any) =>
        safeString(group.invoice_number).toLowerCase() === invoiceNumber.toLowerCase()
    );
  }

  return groups[0] || null;
}

function mapGroupToInvoiceData(group: any) {
  return {
    invoice_number: group.invoice_number,
    client: group.client,
    location: group.location,
    po_number: group.po_number || "",
    dn_number: group.dn_number || "",
    dn_date: group.dn_date || "",
    mrn_number: group.mrn_number || "",
    mrn_status: group.mrn_status || "Pending",
    items: (group.items || []).map((item: any) => ({
      item_code: item.item_code || "",
      item_name: item.item_name || "",
      qty: Number(item.qty ?? item.delivered_qty ?? 0),
      unit: item.unit || "",
      rate: Number(item.rate),
      batch: item.batch || "",
      expiry: item.expiry || "",
      vat_percent:
        item.vat_percent === undefined || item.vat_percent === null || item.vat_percent === ""
          ? undefined
          : Number(item.vat_percent),
      taxability: item.taxability || "",
      tax_reason: item.tax_reason || "",
    })),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const client = url.searchParams.get("client") || DEFAULT_CLIENT_ID;
    const dnNumber = safeString(url.searchParams.get("dn"));
    const invoiceNumber = safeString(url.searchParams.get("invoice"));
    const generatePdf = asBoolean(url.searchParams.get("generatePdf"));
    const allowBlocked = asBoolean(url.searchParams.get("allowBlocked"));

    const cycle = buildInvoiceCycle(client);
    const groups = cycle.invoice_groups || [];

    const targetGroup = findTargetGroup(groups, dnNumber, invoiceNumber);
    const summaries = groups.map(summarizeGroup);

    if (!targetGroup) {
      return Response.json({
        success: true,
        mode: "preview",
        client,
        message: "No invoice group found.",
        requested: {
          dn: dnNumber,
          invoice: invoiceNumber,
          generatePdf,
          allowBlocked,
        },
        counts: cycle.counts,
        summary: {
          total_groups: summaries.length,
          ready_groups: summaries.filter((group: any) => !group.blocked).length,
          blocked_groups: summaries.filter((group: any) => group.blocked).length,
          missing_rates: cycle.missing_rates?.length || 0,
          mrn_pending: cycle.mrn_pending?.length || 0,
          mrn_overdue: cycle.mrn_overdue?.length || 0,
        },
        groups: summaries,
        missing_rates: cycle.missing_rates || [],
        mrn_pending: cycle.mrn_pending || [],
        mrn_overdue: cycle.mrn_overdue || [],
        read_errors: cycle.read_errors || [],
      });
    }

    const targetSummary = summarizeGroup(targetGroup);

    if (!generatePdf) {
      return Response.json({
        success: true,
        mode: "preview_only",
        client,
        message:
          "Invoice package test preview only. No PDF generated, no Excel rows updated, no email sent.",
        requested: {
          dn: dnNumber,
          invoice: invoiceNumber,
          generatePdf,
          allowBlocked,
        },
        counts: cycle.counts,
        target: targetSummary,
        groups: summaries,
        missing_rates: cycle.missing_rates || [],
        mrn_pending: cycle.mrn_pending || [],
        mrn_overdue: cycle.mrn_overdue || [],
        read_errors: cycle.read_errors || [],
      });
    }

    if (targetSummary.blocked && !allowBlocked) {
      return Response.json({
        success: false,
        blocked: true,
        mode: "pdf_generation_blocked",
        client,
        message:
          "PDF generation blocked because this invoice group needs review. Add allowBlocked=true only for layout testing.",
        blocked_reasons: targetSummary.blocked_reasons,
        target: targetSummary,
      });
    }

    if (groupHasMissingRate(targetGroup)) {
      return Response.json({
        success: false,
        blocked: true,
        mode: "pdf_generation_blocked",
        client,
        message:
          "PDF generation blocked because at least one line has missing unit rate. This cannot be bypassed.",
        blocked_reasons: getBlockedReasons(targetGroup),
        target: targetSummary,
      });
    }

    const pdfPath = await generateInvoicePdf(mapGroupToInvoiceData(targetGroup));

    logSystemEvent("invoice_package_test_pdf_generated", "Test invoice PDF generated", {
      client,
      dn_number: targetGroup.dn_number || "",
      invoice_number: targetGroup.invoice_number || "",
      pdfPath,
      blocked_reasons: targetSummary.blocked_reasons,
      allowBlocked,
    });

    return Response.json({
      success: true,
      mode: "test_pdf_generated",
      client,
      message:
        "Test invoice PDF generated only. No Delivery_History rows updated, no package marked, no email sent.",
      pdfPath,
      target: targetSummary,
    });
  } catch (error: any) {
    logSystemError("invoice-package-test", error);

    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}