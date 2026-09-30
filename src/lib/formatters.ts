
export function formatNaira(amount: number | null | undefined) {
  if (amount === null || amount === undefined) {
    return "Unavailable";
  }

  return `₦${amount.toLocaleString("en-NG")}`;
}
