import { logSystemError } from "./logger";

export function safeParseJson<T>(value: string, fallback: T, label = "json_parse"): T {
  try {
    return JSON.parse(value);
  } catch (error) {
    logSystemError(label, error);
    return fallback;
  }
}