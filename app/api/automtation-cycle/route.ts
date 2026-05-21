import { internalFetch } from "@/lib/system/internalFetch";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

export async function GET() {
  try {
    const results: any = {
      started_at: new Date().toISOString(),
      tasks: [],
    };

    try {
      const gmail = await internalFetch("/api/gmail/process-new");
      const gmailResult = await gmail.json();

      results.tasks.push({
        task: "gmail_process",
        success: gmail.ok,
        result: gmailResult,
      });
    } catch (error: any) {
      results.tasks.push({
        task: "gmail_process",
        success: false,
        error: error.message || "gmail failed",
      });
    }

    try {
      const mrn = await internalFetch("/api/mrn-watcher");
      const mrnResult = await mrn.json();

      results.tasks.push({
        task: "mrn_watcher",
        success: mrn.ok,
        result: mrnResult,
      });
    } catch (error: any) {
      results.tasks.push({
        task: "mrn_watcher",
        success: false,
        error: error.message || "mrn failed",
      });
    }

    results.completed_at = new Date().toISOString();

    logSystemEvent("automation_cycle_completed", "Automation cycle completed", results);

    return Response.json({
      success: true,
      automation_cycle: results,
    });
  } catch (error: any) {
    logSystemError("automation-cycle-api", error);

    return Response.json(
      { error: error.message || "Automation cycle failed" },
      { status: 500 }
    );
  }
}