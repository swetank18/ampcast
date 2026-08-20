/** Indian digit grouping: 12,34,567 not 1,234,567. The bill is in rupees and a
 *  facility manager reads lakhs, so the page should too. */
export const inr = (v: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, ...opts }).format(v);

export const lakh = (v: number) => `${(v / 1e5).toFixed(2)}L`;

export const kw = (v: number, d = 0) => `${v.toFixed(d)}`;

export const pct = (v: number, d = 2) => `${v.toFixed(d)}%`;

export const signed = (v: number) => (v > 0 ? `+${inr(v)}` : inr(v));

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function stamp(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTH[d.getUTCMonth()]}  ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function dayLabel(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
}
