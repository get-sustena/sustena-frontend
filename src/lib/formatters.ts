// src/lib/formatters.ts

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}
