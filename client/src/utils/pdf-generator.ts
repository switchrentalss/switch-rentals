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
}

const INK: [number, number, number] = [40, 28, 22];
const RULE: [number, number, number] = [122, 54, 40];

function n(v: string | number | null | undefined) {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(x) ? x : 0;
}

function money(v: number) {
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function ordinalDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const v = day % 100;
  const suf = v >= 11 && v <= 13 ? "th" : (["th", "st", "nd", "rd"][day % 10] || "th");
  return `${day}${suf} ${format(d, "MMMM yyyy")}`;
}

function invoiceHeading(type: string, number: string) {
  if (type === "proforma") return `PROFORMA INVOICE`;
  if (type === "gst_invoice" || type === "final_invoice") return `TAX INVOICE no: ${number}`;
  return `QUOTATION ${number}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(num: number) {
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
  const mist = n(invoice.mistAmount) + n(invoice.transportAmount);
  const packing = n(invoice.packingAmount) || Math.round(rent * billing.packingRate * 100) / 100;
  const breakage = n(invoice.breakageAmount);
  const totalA = rent - discount + mist + packing + breakage;
  const gst = n(invoice.gstAmount) || Math.round(totalA * 0.18 * 100) / 100;
  const cgst = Math.round((gst / 2) * 100) / 100;
  const sgst = Math.round((gst - cgst) * 100) / 100;
  const gross = n(invoice.totalAmount) || totalA + gst;
  const discountPct = rent ? Math.round((discount / rent) * 100) : 0;
  return { rent, discount, discountPct, mist, packing, breakage, totalA, cgst, sgst, gst, gross };
}

export function buildInvoicePdf(invoice: InvoiceData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const customer = invoice.customer || { name: "Customer" };
  let y = 16;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SWITCH RENTAL SERVICES LLP", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = [
    "Ground floor, Gupta Mill Estate, Devidayal Mill Compound, Magazine Street,",
    "Darukhana Mumbai 400010, Maharashtra, India.",
    `Mob # 9125660485, ${site.emails[0]} , ${site.emails[1]}`,
    `(GST NO: ${billing.gstin}) - (HSN Code ${billing.hsn})`,
  ];
  address.forEach((line) => {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 4;
  });
  y += 2;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.6);
  doc.line(15, y, pageW - 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Date: ${ordinalDate(paperDate(invoice))}`, 15, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(invoiceHeading(invoice.invoiceType, invoice.invoiceNumber), pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text("Bill To,", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const billName = customer.company || customer.name;
  doc.setFont("helvetica", "bold");
  doc.text(billName || "", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  if (customer.company && customer.name && customer.company !== customer.name) {
    doc.text(customer.name, 15, y);
    y += 4.5;
  }
  const addr = doc.splitTextToSize(customer.address || "", 120);
  addr.forEach((line: string) => {
    doc.text(line, 15, y);
    y += 4.5;
  });
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 15, y);
    y += 4.5;
  }
  if (customer.phone) {
    doc.text(`Mob: ${customer.phone}`, 15, y);
    y += 4.5;
  }
  if (customer.gstNumber) {
    doc.text(`GSTIN - ${customer.gstNumber}`, 15, y);
    y += 4.5;
  }
  y += 3;
  const eventLine = invoice.eventDetails
    ? `Descriptions products for Event Dated ${ordinalDate(invoice.startDate)}${invoice.eventDetails ? ` — ${invoice.eventDetails}` : ""}`
    : `Descriptions products for Event Dated ${ordinalDate(invoice.startDate)}`;
  doc.setFont("helvetica", "italic");
  doc.text(doc.splitTextToSize(eventLine, pageW - 30), 15, y);
  y += 10;

  const c = chargeLines(invoice);
  const deposit = n(invoice.depositAmount);
  const collect = amountToCollect(c.gross, deposit);
  const isAsk = invoice.invoiceType === "proforma" || invoice.invoiceType === "quotation";
  const chargeRows: [string, string][] = [
    [`Rent for ${ordinalDate(invoice.startDate)}`, money(c.rent)],
    [`Discount${c.discountPct ? ` -@${c.discountPct}%` : ""}`, money(c.discount)],
    ["Add Mist / transport", money(c.mist)],
    ["Add Packing charges @3% of rent value", money(c.packing)],
    ["Breakage added", money(c.breakage)],
    ["TOTAL (A)", money(c.totalA)],
    ["CGST 9%", money(c.cgst)],
    ["SGST 9%", money(c.sgst)],
    ["TOTAL GST (B)", money(c.gst)],
    ["TOTAL AMOUNT (A+B) — hire / tax invoice", money(c.gross)],
  ];
  if (isAsk) {
    chargeRows.push(
      ["Security deposit (held — not GST, not rent)", money(deposit)],
      ["Amount to collect now (hire + deposit)", money(collect)],
    );
  } else {
    chargeRows.push(
      ["Total due on this tax invoice (excludes deposit)", money(c.gross)],
    );
  }

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, textColor: INK, cellPadding: 2.2, lineColor: [180, 160, 150], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 50, halign: "right" },
    },
    body: chargeRows.map((row, i) => {
      const last = i === chargeRows.length - 1;
      const hireTotal = i === 9;
      const bold = i === 5 || i === 8 || hireTotal || last;
      return [
        { content: row[0], styles: { fontStyle: bold ? "bold" : "normal" } },
        { content: row[1], styles: { fontStyle: bold ? "bold" : "normal", halign: "right" } },
      ];
    }),
    didParseCell: (data) => {
      if (data.section === "body" && (data.row.index === 9 || data.row.index === chargeRows.length - 1)) {
        data.cell.styles.fillColor = [245, 236, 228];
      }
    },
  });

  y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 8;
  if (isAsk && deposit > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      `Deposit INR ${money(deposit)} is a holding. It is not revenue. Refund after return if there is no breakage, or apply it to damages / unpaid hire.`,
      15,
      y,
      { maxWidth: pageW - 30 },
    );
    y += 10;
  } else if (!isAsk && deposit > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      `Security deposit INR ${money(deposit)} is not part of this tax invoice. Refund it after return, or apply it to breakage / unpaid hire in Books.`,
      15,
      y,
      { maxWidth: pageW - 30 },
    );
    y += 10;
  }
  if (invoice.invoiceType === "gst_invoice" || invoice.invoiceType === "final_invoice") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Total Due in words (${rupeesInWords(c.gross)})`, 15, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bank Details for Transfer (NEFT / RTGS) of Fee", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  [
    `Bank: ${billing.bank.name}`,
    `Account holder's name: ${billing.bank.accountName}`,
    `Account no: ${billing.bank.accountNo}`,
    `IFSC Code: ${billing.bank.ifsc}`,
    "Payment terms: Advance Payment",
    "From Switch Rental Services LLP",
  ].forEach((line) => {
    doc.text(line, 15, y);
    y += 4.5;
  });
  y += 4;

  const productBody = (invoice.items || []).map((row, i) => {
    const rate = n(row.ratePerDay);
    const qty = row.quantity;
    const rentLine = n(row.lineTotal) || rate * qty * (row.days || 1);
    const breakUnit = n(row.item?.replacementCost);
    return [
      String(i + 1),
      row.item?.name || "Item",
      String(qty),
      money(rate),
      money(breakUnit),
      money(rentLine),
      money(breakUnit * qty),
    ];
  });
  if (productBody.length) {
    if (y > 240) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(invoice.invoiceType === "proforma" ? "Product / Breakage List" : "Product List", 15, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Sr.", "Description", "Units", "Rent / unit", "Breakage / unit", "Total Rent", "Total Breakage"]],
      body: productBody,
      theme: "grid",
      styles: { fontSize: 8, textColor: INK, cellPadding: 1.8, lineColor: [180, 160, 150] },
      headStyles: { fillColor: RULE, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 62 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 24, halign: "right" },
        6: { cellWidth: 24, halign: "right" },
      },
      foot: [[
        "",
        "Total",
        String((invoice.items || []).reduce((s, r) => s + r.quantity, 0)),
        "",
        "",
        money((invoice.items || []).reduce((s, r) => s + n(r.lineTotal), 0) || c.rent),
        "",
      ]],
      footStyles: { fontStyle: "bold", fillColor: [245, 236, 228], textColor: INK },
    });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
  }

  if (c.breakage > 0) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Breakage billed on this invoice", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Breakage added: INR ${money(c.breakage)} (GST 18% included in TOTAL GST above).`, 15, y);
    y += 8;
  }

  if (y > 230) {
    doc.addPage();
    y = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Terms & Conditions", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  billing.terms.forEach((term, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${term}`, pageW - 30);
    if (y + lines.length * 3.5 > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(lines, 15, y);
    y += lines.length * 3.5 + 1;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("From Switch Rental Services LLP", 15, y);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(120, 110, 100);
    doc.text(`Page ${p} of ${pages}`, pageW - 15, 290, { align: "right" });
  }

  return doc;
}

export function invoiceFileName(invoice: InvoiceData) {
  const kind = invoice.invoiceType === "proforma" ? "Proforma" : invoice.invoiceType === "quotation" ? "Quotation" : "Tax-Invoice";
  return `${kind}-${invoice.invoiceNumber}.pdf`;
}

export function generateInvoicePDF(invoiceData: InvoiceData) {
  const doc = buildInvoicePdf(invoiceData);
  doc.save(invoiceFileName(invoiceData));
}

export function downloadQuotationPDF(quotationData: InvoiceData) {
  generateInvoicePDF(quotationData);
}

export async function sendInvoiceOnWhatsApp(invoice: InvoiceData) {
  const doc = buildInvoicePdf(invoice);
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
