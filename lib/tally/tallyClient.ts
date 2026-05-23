const TALLY_URL =
  process.env.TALLY_URL ||
  "http://localhost:9000";

export async function postToTally(
  xml: string
) {
  const res = await fetch(
    TALLY_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "text/xml;charset=utf-8",
      },
      body: xml,
    }
  );

  const text =
    await res.text();

  if (!res.ok) {
    throw new Error(
      `Tally request failed: ${res.status} ${text}`
    );
  }

  return text;
}

export async function testTallyConnection() {
  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>HealthLinesCompanyList</ID>
  </HEADER>

  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>
          $$SysName:XML
        </SVEXPORTFORMAT>
      </STATICVARIABLES>

      <TDL>
        <TDLMESSAGE>
          <COLLECTION
            NAME="HealthLinesCompanyList"
            ISMODIFY="No"
          >
            <TYPE>Company</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
`;

  return postToTally(xml);
}