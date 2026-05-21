import { logSystemError, logSystemEvent } from "./logger";

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  label?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const label = options.label || "operation";

  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 1) {
        logSystemEvent(
          "retry_success",
          `${label} succeeded after retry`,
          { attempt }
        );
      }

      return result;
    } catch (error: any) {
      lastError = error;

      logSystemError(`${label}_attempt_${attempt}`, error);

      if (attempt < retries) {
        await wait(delayMs);
      }
    }
  }

  throw lastError;
}