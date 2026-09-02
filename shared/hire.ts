/** Hire-floor rules used by Books, invoices, and returns. */

export const TOTE_BOX_CHARGE = 1850;
export const LATE_SAME_DAY_RATE = 0.25;

export const PAYMENT_KINDS = [
  { id: "invoice", label: "Against hire invoice (rent / GST)" },
  { id: "deposit", label: "Security deposit in (not revenue)" },
  { id: "refund", label: "Deposit refunded to client" },
  { id: "apply", label: "Apply deposit to unpaid bill" },
] as const;

export function isInvoicePaymentKind(kind?: string | null) {
  return !kind || kind === "invoice" || kind === "apply";
}

/**
 * Contract: return the day after hire end, 11am–2pm.
 * Extra calendar days after that window: 25% of rent for the first late day, then 100% per further day.
 */
export function lateReturnCharge(rent: number, hireEnd: string, returnedOn: string) {
  if (!hireEnd || !returnedOn || rent <= 0) return { extraDays: 0, extra: 0 };
  const end = new Date(`${hireEnd}T00:00:00`);
  const ret = new Date(`${returnedOn}T00:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(ret.getTime())) return { extraDays: 0, extra: 0 };
  const allowed = new Date(end);
  allowed.setDate(allowed.getDate() + 1);
  const extraDays = Math.max(0, Math.round((ret.getTime() - allowed.getTime()) / 86400000));
  if (extraDays <= 0) return { extraDays: 0, extra: 0 };
  const extra = rent * LATE_SAME_DAY_RATE + rent * Math.max(0, extraDays - 1);
  return { extraDays, extra: Math.round(extra * 100) / 100 };
}

export function toteCharge(boxesLost: number) {
  const n = Math.max(0, Math.floor(boxesLost || 0));
  return n * TOTE_BOX_CHARGE;
}

export function todayIso(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function paperDate(invoice: {
  invoiceType: string;
  createdAt?: Date | string | null;
  returnDate?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  dispatchDate?: string | null;
}) {
  const tax = invoice.invoiceType === "gst_invoice" || invoice.invoiceType === "final_invoice";
  if (tax) return (invoice.returnDate || invoice.endDate || "").slice(0, 10);
  if (invoice.createdAt) {
    const instant = invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt);
    if (!Number.isNaN(instant.getTime())) return todayIso(instant);
  }
  return todayIso();
}

/** Tax invoice after goods are back, or after the billed-until date. */
export function taxInvoiceReady(
  invoice: { endDate?: string | null; returnDate?: string | null },
  asOf = todayIso(),
) {
  if (invoice.returnDate) return asOf >= invoice.returnDate.slice(0, 10);
  if (!invoice.endDate) return false;
  return asOf >= invoice.endDate.slice(0, 10);
}

export function amountToCollect(hireGross: number, deposit: number) {
  return Math.max(0, hireGross) + Math.max(0, deposit);
}
