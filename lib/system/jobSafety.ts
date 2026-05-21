import { addRetryJob } from "@/lib/system/retryQueue";

export async function runSafeJob<T>({
  type,
  payload,
  job,
}: {
  type: string;
  payload?: any;
  job: () => Promise<T>;
}) {
  try {
    return await job();
  } catch (error: any) {
    addRetryJob({
      type,
      payload: payload || {},
      error: error?.message || String(error),
    });

    throw error;
  }
}