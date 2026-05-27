import path from "path";

export const DATA_ROOT =
  process.env.DATA_ROOT || path.join(process.cwd(), "data");