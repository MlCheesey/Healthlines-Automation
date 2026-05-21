import * as XLSX from "xlsx";
import fs from "fs";

export async function parseExcelFile(
  filePath: string
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      "Excel file not found"
    );
  }

  const workbook =
    XLSX.readFile(filePath);

  const sheets =
    workbook.SheetNames.map(
      (sheetName) => {
        const rows =
          XLSX.utils.sheet_to_json(
            workbook.Sheets[
              sheetName
            ],
            {
              defval: "",
            }
          );

        return {
          sheet: sheetName,
          rows,
        };
      }
    );

  return {
    success: true,
    sheets,
    parser: "excel-parser",
  };
}