import { format, parseISO } from "date-fns";

export function formatINR(value: string | number | null | undefined, fractionDigits = 0) {
  const amount = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  try {
    const date =
      typeof value === "string"
        ? parseISO(value.length <= 10 ? `${value}T00:00:00` : value)
        : value;
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, pattern);
  } catch {
    return "—";
  }
}

export function rentalDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 1;
  const start = parseISO(`${startDate}T00:00:00`);
  const end = parseISO(`${endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

export function stockPercent(available: number, total: number) {
  if (!total) return 0;
  return (available / total) * 100;
}

export function catalogueCode(item: { sku?: string | null; itemCode?: string | null; id?: number }) {
  return item.itemCode || item.sku || (item.id ? `ID-${item.id}` : "—");
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}
