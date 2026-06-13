import { XMLParser } from "fast-xml-parser";

function asArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: any): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if ("#text" in value) return String(value["#text"] || "").trim();
    if ("_" in value) return String(value._ || "").trim();
  }

  return String(value || "").trim();
}

function cleanNumber(value: any): number {
  const raw = textValue(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const num = Number(raw);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

function parseTallyDate(value: any): string {
  const raw = textValue(value);

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return raw;
}

function parseRate(value: any): number {
  const raw = textValue(value);
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseQty(value: any) {
  const raw = textValue(value);
  const match = raw.match(/-?\d+(\.\d+)?/);
  const qty = match ? Number(match[0]) : 0;

  const unitMatch = raw.match(/[A-Za-z]+/);
  const unit = unitMatch ? unitMatch[0] : "";

  return { qty, unit, raw };
}

function looksLikeVatLedgerName(value: any) {
  const text = String(value || "").toLowerCase().trim();

  if (!text) return false;

  if (
    text === "sales" ||
    text.includes("sales") ||
    text.includes("revenue") ||
    text.includes("davita") ||
    text.includes("customer") ||
    text.includes("party")
  ) {
    return false;
  }

  return (
    text.includes("vat") ||
    text.includes("output vat") ||
    text.includes("output tax") ||
    text.includes("tax payable")
  );
}

function calculateVatPercent(vatAmount: number, taxableAmount: number) {
  if (!vatAmount || !taxableAmount) return 0;

  const percent = (vatAmount / taxableAmount) * 100;

  if (percent <= 0 || percent > 20) return 0;

  return Number(percent.toFixed(2));
}

function extractLineVatAmount(entry: any) {
  let vatAmount = 0;

  const allocations = asArray(entry?.["ACCOUNTINGALLOCATIONS.LIST"]);

  for (const allocation of allocations) {
    const ledgerName = textValue(allocation?.LEDGERNAME);

    if (!looksLikeVatLedgerName(ledgerName)) continue;

    vatAmount += cleanNumber(allocation?.AMOUNT);
  }

  return vatAmount;
}

function getVoucherList(parsed: any) {
  return asArray(
    parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.VOUCHER ||
      parsed?.BODY?.DATA?.COLLECTION?.VOUCHER ||
      parsed?.DATA?.COLLECTION?.VOUCHER ||
      parsed?.COLLECTION?.VOUCHER ||
      parsed?.VOUCHER
  );
}

function parseVoucher(voucher: any) {
  const dnNumber = textValue(voucher?.VOUCHERNUMBER);
  const dnDate = parseTallyDate(voucher?.DATE || voucher?.EFFECTIVEDATE);
  const partyName = textValue(voucher?.PARTYLEDGERNAME);
  const remarks = textValue(voucher?.NARRATION || voucher?.REFERENCE);

  const inventoryEntries = asArray(voucher?.["ALLINVENTORYENTRIES.LIST"]);

  const lines = inventoryEntries.map((entry: any) => {
    const itemName = textValue(entry?.STOCKITEMNAME);
    const qtyInfo = parseQty(entry?.BILLEDQTY || entry?.ACTUALQTY);
    const rate = parseRate(entry?.RATE);
    const taxableAmount = cleanNumber(entry?.AMOUNT);

    const rawTallyVatAmount = extractLineVatAmount(entry);
    const vatPercent = calculateVatPercent(rawTallyVatAmount, taxableAmount);

    const vatAmount = vatPercent > 0 ? rawTallyVatAmount : 0;

    const hasVatLedger = rawTallyVatAmount > 0;
    const vatWasRejected = hasVatLedger && vatPercent === 0;

    return {
      item_code: itemName,
      item_name: itemName,
      delivered_qty: qtyInfo.qty,
      unit: qtyInfo.unit,
      rate,
      taxable_amount: taxableAmount,

      vat_amount: vatAmount,
      vat_percent: vatPercent,
      raw_tally_vat_amount: rawTallyVatAmount,

      taxability:
        vatPercent > 0
          ? "Taxable from Tally VAT ledger"
          : "VAT Review Required",

      tax_reason:
        vatPercent > 0
          ? "VAT amount extracted from a VAT ledger in Tally"
          : vatWasRejected
            ? "Tally VAT value was present but implied impossible VAT rate, so it was blocked"
            : "Tally Delivery Note did not contain a VAT ledger. SALES amount was not treated as VAT.",

      needs_vat_review: vatPercent === 0,
    };
  });

  return {
    po_number: textValue(voucher?.REFERENCE),
    dn_number: dnNumber,
    dn_date: dnDate,
    party_name: partyName,
    remarks,
    lines,
  };
}

export function parseTallyDeliveryNotes(raw: any) {
  const parsed =
    typeof raw === "string"
      ? new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "",
          textNodeName: "#text",
          trimValues: true,
        }).parse(raw)
      : raw;

  return getVoucherList(parsed)
    .map(parseVoucher)
    .filter((voucher: any) => voucher.dn_number);
}

export function parseTallyDeliveryNotesXml(rawXml: string) {
  return parseTallyDeliveryNotes(rawXml);
}

export function parseTallyDeliveryNoteXml(rawXml: string) {
  return parseTallyDeliveryNotes(rawXml);
}

export function parseDeliveryNotesFromTally(raw: any) {
  return parseTallyDeliveryNotes(raw);
}