export function safeSameOriginRedirect(
  candidate: string | null,
  origin: string,
  fallback = "/today",
) {
  const value = candidate ?? fallback;

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|2f|5c|7f)/i.test(value)
  ) {
    return new URL(fallback, origin);
  }

  try {
    const destination = new URL(value, origin);
    return destination.origin === new URL(origin).origin
      ? destination
      : new URL(fallback, origin);
  } catch {
    return new URL(fallback, origin);
  }
}
