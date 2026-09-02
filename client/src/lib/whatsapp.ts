export function toWhatsAppNumber(phone?: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length >= 12) return digits;
  if (digits.length >= 11) return digits;
  return null;
}

export function openWhatsApp(phone: string | undefined | null, text: string) {
  const number = toWhatsAppNumber(phone);
  const url = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function quotationWhatsAppText(invoice: {
  invoiceNumber: string;
  invoiceType: string;
  totalAmount: string;
  eventDetails?: string | null;
  startDate?: string;
  endDate?: string;
  customer?: { name?: string; company?: string | null };
  items?: Array<{ quantity: number; item?: { name?: string } }>;
}) {
  const who = invoice.customer?.company || invoice.customer?.name || "your team";
  const lines = (invoice.items || [])
    .slice(0, 8)
    .map((row) => `• ${row.quantity} × ${row.item?.name || "item"}`)
    .join("\n");
  return [
    `Switch Rental Services LLP`,
    `${invoice.invoiceType.replace("_", " ").toUpperCase()} ${invoice.invoiceNumber}`,
    who,
    invoice.eventDetails || "",
    invoice.startDate && invoice.endDate ? `Dates: ${invoice.startDate} – ${invoice.endDate}` : "",
    lines,
    `Total: ₹${invoice.totalAmount}`,
    ``,
    `Please find the invoice PDF attached.`,
    `Switch Rental Services LLP | Darukhana, Mumbai | 9125660485`,
  ]
    .filter(Boolean)
    .join("\n");
}
