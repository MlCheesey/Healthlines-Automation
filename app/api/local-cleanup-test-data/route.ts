import fs from "fs";
import path from "path";

const FILES = [
  "data/notifications.json",
  "data/retry-queue.json",
  "data/attachment-registry.json",
  "data/invoice-pdf-registry.json",
  "data/gmail-queue.json",
];

export async function POST() {
  const cleaned: string[] = [];

  for (const file of FILES) {
    const fullPath = path.join(process.cwd(), file);

    if (!fs.existsSync(fullPath)) continue;

    try {
      const rows = JSON.parse(fs.readFileSync(fullPath, "utf8"));

      const filtered = rows.filter((row: any) => {
        const raw = JSON.stringify(row).toLowerCase();
        return !raw.includes("test-");
      });

      fs.writeFileSync(fullPath, JSON.stringify(filtered, null, 2));
      cleaned.push(file);
    } catch {}
  }

  return Response.json({
    success: true,
    cleaned,
  });
}