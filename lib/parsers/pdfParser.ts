import fs from "fs";
import * as pdf from "pdf-parse";

export async function parsePdfFile(
  filePath: string
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      "PDF file not found"
    );
  }

  const buffer =
    fs.readFileSync(filePath);

  const parsed =
    await (pdf as any)(buffer);

  return {
    success: true,
    parser: "pdf-parser",

    pages:
      parsed.numpages || 0,

    extracted_text:
      parsed.text || "",

    info:
      parsed.info || {},
  };
}