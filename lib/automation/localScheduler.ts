import cron from "node-cron";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

let started = false;

export function startLocalScheduler() {
  if (started) return;
  started = true;

  cron.schedule("*/5 * * * *", async () => {
    try {
      logSystemEvent("scheduler", "Local automation cycle tick");
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation-cycle`);
    } catch (error) {
      logSystemError("local_scheduler_automation_cycle", error);
    }
  });

  cron.schedule("0 8 * * *", async () => {
    try {
      logSystemEvent("scheduler", "Local MRN watcher tick");
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/mrn-watcher`);
    } catch (error) {
      logSystemError("local_scheduler_mrn_watcher", error);
    }
  });

  logSystemEvent("scheduler", "Local scheduler started");
}