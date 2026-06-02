const fs = require("fs");
const path = require("path");

const ROOTS = ["app", "lib"];
const IMPORT_LINE = `import { DATA_ROOT } from "@/lib/config/storage";`;

const SKIP_FILES = new Set([
  "lib/config/storage.ts",
]);

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, files);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
}

function hasDataRootImport(text) {
  return text.includes(`@/lib/config/storage`);
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const normalized = normalize(file);

    if (SKIP_FILES.has(normalized)) {
      continue;
    }

    let text = fs.readFileSync(file, "utf8");

    const usesDataRoot = /\bDATA_ROOT\b/.test(text);
    const alreadyImports = hasDataRootImport(text);

    if (usesDataRoot && !alreadyImports) {
      text = IMPORT_LINE + "\n" + text;
      fs.writeFileSync(file, text);
      console.log("fixed:", file);
    }
  }
}