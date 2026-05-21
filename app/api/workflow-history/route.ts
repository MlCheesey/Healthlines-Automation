import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function readSheet(filePath: string, sheetName: string) {
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<any>(sheet, {
    defval: "",
  });
}

export async function GET() {
  try {
    const clientsPath = path.join(
      process.cwd(),
      "data",
      "clients"
    );

    const history: any[] = [];

    if (!fs.existsSync(clientsPath)) {
      return Response.json({
        success: true,
        history,
      });
    }

    for (const client of fs.readdirSync(
      clientsPath
    )) {
      const masterPath = path.join(
        clientsPath,
        client,
        "master.xlsx"
      );

      if (!fs.existsSync(masterPath))
        continue;

      const sheets = [
        "Approval_Actions",
        "Human_Overrides",
        "Pending_Actions",
        "Invoice_Tracker",
        "MRN_Tracker",
        "AI_Log",
      ];

      for (const sheet of sheets) {
        const rows = readSheet(
          masterPath,
          sheet
        );

        for (const row of rows) {
          history.push({
            sheet,
            client,
            ...row,
          });
        }
      }
    }

    history.sort((a, b) => {
      const aDate = new Date(
        a.created_at || 0
      ).getTime();

      const bDate = new Date(
        b.created_at || 0
      ).getTime();

      return bDate - aDate;
    });

    return Response.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error.message ||
          "Workflow history failed",
      },
      { status: 500 }
    );
  }
}