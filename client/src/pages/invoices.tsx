import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { generateInvoicePDF, sendInvoiceAndToast } from "@/utils/pdf-generator";
import { formatDate, formatINR } from "@/lib/format";
import { amountToCollect, paperDate, taxInvoiceReady } from "@shared/hire";
import { QuotationModal } from "@/components/modals/quotation-modal";
import { ReturnChallanModal } from "@/components/modals/return-challan-modal";
import { ReturnTrackingModal } from "@/components/modals/return-tracking-modal";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle,
  FileText, 
  Plus, 
  Download, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Edit,
  ArrowRight,
  IndianRupee,
  Package,
  Truck
} from "lucide-react";

interface Invoice {
  id: number;
  customerId: number;
  orderId?: number;
  quoteId?: number;
  invoiceNumber: string;
  invoiceType: 'quotation' | 'proforma' | 'gst_invoice' | 'final_invoice';
  dispatchDate: string;
  startDate: string;
  endDate: string;
  returnDate?: string | null;
  eventDetails: string;
  subtotal: string;
  gstRate: string;
  gstAmount: string;
  totalAmount: string;
  depositAmount?: string;
  sampleType?: 'none' | 'free_1day' | 'paid';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial' | 'void' | 'converted';
  dueDate?: string;
  terms?: string;
  notes?: string;
  createdAt: string;
  rentAmount?: string;
  packingAmount?: string;
  transportAmount?: string;
  mistAmount?: string;
  discountAmount?: string;
  breakageAmount?: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  };
  items?: any[];
}

interface InventoryReturn {
  id: number;
  orderId: number;
  itemId: number;
  quantityShipped: number;
  quantityReturned: number;
  conditionStatus: 'perfect' | 'damaged' | 'missing' | 'needs_cleaning';
  damageNotes?: string;
  penaltyAmount: string;
  checkedBy?: string;
  returnDate: string;
  item?: {
    name: string;
    category: string;
  };
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const variants = {
    'draft': 'secondary',
    'converted': 'secondary',
    'sent': 'default',
    'paid': 'default',
    'partial': 'default',
    'void': 'destructive',
    'overdue': 'destructive'
  } as const;

  const colors = {
    'draft': 'text-gray-600',
    'converted': 'text-emerald-700',
    'sent': 'text-blue-600',
    'paid': 'text-green-600',
    'partial': 'text-amber-700',
    'void': 'text-red-700',
    'overdue': 'text-red-600'
  };

  return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className={colors[status as keyof typeof colors]}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

function InvoiceTypeIcon({ type }: { type: string }) {
  switch(type) {
    case 'quotation':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'proforma':
      return <Send className="h-4 w-4 text-purple-500" />;
    case 'gst_invoice':
      return <IndianRupee className="h-4 w-4 text-green-500" />;
    case 'final_invoice':
      return <CheckCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function ReturnStatusBadge({ status }: { status: string }) {
  const variants = {
    'perfect': 'default',
    'damaged': 'destructive',
    'missing': 'destructive',
    'needs_cleaning': 'secondary'
  } as const;

  const colors = {
    'perfect': 'text-green-600',
    'damaged': 'text-red-600',
    'missing': 'text-red-600',
    'needs_cleaning': 'text-yellow-600'
  };

  return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className={colors[status as keyof typeof colors]}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

export default function Invoices() {
  const [selectedTab, setSelectedTab] = useState("quotations");
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [returnTrackingOpen, setReturnTrackingOpen] = useState(false);
  const [selectedGstInvoice, setSelectedGstInvoice] = useState<any>(null);
  const [returnChallanOpen, setReturnChallanOpen] = useState(false);
  const { toast } = useToast();

  const convertToInvoice = useMutation({
    mutationFn: async ({ quoteId, invoiceType }: { quoteId: number; invoiceType: string }) => {
      const response = await fetch(`/api/invoices/${quoteId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceType })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to convert invoice");
      }
      return response.json();
    },
    onSuccess: async (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice ready",
        description: invoice.invoiceNumber
          ? `${invoice.invoiceNumber} created. Opening WhatsApp for the purchaser.`
          : "Invoice converted successfully",
      });
      if (invoice?.invoiceNumber) {
        await sendInvoiceAndToast(invoice, toast);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Could not convert",
        description: error.message || "Failed to convert invoice",
        variant: "destructive"
      });
    }
  });

  const markInvoiceSent = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!response.ok) throw new Error("Failed to update invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  async function shareInvoiceOnWhatsApp(invoice: Invoice) {
    if (invoice.status === "draft") {
      markInvoiceSent.mutate(invoice.id);
    }
    await sendInvoiceAndToast(invoice as any, toast);
  }

  // Fetch invoices by type
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery({
    queryKey: ['/api/invoices', 'quotation'],
    queryFn: async () => {
      const response = await fetch('/api/invoices?type=quotation');
      if (!response.ok) throw new Error('Failed to fetch quotations');
      return response.json();
    }
  });

  const { data: proformaInvoices = [], isLoading: proformaLoading } = useQuery({
    queryKey: ['/api/invoices', 'proforma'],
    queryFn: async () => {
      const response = await fetch('/api/invoices?type=proforma');
      if (!response.ok) throw new Error('Failed to fetch proforma invoices');
      return response.json();
    }
  });

  const { data: gstInvoices = [], isLoading: gstLoading } = useQuery({
    queryKey: ['/api/invoices', 'gst_invoice'],
    queryFn: async () => {
      const response = await fetch('/api/invoices?type=gst_invoice');
      if (!response.ok) throw new Error('Failed to fetch GST invoices');
      return response.json();
    }
  });

  const { data: finalInvoices = [], isLoading: finalLoading } = useQuery({
    queryKey: ['/api/invoices', 'final_invoice'],
    queryFn: async () => {
      const response = await fetch('/api/invoices?type=final_invoice');
      if (!response.ok) throw new Error('Failed to fetch final invoices');
      return response.json();
    }
  });

  const { data: inventoryReturns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['/api/inventory-returns'],
    queryFn: async () => {
      const response = await fetch('/api/inventory-returns');
      if (!response.ok) throw new Error('Failed to fetch inventory returns');
      return response.json();
    }
  });

  function InvoiceCard({ invoice }: { invoice: Invoice }) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <InvoiceTypeIcon type={invoice.invoiceType} />
              <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <CardDescription>
            {invoice.customer?.name} - {invoice.customer?.company}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paper date:</span>
              <span>{formatDate(paperDate(invoice))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dispatch:</span>
              <span>{formatDate(invoice.dispatchDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Hire / tax amount:</span>
              <span className="font-semibold">{formatINR(invoice.totalAmount)}</span>
            </div>
            {Number(invoice.depositAmount || 0) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deposit (not revenue):</span>
                  <span>{formatINR(invoice.depositAmount)}</span>
                </div>
                {(invoice.invoiceType === "proforma" || invoice.invoiceType === "quotation") && (
                  <div className="flex justify-between text-sm font-medium">
                    <span>To collect now:</span>
                    <span>{formatINR(amountToCollect(Number(invoice.totalAmount), Number(invoice.depositAmount)))}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST ({invoice.gstRate}%):</span>
              <span>{formatINR(invoice.gstAmount)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {invoice.eventDetails}
            </div>
            
            <div className="flex flex-wrap gap-2 pt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateInvoicePDF(invoice as any)}
              >
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                onClick={() => shareInvoiceOnWhatsApp(invoice)}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Send WhatsApp
              </Button>
              {invoice.invoiceType === 'quotation' && (invoice.status === 'draft' || invoice.status === 'sent') && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => convertToInvoice.mutate({ quoteId: invoice.id, invoiceType: 'proforma' })}
                  disabled={convertToInvoice.isPending}
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  To Proforma
                </Button>
              )}
              {invoice.invoiceType === 'proforma' && invoice.status === 'sent' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => convertToInvoice.mutate({ quoteId: invoice.id, invoiceType: 'gst_invoice' })}
                  disabled={convertToInvoice.isPending || !taxInvoiceReady(invoice)}
                  className="w-full"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  {taxInvoiceReady(invoice)
                    ? "To GST Invoice"
                    : `Tax invoice after ${(invoice.returnDate || invoice.endDate || "").slice(0, 10)}`}
                </Button>
              )}
              {invoice.invoiceType === 'gst_invoice' && invoice.status !== 'void' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    setSelectedGstInvoice(invoice);
                    setReturnChallanOpen(true);
                  }}
                  className="w-full"
                >
                  <Package className="h-3 w-3 mr-1" />
                  Process Returns
                </Button>
              )}
              {invoice.invoiceType === 'gst_invoice' && invoice.status !== 'void' && invoice.status !== 'paid' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.location.href = "/books";
                  }}
                >
                  Record payment in Books
                </Button>
              )}
              {(invoice.status === 'draft' || invoice.status === 'sent') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-700"
                  onClick={async () => {
                    const res = await fetch(`/api/invoices/${invoice.id}/void`, { method: "POST" });
                    if (!res.ok) return;
                    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
                    toast({ title: "Invoice voided", description: "It is excluded from the financial dashboard." });
                  }}
                >
                  Void
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function ReturnTrackingCard({ returnItem }: { returnItem: InventoryReturn }) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{returnItem.item?.name}</CardTitle>
            <ReturnStatusBadge status={returnItem.conditionStatus} />
          </div>
          <CardDescription>
            Return ID: {returnItem.id} | Order: {returnItem.orderId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Shipped:</span>
              <span>{returnItem.quantityShipped}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Returned:</span>
              <span>{returnItem.quantityReturned}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Penalty:</span>
              <span className="font-semibold text-red-600">₹{returnItem.penaltyAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Checked By:</span>
              <span>{returnItem.checkedBy}</span>
            </div>
            {returnItem.damageNotes && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {returnItem.damageNotes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Invoices & returns" subtitle="Quotations, GST invoices, and return tracking for Switch Rentals." actionLabel="New quotation" onAction={() => setCreateInvoiceOpen(true)} />
      <main className="p-6 space-y-6">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Quotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotations.filter((q: Invoice) => q.status === 'draft').length}</div>
              <p className="text-xs text-muted-foreground">Awaiting customer approval</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gstInvoices.filter((i: Invoice) => i.status === 'sent' || i.status === 'partial').length}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Return Items</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryReturns.filter((r: InventoryReturn) => r.conditionStatus !== 'perfect').length}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
            <TabsList className="grid w-full xl:w-auto grid-cols-2 sm:grid-cols-5">
              <TabsTrigger value="quotations">Quotations</TabsTrigger>
              <TabsTrigger value="proforma-invoices">Proforma</TabsTrigger>
              <TabsTrigger value="gst-invoices">GST</TabsTrigger>
              <TabsTrigger value="final-invoices">Final</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
            </TabsList>

            <div className="flex space-x-2">
              <Button onClick={() => setCreateInvoiceOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </Button>
              
              <QuotationModal 
                open={createInvoiceOpen} 
                onOpenChange={setCreateInvoiceOpen}
              />

              <ReturnChallanModal
                open={returnChallanOpen}
                onOpenChange={setReturnChallanOpen}
                gstInvoice={selectedGstInvoice}
              />

              <Button 
                variant="outline"
                onClick={() => setReturnTrackingOpen(true)}
              >
                <Truck className="h-4 w-4 mr-2" />
                Return Tracking
              </Button>

              <ReturnTrackingModal
                open={returnTrackingOpen}
                onOpenChange={setReturnTrackingOpen}
              />
            </div>
          </div>

          <TabsContent value="quotations" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Quotations</h2>
              {quotationsLoading ? (
                <div className="text-center py-8">Loading quotations...</div>
              ) : quotations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No quotations found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quotations.map((quote: Invoice) => (
                    <InvoiceCard key={quote.id} invoice={quote} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="proforma-invoices" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Proforma Invoices</h2>
              {proformaLoading ? (
                <div className="text-center py-8">Loading proforma invoices...</div>
              ) : proformaInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No proforma invoices found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proformaInvoices.map((invoice: Invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gst-invoices" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">GST Invoices</h2>
              {gstLoading ? (
                <div className="text-center py-8">Loading GST invoices...</div>
              ) : gstInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No GST invoices found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gstInvoices.map((invoice: Invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="final-invoices" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Final Invoices</h2>
              {finalLoading ? (
                <div className="text-center py-8">Loading final invoices...</div>
              ) : finalInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No final invoices found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finalInvoices.map((invoice: Invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Inventory Returns & Condition Tracking</h2>
              {returnsLoading ? (
                <div className="text-center py-8">Loading inventory returns...</div>
              ) : inventoryReturns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No inventory returns found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inventoryReturns.map((returnItem: InventoryReturn) => (
                    <ReturnTrackingCard key={returnItem.id} returnItem={returnItem} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}