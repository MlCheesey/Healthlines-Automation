const locks = new Set<string>();

export async function withFileLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  if (locks.has(key)) {
    throw new Error(`File/workflow is currently locked: ${key}`);
  }

  locks.add(key);

  try {
    return await fn();
  } finally {
    locks.delete(key);
  }
}