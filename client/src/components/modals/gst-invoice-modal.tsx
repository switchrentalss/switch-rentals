import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, QrCode } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { InvoiceWithCustomer } from "@shared/schema";

interface GSTInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithCustomer | null;
}

export function GSTInvoiceModal({ open, onOpenChange, invoice }: GSTInvoiceModalProps) {
  const { toast } = useToast();

  const generateGSTInvoice = () => {
    if (!invoice) return;

    const doc = new jsPDF();
    
    // Header - Tax Invoice
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Invoice", 105, 25, { align: "center" });
    
    // e-Invoice with QR placeholder
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("e-Invoice", 170, 25);
    
    // QR Code placeholder (you can integrate actual QR generation)
    doc.rect(170, 30, 30, 30);
    doc.setFontSize(8);
    doc.text("QR Code", 180, 47, { align: "center" });
    
    // IRN Details
    doc.setFontSize(9);
    doc.text("IRN: " + generateIRN(), 20, 70);
    doc.text("Ack No: " + generateAckNo(), 20, 76);
    doc.text("Ack Date: " + new Date().toLocaleDateString('en-GB'), 20, 82);
    
    // Company Details - Seller
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Switch Rental Services LLP", 20, 95);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Mumbai Office", 20, 102);
    doc.text("Mumbai", 20, 108);
    doc.text("GSTIN/UIN: 27AFHFS2025K1ZV", 20, 114);
    doc.text("State Name: Maharashtra, Code: 27", 20, 120);
    
    // Invoice Details Box
    doc.rect(100, 88, 70, 45);
    doc.setFontSize(10);
    doc.text("Invoice No.", 105, 98);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.invoiceNumber, 105, 105);
    doc.setFont("helvetica", "normal");
    doc.text("Dated", 140, 98);
    doc.text(new Date(invoice.createdAt).toLocaleDateString('en-GB'), 140, 105);
    doc.text("Mode/Terms of Payment", 105, 115);
    doc.text("Cash/UPI", 140, 115);
    doc.text("Reference No. & Date", 105, 125);
    doc.text("Other References", 140, 125);
    
    // Customer Details - Buyer/Consignee
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Buyer (Bill to)", 20, 145);
    doc.text(invoice.customer.name, 20, 155);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (invoice.customer.company) {
      doc.text(invoice.customer.company, 20, 162);
    }
    if (invoice.customer.gstNumber) {
      doc.text("GSTIN/UIN: " + invoice.customer.gstNumber, 20, 169);
    }
    doc.text("State Name: Maharashtra, Code: 27", 20, 176);
    
    // Delivery Details
    doc.rect(100, 140, 70, 45);
    doc.setFontSize(10);
    doc.text("Buyer's Order No.", 105, 150);
    doc.text("Dated", 140, 150);
    doc.text("Dispatch Doc No.", 105, 160);
    doc.text("Delivery Note Date", 140, 160);
    doc.text("Dispatched through", 105, 170);
    doc.text("Destination", 140, 170);
    doc.text("Terms of Delivery", 105, 180);
    
    // Items Table
    const tableData = invoice.items.map((item, index) => [
      (index + 1).toString(),
      item.item.name,
      "1005", // HSN/SAC code for rental services
      item.quantity.toString() + " No",
      parseFloat(item.ratePerDay).toFixed(2),
      "per", // Unit
      "Nos", // Discount %
      parseFloat(item.totalAmount).toFixed(2)
    ]);
    
    // Calculate GST
    const subtotal = parseFloat(invoice.totalAmount);
    const cgstAmount = subtotal * 0.09; // 9% CGST
    const sgstAmount = subtotal * 0.09; // 9% SGST
    const totalWithGST = subtotal + cgstAmount + sgstAmount;
    
    (doc as any).autoTable({
      head: [["Sl", "Description of Goods", "HSN/SAC", "Quantity", "Rate", "per", "Disc %", "Amount"]],
      body: [
        ...tableData,
        ["", "", "", "", "", "", "CGST", cgstAmount.toFixed(2)],
        ["", "", "", "", "", "", "SGST", sgstAmount.toFixed(2)],
        ["", "", "", "", "", "", "Total", "₹ " + totalWithGST.toFixed(2)]
      ],
      startY: 195,
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: { 
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 25 }
      }
    });
    
    // Amount in words
    doc.setFontSize(9);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Amount Chargeable (in words)", 20, finalY);
    doc.setFont("helvetica", "bold");
    doc.text(numberToWords(totalWithGST) + " Only", 20, finalY + 7);
    
    // Tax breakdown table
    (doc as any).autoTable({
      head: [["HSN/SAC", "Taxable Value", "Central Tax", "", "State Tax", "", "Total Tax Amount"]],
      body: [
        ["", "", "Rate", "Amount", "Rate", "Amount", ""],
        ["1005", subtotal.toFixed(2), "9%", cgstAmount.toFixed(2), "9%", sgstAmount.toFixed(2), (cgstAmount + sgstAmount).toFixed(2)],
        ["Total", subtotal.toFixed(2), "", cgstAmount.toFixed(2), "", sgstAmount.toFixed(2), (cgstAmount + sgstAmount).toFixed(2)]
      ],
      startY: finalY + 15,
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: { 
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0]
      }
    });
    
    // Tax amount in words
    const taxFinalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "normal");
    doc.text("Tax Amount (in words): " + numberToWords(cgstAmount + sgstAmount) + " Only", 20, taxFinalY);
    
    // Declaration and signature
    doc.text("Declaration", 20, taxFinalY + 15);
    doc.setFontSize(8);
    doc.text("We declare that this invoice shows the actual price of the", 20, taxFinalY + 22);
    doc.text("goods described and that all particulars are true and", 20, taxFinalY + 28);
    doc.text("correct.", 20, taxFinalY + 34);
    
    doc.text("for Switch Rental Services LLP, Mumbai", 140, taxFinalY + 25);
    doc.text("Authorised Signatory", 140, taxFinalY + 40);
    
    // Footer
    doc.setFontSize(9);
    doc.text("This is a Computer Generated Invoice", 105, 285, { align: "center" });
    
    doc.save(`GST_Invoice_${invoice.invoiceNumber}.pdf`);
    
    toast({
      title: "Invoice Generated",
      description: "GST invoice has been downloaded successfully.",
    });
  };

  const generateIRN = () => {
    return "fef1df90406b928db26a62f816debc9bb5256d9375e6-0dc4226653cc23a8c595";
  };

  const generateAckNo = () => {
    return "112010036563310";
  };

  const numberToWords = (amount: number): string => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    
    const convertHundreds = (num: number): string => {
      let result = "";
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + " ";
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + " ";
        return result;
      }
      if (num > 0) {
        result += ones[num] + " ";
      }
      return result;
    };
    
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    
    let result = "Indian Rupee ";
    
    if (rupees >= 10000000) {
      result += convertHundreds(Math.floor(rupees / 10000000)) + "Crore ";
      rupees %= 10000000;
    }
    if (rupees >= 100000) {
      result += convertHundreds(Math.floor(rupees / 100000)) + "Lakh ";
      rupees %= 100000;
    }
    if (rupees >= 1000) {
      result += convertHundreds(Math.floor(rupees / 1000)) + "Thousand ";
      rupees %= 1000;
    }
    if (rupees > 0) {
      result += convertHundreds(rupees);
    }
    
    if (paise > 0) {
      result += "and " + convertHundreds(paise) + "Paise ";
    }
    
    return result.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>GST Invoice Preview</DialogTitle>
        </DialogHeader>
        
        {invoice && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
                  <p><strong>Customer:</strong> {invoice.customer.name}</p>
                  <p><strong>Date:</strong> {new Date(invoice.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p><strong>Amount:</strong> ₹{parseFloat(invoice.totalAmount).toLocaleString()}</p>
                  <p><strong>CGST (9%):</strong> ₹{(parseFloat(invoice.totalAmount) * 0.09).toLocaleString()}</p>
                  <p><strong>SGST (9%):</strong> ₹{(parseFloat(invoice.totalAmount) * 0.09).toLocaleString()}</p>
                  <p><strong>Total with GST:</strong> ₹{(parseFloat(invoice.totalAmount) * 1.18).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={generateGSTInvoice} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download GST Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}