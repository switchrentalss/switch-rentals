import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle } from "lucide-react";
import type { InvoiceWithCustomer } from "@shared/schema";
import { billing } from "@/lib/billing";
import { generateInvoicePDF, sendInvoiceAndToast } from "@/utils/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/format";

interface GSTInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithCustomer | null;
}

export function GSTInvoiceModal({ open, onOpenChange, invoice }: GSTInvoiceModalProps) {
  const { toast } = useToast();
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tax invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
            <p><strong>{invoice.invoiceNumber}</strong> · {invoice.customer?.name}</p>
            <p>GSTIN {billing.gstin} · HSN {billing.hsn}</p>
            <p>Gross {formatINR(invoice.totalAmount)}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button variant="outline" onClick={() => generateInvoicePDF(invoice as any)}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={() => sendInvoiceAndToast(invoice as any, toast)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Send WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
