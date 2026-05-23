import { postToTally } from "@/lib/tally/tallyClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from") || "20260501";
    const to = url.searchParams.get("to") || "20260501";

    const party =
      url.searchParams.get("party") ||
      "Davita Care KSA";

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

    return Response.json({
      success: true,
      from,
      to,
      party,
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