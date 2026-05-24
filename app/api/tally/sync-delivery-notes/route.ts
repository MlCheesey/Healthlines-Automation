import fs from "fs";
import path from "path";

import { postToTally } from "@/lib/tally/tallyClient";
import { parseTallyDeliveryNotesXml } from "@/lib/tally/tallyDeliveryNoteParser";
import { recordDeliveryNote } from "@/lib/operations/deliveryRecorder";

const STATE_FILE = path.join(
  process.cwd(),
  "data",
  "system-status",
  "tally-delivery-sync.json"
);

function ensureDir() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(data: any) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function isValidTallyDate(value: any) {
  return typeof value === "string" && /^\d{8}$/.test(value);
}

function dateToTallyYYYYMMDD(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    const now = new Date();
    return now.toISOString().slice(0, 10).replace(/-/g, "");
  }

  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getDefaultFromTo() {
  const state = readState();

  const today = new Date();
  const fallbackFrom = new Date();
  fallbackFrom.setDate(today.getDate() - 1);

  const safeLastSyncDate = isValidTallyDate(state.last_sync_date)
    ? state.last_sync_date
    : "";

  return {
    from: safeLastSyncDate || dateToTallyYYYYMMDD(fallbackFrom),
    to: dateToTallyYYYYMMDD(today),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const defaults = getDefaultFromTo();

    const fromRaw = url.searchParams.get("from") || defaults.from;
    const toRaw = url.searchParams.get("to") || defaults.to;

    const from = isValidTallyDate(fromRaw) ? fromRaw : defaults.from;
    const to = isValidTallyDate(toRaw) ? toRaw : defaults.to;

    const party = url.searchParams.get("party") || "Davita Care KSA";
    const limit = Number(url.searchParams.get("limit") || 5);
    const dryRun = url.searchParams.get("dryRun") !== "false";

    const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>HealthLinesDavitaDeliveryNotes</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVFROMDATE>${from}</SVFROMDATE>
        <SVTODATE>${to}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="HealthLinesDavitaDeliveryNotes" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FILTER>OnlyDeliveryNotes</FILTER>
            <FILTER>OnlyDavitaParty</FILTER>
            <FETCH>
              Date,
              VoucherNumber,
              VoucherTypeName,
              PartyLedgerName,
              Reference,
              Narration,
              AllInventoryEntries.StockItemName,
              AllInventoryEntries.BilledQty,
              AllInventoryEntries.Rate,
              AllInventoryEntries.Amount
            </FETCH>
          </COLLECTION>

          <SYSTEM TYPE="Formulae" NAME="OnlyDeliveryNotes">
            $VoucherTypeName = "Delivery Note"
          </SYSTEM>

          <SYSTEM TYPE="Formulae" NAME="OnlyDavitaParty">
            $$IsSysNameEqual:$PartyLedgerName:"${party}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
`;

    const raw = await postToTally(xml);
    const deliveryNotes = parseTallyDeliveryNotesXml(raw);
    const limitedNotes = deliveryNotes.slice(0, limit);

    if (dryRun) {
      return Response.json({
        success: true,
        mode: "dryRun",
        from,
        to,
        party,
        total_found: deliveryNotes.length,
        limited_to: limit,
        sample: limitedNotes,
      });
    }

    const results = [];

    for (const dn of limitedNotes) {
      if (!dn.dn_number || dn.lines.length === 0) continue;

      const result = recordDeliveryNote({
        client: "davita",
        location: "general",
        po_number: dn.po_number || "UNKNOWN_PO",
        dn_number: dn.dn_number,
        dn_date: dn.dn_date || new Date().toISOString().slice(0, 10),
        lines: dn.lines,
        remarks: dn.remarks || `Synced from Tally party: ${dn.party_name}`,
      });

      results.push(result);
    }

    writeState({
      last_sync_at: new Date().toISOString(),
      last_sync_date: to,
      from,
      to,
      party,
      total_found: deliveryNotes.length,
      total_processed: results.filter((r: any) => r.success).length,
      total_duplicates: results.filter((r: any) => r.duplicate).length,
    });

    return Response.json({
      success: true,
      mode: "live",
      from,
      to,
      party,
      total_found: deliveryNotes.length,
      limited_to: limit,
      results,
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}