const fs = require("fs");
const path = require("path");

const DATA_ROOT =
  process.env.DATA_ROOT || path.join(process.cwd(), "data");

const statusDir = path.join(DATA_ROOT, "system-status");
const scheduleFile = path.join(statusDir, "invoice-cycle-schedule.json");

if (!fs.existsSync(statusDir)) {
  fs.mkdirSync(statusDir, { recursive: true });
}

const schedule = {
  last_success_at: "2026-06-30T00:00:00.000Z",
  next_due_hint: "2026-07-14T00:00:00.000Z",
  cycle_days: 14,
  note: "Initialized so deployment on 2026-07-04 has 10 days remaining before first invoice cycle, then continues every 14 days."
};

fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));

console.log("Invoice cycle schedule initialized:");
console.log(scheduleFile);
console.log(schedule);