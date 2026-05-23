import { postToTally } from "@/lib/tally/tallyClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from =
      url.searchParams.get("from") || "20260401";

    const to =
      url.searchParams.get("to") || "20260430";

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
        <SVFROMDATE>${from}</SVFROMDATE>
        <SVTODATE>${to}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="HealthLinesDeliveryNotes" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FILTER>OnlyDeliveryNotes</FILTER>
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
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
`;

    const raw = await postToTally(xml);

    return Response.json({
      success: true,
      from,
      to,
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