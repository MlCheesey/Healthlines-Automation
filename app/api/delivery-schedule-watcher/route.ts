import fs from "fs";
import path from "path";

import { checkDeliverySchedules } from "@/lib/operations/deliveryScheduleWatcher";

export async function GET() {
  const clientsDir = path.join(
    process.cwd(),
    "data",
    "clients"
  );

  let totalOverdue = 0;

  const results: any[] = [];

  if (fs.existsSync(clientsDir)) {
    const clients = fs
      .readdirSync(clientsDir)
      .filter((f) =>
        fs
          .statSync(path.join(clientsDir, f))
          .isDirectory()
      );

    for (const client of clients) {
      const files = fs
        .readdirSync(
          path.join(clientsDir, client)
        )
        .filter(
          (f) =>
            f.endsWith(".xlsx") &&
            f !== "master.xlsx"
        );

      for (const file of files) {
        const workbookPath = path.join(
          clientsDir,
          client,
          file
        );

        const result =
          checkDeliverySchedules(
            workbookPath
          );

        totalOverdue +=
          result.overdue;

        results.push({
          client,
          file,
          ...result,
        });
      }
    }
  }

  return Response.json({
    success: true,
    total_overdue:
      totalOverdue,
    results,
  });
}