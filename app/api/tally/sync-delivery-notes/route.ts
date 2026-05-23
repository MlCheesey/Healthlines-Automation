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

function dateToTallyYYYYMMDD(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getDefaultFromTo() {
  const state = readState();

  const today = new Date();
  const fallbackFrom = new Date();
  fallbackFrom.setDate(today.getDate() - 7);

  return {
    from: state.last_sync_date || dateToTallyYYYYMMDD(fallbackFrom),
    to: dateToTallyYYYYMMDD(today),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const defaults = getDefaultFromTo();

    const from = url.searchParams.get("from") || defaults.from;
    const to = url.searchParams.get("to") || defaults.to;
    const party = url.searchParams.get("party") || "Davita Care KSA";

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

    const results = [];

    for (const dn of deliveryNotes) {
      if (!dn.dn_number || dn.lines.length === 0) continue;

      const result = recordDeliveryNote({
        client: "davita",
        location: "general",
        po_number: dn.po_number || "UNKNOWN_PO",
        dn_number: dn.dn_number,
        dn_date: dn.dn_date,
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
      from,
      to,
      party,
      total_found: deliveryNotes.length,
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