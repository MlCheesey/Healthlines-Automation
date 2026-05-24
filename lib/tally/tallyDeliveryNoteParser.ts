import { XMLParser } from "fast-xml-parser";

function asArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractText(value: any): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (value["#text"] !== undefined) return extractText(value["#text"]);
    if (value._ !== undefined) return extractText(value._);
    if (value.VALUE !== undefined) return extractText(value.VALUE);
    if (value.NAME !== undefined) return extractText(value.NAME);

    const possible = Object.values(value).find(
      (v) => typeof v === "string" || typeof v === "number"
    );

    if (possible !== undefined) return extractText(possible);
  }

  return "";
}

function cleanNumber(value: any) {
  const raw = extractText(value).replace(/,/g, "");
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function extractUnitFromQty(value: any) {
  return extractText(value).replace(/[0-9., -]/g, "").trim();
}

function tallyDateToIso(value: any) {
  const raw = extractText(value);

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return raw;
}

function pick(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return "";
}

export function parseTallyDeliveryNotesXml(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  const parsed = parser.parse(xml);

  const collection =
    parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION ||
    parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA ||
    {};

  const vouchers = asArray(
    collection.VOUCHER ||
      collection.TALLYMESSAGE?.VOUCHER ||
      parsed?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE?.VOUCHER
  );

  return vouchers.map((voucher: any) => {
    const entries = asArray(
      voucher["ALLINVENTORYENTRIES.LIST"] ||
        voucher.ALLINVENTORYENTRIES ||
        voucher.INVENTORYENTRIES ||
        voucher["INVENTORYENTRIES.LIST"]
    );

    const lines = entries.map((entry: any) => {
      const qtyRaw = pick(entry, [
        "BILLEDQTY",
        "ACTUALQTY",
        "QTY",
        "BILLEDQUANTITY",
      ]);

      const stockName = pick(entry, [
        "STOCKITEMNAME",
        "STOCKITEM",
        "ITEMNAME",
      ]);

      return {
        item_code: extractText(stockName),
        item_name: extractText(stockName),
        delivered_qty: cleanNumber(qtyRaw),
        unit: extractUnitFromQty(qtyRaw),
        rate: cleanNumber(pick(entry, ["RATE", "BASICRATE"])) || null,
      };
    });

    return {
      po_number: extractText(
        pick(voucher, ["REFERENCE", "REFERENCENO", "ORDERNO"])
      ),
      dn_number: extractText(
        pick(voucher, ["VOUCHERNUMBER", "VOUCHERNO", "NUMBER"])
      ),
      dn_date: tallyDateToIso(pick(voucher, ["DATE", "VOUCHERDATE"])),
      party_name: extractText(pick(voucher, ["PARTYLEDGERNAME", "PARTYNAME"])),
      remarks: extractText(pick(voucher, ["NARRATION"])),
      lines,
    };
  });
}