require("dotenv").config({
  path: ".env.local",
});

const fs = require("fs");
const path = require("path");

const FILE = path.join(
  process.cwd(),
  "data",
  "retry-queue.json"
);

function read() {
  if (!fs.existsSync(FILE))
    return [];

  try {
    return JSON.parse(
      fs.readFileSync(
        FILE,
        "utf8"
      )
    );
  } catch {
    return [];
  }
}

function write(rows) {
  fs.writeFileSync(
    FILE,
    JSON.stringify(rows, null, 2)
  );
}

async function processQueue() {
  const rows = read();

  let changed = false;

  for (const row of rows) {
    if (
      row.status === "Completed"
    ) {
      continue;
    }

    row.attempts =
      Number(
        row.attempts || 0
      ) + 1;

    row.last_attempt_at =
      new Date().toISOString();

    if (row.attempts >= 3) {
      row.status =
        "Failed";
    } else {
      row.status =
        "Retrying";
    }

    changed = true;
  }

  if (changed) {
    write(rows);
  }

  console.log(
    "Retry queue processed"
  );
}

setInterval(
  processQueue,
  30000
);

processQueue();