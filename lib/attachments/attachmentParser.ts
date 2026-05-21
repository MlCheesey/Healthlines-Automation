import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type ParsedAttachment = {
  filename: string;
  mime_type?: string;
  text: string;
  parser_status: "parsed" | "unsupported" | "failed";
  notes?: string;
};

function getExt(filename: string) {
  return path.extname(filename || "").toLowerCase();
}

function parseTxt(filePath: string): ParsedAttachment {
  return {
    filename: path.basename(filePath),
    mime_type: "text/plain",
    text: fs.readFileSync(filePath, "utf8"),
    parser_status: "parsed",
  };
}

function parseExcel(filePath: string): ParsedAttachment {
  const workbook = XLSX.readFile(filePath);
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    parts.push(`\n--- Sheet: ${sheetName} ---\n`);
    parts.push(JSON.stringify(rows, null, 2));
  }

  return {
    filename: path.basename(filePath),
    mime_type: "spreadsheet",
    text: parts.join("\n"),
    parser_status: "parsed",
  };
}

export async function parseAttachmentFile(filePath: string): Promise<ParsedAttachment> {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        filename: path.basename(filePath),
        text: "",
        parser_status: "failed",
        notes: "File not found",
      };
    }

    const ext = getExt(filePath);

    if (ext === ".txt" || ext === ".csv") {
      return parseTxt(filePath);
    }

    if (ext === ".xlsx" || ext === ".xls") {
      return parseExcel(filePath);
    }

    if (ext === ".pdf") {
      return {
        filename: path.basename(filePath),
        mime_type: "application/pdf",
        text: "",
        parser_status: "unsupported",
        notes:
          "PDF parsing placeholder. Add PDF parser/OCR later after Gmail OAuth and document samples.",
      };
    }

    if (ext === ".zip") {
      return {
        filename: path.basename(filePath),
        mime_type: "application/zip",
        text: "",
        parser_status: "unsupported",
        notes:
          "ZIP parsing placeholder. Add ZIP extraction after Gmail attachment download is connected.",
      };
    }

    return {
      filename: path.basename(filePath),
      text: "",
      parser_status: "unsupported",
      notes: `Unsupported file type: ${ext}`,
    };
  } catch (error: any) {
    return {
      filename: path.basename(filePath),
      text: "",
      parser_status: "failed",
      notes: error.message || "Attachment parsing failed",
    };
  }
}

export async function parseAttachmentStub({
  filename,
  mime_type,
}: {
  filename: string;
  mime_type?: string;
}): Promise<ParsedAttachment> {
  return {
    filename,
    mime_type,
    text: "",
    parser_status: "unsupported",
    notes:
      "Attachment metadata detected. Actual Gmail attachment file parsing will connect after Gmail OAuth.",
  };
}