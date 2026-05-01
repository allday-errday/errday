export async function safeRead<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
) {
  try {
    return await promise;
  } catch (error) {
    console.error(`[DB] ${label} failed`, error);
    return fallback;
  }
}
