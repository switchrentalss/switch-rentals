import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { site } from "@/site/content";
import { billing } from "@/lib/billing";
import { openWhatsApp, quotationWhatsAppText } from "@/lib/whatsapp";
import { amountToCollect, paperDate } from "@shared/hire";

export interface InvoiceData {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    gstNumber?: string;
    notes?: string;
  };
  dispatchDate: string;
  startDate: string;
  endDate: string;
  returnDate?: string | null;
  createdAt?: string | Date | null;
  eventDetails?: string;
  items?: Array<{
    item: {
      name: string;
      description?: string;
      replacementCost?: string | number | null;
    };
    quantity: number;
    ratePerDay: string;
    days: number;
    lineTotal: string;
  }>;
  subtotal: string;
  gstAmount: string;
  gstRate?: string;
  totalAmount: string;
  depositAmount?: string;
  rentAmount?: string;
  packingAmount?: string;
  transportAmount?: string;
  mistAmount?: string;
  discountAmount?: string;
  breakageAmount?: string;
  sampleType?: string;
  notes?: string;
  terms?: string;
  advanceReceived?: string | number | null;
}

const INK: [number, number, number] = [32, 28, 26];
const MUTED: [number, number, number] = [90, 82, 76];
const RULE: [number, number, number] = [92, 48, 38];
const HEAD: [number, number, number] = [88, 88, 88];
const GREEN: [number, number, number] = [22, 122, 58];
const YELLOW: [number, number, number] = [245, 214, 64];
const GREY: [number, number, number] = [214, 214, 214];
const MARGIN = 14;

function n(v: string | number | null | undefined) {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(x) ? x : 0;
}

function money(v: number) {
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function dash(v: number) {
  return Math.abs(v) < 0.005 ? "-" : money(v);
}

function ordinalDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const v = day % 100;
  const suf = v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][day % 10] || "th";
  return `${day}${suf} ${format(d, "MMMM yyyy")}`;
}

function invoiceHeading(type: string, number: string) {
  if (type === "proforma") return `PROFORMA INVOICE no: ${number}`;
  if (type === "gst_invoice" || type === "final_invoice") return `TAX INVOICE no: ${number}`;
  return `QUOTATION no: ${number}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(num: number): string {
  if (num < 20) return ONES[num];
  if (num < 100) return `${TENS[Math.floor(num / 10)]}${num % 10 ? " " + ONES[num % 10] : ""}`.trim();
  return `${ONES[Math.floor(num / 100)]} Hundred${num % 100 ? " " + chunkToWords(num % 100) : ""}`;
}

export function rupeesInWords(amount: number) {
  const rupees = Math.round(Math.abs(amount));
  if (rupees === 0) return "Zero only";
  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1000);
  const rest = rupees % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${chunkToWords(crore)} Crore`);
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`);
  if (rest) parts.push(chunkToWords(rest));
  return `${parts.join(" ")} only`;
}

function chargeLines(invoice: InvoiceData) {
  const rent = n(invoice.rentAmount) || n(invoice.subtotal);
  const discount = n(invoice.discountAmount);
  const mist = n(invoice.mistAmount);
  const transport = n(invoice.transportAmount);
  const packing = n(invoice.packingAmount) || Math.round(rent * billing.packingRate * 100) / 100;
  const breakage = n(invoice.breakageAmount);
  const totalA = rent - discount + mist + transport + packing + breakage;
  const gst = n(invoice.gstAmount) || Math.round(totalA * 0.18 * 100) / 100;
  const cgst = Math.round((gst / 2) * 100) / 100;
  const sgst = Math.round((gst - cgst) * 100) / 100;
  const gross = n(invoice.totalAmount) || totalA + gst;
  return { rent, discount, mist, transport, packing, breakage, totalA, cgst, sgst, gst, gross };
}

async function dataUrl(path: string) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function lastY(doc: jsPDF, fallback: number) {
  return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || fallback);
}

function isTax(type: string) {
  return type === "gst_invoice" || type === "final_invoice";
}

function showsQr(type: string) {
  return isTax(type) || type === "proforma";
}

export async function buildInvoicePdf(invoice: InvoiceData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const inner = pageW - MARGIN * 2;
  const customer = invoice.customer || { name: "Customer" };
  const c = chargeLines(invoice);
  const deposit = n(invoice.depositAmount);
  const collect = amountToCollect(c.gross, deposit);
  const ask = invoice.invoiceType === "proforma" || invoice.invoiceType === "quotation";
  const [logo, qr] = await Promise.all([dataUrl("/billing/letterhead-logo.png"), dataUrl("/billing/upi-qr.png")]);

  let y = 12;
  if (logo) {
    const logoW = 52;
    const logoH = logoW * (853 / 1400);
    doc.addImage(logo, "PNG", (pageW - logoW) / 2, y, logoW, logoH);
    y += logoH + 5;
  } else {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("SWITCH RENTAL SERVICES LLP", pageW / 2, y + 6, { align: "center" });
    y += 12;
  }
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Ground floor, Gupta Mill Estate,", MARGIN, y);
  doc.text("Devidayal Mill Compound, Magazine Street,", pageW - MARGIN, y, { align: "right" });
  y += 4;
  doc.text("Darukhana, Mumbai 400010, Maharashtra, India.", MARGIN, y);
  doc.text(`Mob # 9125660485  ·  ${site.emails[0]}  ·  ${site.emails[1]}`, pageW - MARGIN, y, { align: "right" });
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text(`(GSTIN: ${billing.gstin})  ·  (HSN ${billing.hsn})`, pageW / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${ordinalDate(paperDate(invoice))}`, MARGIN, y);

  y += 6;
  doc.setFillColor(...RULE);
  doc.roundedRect(MARGIN, y, inner, 9, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(invoiceHeading(invoice.invoiceType, invoice.invoiceNumber), pageW / 2, y + 6.2, { align: "center" });
  y += 14;

  doc.setTextColor(...INK);
  doc.setFillColor(248, 245, 241);
  const billName = customer.company || customer.name || "";
  const billBits = [
    billName,
    customer.company && customer.name && customer.company !== customer.name ? customer.name : "",
    customer.address || "",
    customer.phone ? `Mob: ${customer.phone}` : "",
    customer.email ? `Email: ${customer.email}` : "",
    customer.gstNumber ? `GSTIN: ${customer.gstNumber}` : "",
    customer.notes ? customer.notes : "",
  ].filter(Boolean);
  const billLines = billBits.flatMap((line) => doc.splitTextToSize(String(line), inner - 8));
  const boxH = 8 + billLines.length * 4.2;
  doc.roundedRect(MARGIN, y, inner, boxH, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bill To", MARGIN + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let by = y + 10;
  billLines.forEach((line: string) => {
    doc.text(line, MARGIN + 4, by);
    by += 4.2;
  });
  y = y + boxH + 6;

  if (invoice.eventDetails || invoice.startDate) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const eventLine = `Hire for ${ordinalDate(invoice.startDate)}${invoice.endDate && invoice.endDate !== invoice.startDate ? ` to ${ordinalDate(invoice.endDate)}` : ""}${invoice.eventDetails ? ` — ${invoice.eventDetails}` : ""}`;
    doc.text(doc.splitTextToSize(eventLine, inner), MARGIN, y);
    y += 8;
    doc.setTextColor(...INK);
  }

  type ChargeRow = { label: string; value: string; kind?: "sum" | "gst" | "gross" | "advance" | "due" | "hold" };
  const rows: ChargeRow[] = [
    { label: `Rent for ${ordinalDate(invoice.startDate)}`, value: dash(c.rent) },
    { label: "Other Deductions", value: dash(c.discount) },
    { label: "Add Mist", value: dash(c.mist) },
  ];
  if (c.transport > 0) rows.push({ label: "Transport", value: dash(c.transport) });
  rows.push(
    { label: "Add Packing charges @3% of rent value", value: dash(c.packing) },
    { label: "Breakage added", value: dash(c.breakage) },
    { label: "TOTAL (A)", value: money(c.totalA), kind: "sum" },
    { label: "CGST 9%", value: dash(c.cgst) },
    { label: "SGST 9%", value: dash(c.sgst) },
    { label: "TOTAL GST (B)", value: money(c.gst), kind: "gst" },
    { label: "TOTAL AMOUNT (A+B)", value: money(c.gross), kind: "gross" },
  );
  if (ask) {
    rows.push(
      { label: "Security deposit (held — not GST, not rent)", value: dash(deposit), kind: "hold" },
      { label: "Amount to collect now (hire + deposit)", value: money(collect), kind: "due" },
    );
  } else {
    const advance = invoice.advanceReceived == null ? 0 : n(invoice.advanceReceived);
    rows.push(
      { label: "Advance Received", value: dash(advance), kind: "advance" },
      { label: "Total Due for rent (before damages & loss of product if any post event)", value: money(c.gross), kind: "due" },
    );
  }

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, textColor: INK, cellPadding: 2.4, lineColor: [190, 180, 172], lineWidth: 0.2, font: "helvetica" },
    head: [["DESCRIPTION", "Amount in (Indian Rs.)"]],
    headStyles: { fillColor: HEAD, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: inner * 0.72 },
      1: { cellWidth: inner * 0.28, halign: "right" },
    },
    body: rows.map((row) => [
      { content: row.label, styles: { fontStyle: row.kind ? "bold" : "normal" } },
      { content: row.value, styles: { fontStyle: row.kind ? "bold" : "normal", halign: "right" } },
    ]),
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const kind = rows[data.row.index]?.kind;
      if (kind === "sum" || kind === "gst" || kind === "gross") data.cell.styles.fillColor = GREY;
      if (kind === "advance") {
        data.cell.styles.fillColor = GREEN;
        data.cell.styles.textColor = [255, 255, 255];
      }
      if (kind === "due") data.cell.styles.fillColor = [232, 222, 212];
      if (kind === "hold") data.cell.styles.fillColor = [236, 240, 248];
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc, y) + 6;

  if (isTax(invoice.invoiceType) || ask) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const dueAmt = ask ? collect : c.gross;
    doc.text(`Total Due in words (Rupees ${rupeesInWords(dueAmt)})`, MARGIN, y);
    y += 7;
    doc.setTextColor(...INK);
  }

  if (y > 175) {
    doc.addPage();
    y = 16;
  }

  const qrW = 58;
  const bankTop = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RULE);
  doc.text("Bank Details for Transfer (NEFT / RTGS) of Fee", MARGIN, y);
  y += 5.5;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bankLines = [
    `Bank: ${billing.bank.name}`,
    `Account holder's name: ${billing.bank.accountName}`,
    `Account no: ${billing.bank.accountNo}`,
    `IFC Code: ${billing.bank.ifsc}`,
    "Payment terms: Advance Payment",
    "From Switch Rental Services LLP",
  ];
  bankLines.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 4.6;
  });
  if (showsQr(invoice.invoiceType) && qr) {
    const qrX = pageW - MARGIN - qrW;
    doc.addImage(qr, "PNG", qrX, bankTop, qrW, qrW * (378 / 360));
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Scan to pay · ICICI UPI", qrX + qrW / 2, bankTop + qrW * (378 / 360) + 4, { align: "center" });
    y = Math.max(y, bankTop + qrW * (378 / 360) + 8);
    doc.setTextColor(...INK);
  } else {
    y += 2;
  }

  const items = invoice.items || [];
  const productBody = items.map((row, i) => {
    const rate = n(row.ratePerDay);
    const qty = row.quantity;
    const rentLine = n(row.lineTotal) || rate * qty * (row.days || 1);
    const breakUnit = n(row.item?.replacementCost);
    return [String(i + 1), row.item?.name || "Item", String(qty), money(rate), money(breakUnit), money(rentLine), money(breakUnit * qty)];
  });
  const rentTotal = items.reduce((s, r) => s + (n(r.lineTotal) || n(r.ratePerDay) * r.quantity * (r.days || 1)), 0) || c.rent;
  const breakTotal = items.reduce((s, r) => s + n(r.item?.replacementCost) * r.quantity, 0);
  const unitsTotal = items.reduce((s, r) => s + r.quantity, 0);

  if (productBody.length) {
    if (y > 200) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...RULE);
    doc.text(invoice.invoiceType === "proforma" ? "Product / Breakage List" : "Product List", MARGIN, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Sr. No", "Description", "Total Units", "Rent per unit", "Breakage per unit", "Total Rent", "Total Breakage"]],
      body: productBody,
      theme: "grid",
      styles: { fontSize: 8, textColor: INK, cellPadding: 1.8, lineColor: [190, 180, 172], overflow: "linebreak" },
      headStyles: { fillColor: HEAD, textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: inner - 14 - 18 - 22 - 26 - 22 - 26 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 26, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 26, halign: "right" },
      },
      foot: [["", "", String(unitsTotal), "", "", money(rentTotal), money(breakTotal)]],
      footStyles: { fontStyle: "bold", fillColor: YELLOW, textColor: INK, halign: "right" },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastY(doc, y) + 8;
  }

  if (y > 230) {
    doc.addPage();
    y = 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RULE);
  doc.text("Terms & Conditions", MARGIN, y);
  y += 5;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  billing.terms.forEach((term, i) => {
    const lines = doc.splitTextToSize(`•  ${term}`, inner);
    if (y + lines.length * 3.3 > 278) {
      doc.addPage();
      y = 16;
    }
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.3 + 1.2;
  });

  y += 6;
  if (y > 272) {
    doc.addPage();
    y = 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("From Switch Rental Services LLP", MARGIN, y);
  y += 10;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 42, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Authorised signatory / stamp", MARGIN, y + 4);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140, 130, 122);
    doc.text("Switch Rental Services LLP  ·  Gupta Mills, Darukhana", MARGIN, 291);
    doc.text(`Page ${p} of ${pages}`, pageW - MARGIN, 291, { align: "right" });
  }

  return doc;
}

export function invoiceFileName(invoice: InvoiceData) {
  const kind = invoice.invoiceType === "proforma" ? "Proforma" : invoice.invoiceType === "quotation" ? "Quotation" : "Tax-Invoice";
  return `${kind}-${invoice.invoiceNumber}.pdf`;
}

export async function generateInvoicePDF(invoiceData: InvoiceData) {
  const doc = await buildInvoicePdf(invoiceData);
  doc.save(invoiceFileName(invoiceData));
}

export async function downloadQuotationPDF(quotationData: InvoiceData) {
  await generateInvoicePDF(quotationData);
}

export async function sendInvoiceOnWhatsApp(invoice: InvoiceData) {
  const doc = await buildInvoicePdf(invoice);
  const fileName = invoiceFileName(invoice);
  const blob = doc.output("blob");
  const file = new File([blob], fileName, { type: "application/pdf" });
  const text = quotationWhatsAppText(invoice);
  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({ files: [file], title: fileName, text });
      return "shared";
    } catch (error) {
      if ((error as Error).name === "AbortError") return "cancelled";
    }
  }
  doc.save(fileName);
  openWhatsApp(invoice.customer?.phone, text);
  return "whatsapp";
}

export async function sendInvoiceAndToast(
  invoice: InvoiceData,
  toast: (opts: { title: string; description: string }) => void,
) {
  const result = await sendInvoiceOnWhatsApp(invoice);
  if (result === "shared") {
    toast({ title: "Sent", description: "Invoice PDF was shared to WhatsApp." });
  } else if (result === "whatsapp") {
    toast({
      title: "Invoice PDF downloaded",
      description: "WhatsApp is open. Attach the PDF in the chat and send it to the purchaser.",
    });
  }
}
