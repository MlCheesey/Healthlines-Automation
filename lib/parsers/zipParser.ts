import fs from "fs";

export async function parseZipFile(
  filePath: string
) {
  const stats =
    fs.statSync(filePath);

  return {
    success: true,
    filename:
      filePath.split("/").pop(),

    size_bytes:
      stats.size,

    extracted_files: [],

    parser:
      "zip-parser",
  };
}