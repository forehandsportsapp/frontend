export function sanitizeLogoUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "default" ||
    lowered === "unset" ||
    lowered.endsWith("/default") ||
    lowered.includes("default-logo") ||
    lowered.includes("placeholder")
  ) {
    return null;
  }
  return trimmed;
}
