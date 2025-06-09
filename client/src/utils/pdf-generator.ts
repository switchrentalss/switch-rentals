import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    company?: string;
    gstNumber?: string;
  };
  dispatchDate: string;
  startDate: string;
  endDate: string;
  items: Array<{
    item: {
      name: string;
      description?: string;
    };
    quantity: number;
    ratePerDay: string;
    days: number;
    lineTotal: string;
  }>;
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  depositAmount?: string;
  sampleType?: string;
  notes?: string;
  terms?: string;
}

export function generateInvoicePDF(invoiceData: InvoiceData) {
  const doc = new jsPDF();
  
  // Set up colors
  const primaryColor: [number, number, number] = [41, 128, 185]; // Blue
  const darkGray: [number, number, number] = [44, 62, 80];
  const lightGray: [number, number, number] = [189, 195, 199];
  
  // Header - Company Information
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Company Logo/Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SWITCH RENTAL SERVICES LLP', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Luxury Dining & Event Equipment Rental', 20, 35);
  doc.text('GSTIN: 27AFHFS2025K1ZV', 20, 42);
  
  // Invoice Title
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.invoiceType.toUpperCase(), 150, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 150, 35);
  doc.text(`Date: ${format(new Date(invoiceData.dispatchDate), 'dd/MM/yyyy')}`, 150, 42);
  
  // Customer Information
  let yPos = 70;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.customer.name, 20, yPos + 10);
  
  if (invoiceData.customer.company) {
    doc.text(invoiceData.customer.company, 20, yPos + 20);
    yPos += 10;
  }
  
  doc.text(invoiceData.customer.address, 20, yPos + 20);
  doc.text(`Phone: ${invoiceData.customer.phone}`, 20, yPos + 30);
  doc.text(`Email: ${invoiceData.customer.email}`, 20, yPos + 40);
  
  if (invoiceData.customer.gstNumber) {
    doc.text(`GST Number: ${invoiceData.customer.gstNumber}`, 20, yPos + 50);
    yPos += 10;
  }
  
  // Event Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details:', 120, 70);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dispatch Date: ${format(new Date(invoiceData.dispatchDate), 'dd/MM/yyyy')}`, 120, 85);
  doc.text(`Event Start: ${format(new Date(invoiceData.startDate), 'dd/MM/yyyy')}`, 120, 95);
  doc.text(`Event End: ${format(new Date(invoiceData.endDate), 'dd/MM/yyyy')}`, 120, 105);
  
  // Items Table
  const tableStartY = yPos + 70;
  
  const tableData = invoiceData.items.map(item => [
    item.item.name,
    item.quantity.toString(),
    `₹${item.ratePerDay}`,
    item.days.toString(),
    `₹${item.lineTotal}`
  ]);
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Item Description', 'Qty', 'Rate/Day', 'Days', 'Amount']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let totalsY = finalY;
  doc.text('Subtotal:', 140, totalsY);
  doc.text(`₹${invoiceData.subtotal}`, 170, totalsY);
  
  if (invoiceData.sampleType === 'paid') {
    totalsY += 10;
    doc.text('Sample Charges (10%):', 140, totalsY);
    doc.text(`₹${(parseFloat(invoiceData.subtotal) * 0.1).toFixed(2)}`, 170, totalsY);
  }
  
  if (invoiceData.depositAmount && parseFloat(invoiceData.depositAmount) > 0) {
    totalsY += 10;
    doc.text('Security Deposit:', 140, totalsY);
    doc.text(`₹${invoiceData.depositAmount}`, 170, totalsY);
  }
  
  totalsY += 10;
  doc.text('GST (18%):', 140, totalsY);
  doc.text(`₹${invoiceData.gstAmount}`, 170, totalsY);
  
  // Total line
  totalsY += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(130, totalsY - 8, 60, 15, 'F');
  doc.text('Total Amount:', 140, totalsY);
  doc.text(`₹${invoiceData.totalAmount}`, 170, totalsY);
  
  // Terms and Conditions
  if (invoiceData.terms) {
    totalsY += 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 20, totalsY);
    
    doc.setFont('helvetica', 'normal');
    const terms = invoiceData.terms.split('\n');
    terms.forEach((term, index) => {
      doc.text(term, 20, totalsY + 10 + (index * 8));
    });
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('Thank you for choosing Switch Rental Services LLP', 20, pageHeight - 20);
  doc.text('Contact: +91-XXXXXXXXXX | Email: info@switchrental.com', 20, pageHeight - 10);
  
  // Save the PDF
  const fileName = `${invoiceData.invoiceType}-${invoiceData.invoiceNumber}.pdf`;
  doc.save(fileName);
}

export function downloadQuotationPDF(quotationData: any) {
  generateInvoicePDF(quotationData);
}