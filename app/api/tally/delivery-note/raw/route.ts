import { postToTally } from "@/lib/tally/tallyClient";

export async function GET() {
  try {
    const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>HealthLinesDeliveryNotes</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="HealthLinesDeliveryNotes" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
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
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
`;

    const raw = await postToTally(xml);

    return Response.json({
      success: true,
      raw,
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