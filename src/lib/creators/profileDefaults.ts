export function suggestedCreatorHandle(fullName?: string | null, email?: string | null) {
  const source = fullName?.trim() || email?.split("@")[0] || "sustena";
  const cleaned = source
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);

  if (cleaned.length >= 3) return cleaned;
  return `${cleaned || "sustena"}.cook`.slice(0, 30);
}
