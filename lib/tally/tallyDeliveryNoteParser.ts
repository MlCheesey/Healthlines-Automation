import { XMLParser } from "fast-xml-parser";

function asArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: any) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanNumber(value: any) {
  const raw = cleanText(value).replace(/,/g, "");
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function tallyDateToIso(value: any) {
  const raw = cleanText(value);

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return raw;
}

export function parseTallyDeliveryNotesXml(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
  });

  const parsed = parser.parse(xml);

  const vouchers = asArray(
    parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.VOUCHER ||
      parsed?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE?.VOUCHER ||
      parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE?.VOUCHER
  );

  return vouchers.map((voucher: any) => {
    const entries = asArray(
      voucher["ALLINVENTORYENTRIES.LIST"] ||
        voucher.ALLINVENTORYENTRIES ||
        voucher.INVENTORYENTRIES
    );

    return {
      po_number: cleanText(voucher.REFERENCE || voucher.REFERENCENO || ""),
      dn_number: cleanText(voucher.VOUCHERNUMBER || voucher.VOUCHERNO || ""),
      dn_date: tallyDateToIso(voucher.DATE || ""),
      party_name: cleanText(voucher.PARTYLEDGERNAME || ""),
      remarks: cleanText(voucher.NARRATION || ""),
      lines: entries.map((entry: any) => ({
        item_code: cleanText(entry.STOCKITEMNAME || ""),
        item_name: cleanText(entry.STOCKITEMNAME || ""),
        delivered_qty: cleanNumber(
          entry.BILLEDQTY || entry.ACTUALQTY || entry.QTY || 0
        ),
        unit: cleanText(entry.BILLEDQTY || "").replace(/[0-9., -]/g, "").trim(),
        rate: cleanNumber(entry.RATE || 0) || null,
      })),
    };
  });
}