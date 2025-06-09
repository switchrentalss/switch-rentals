import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { generateInvoicePDF } from "@/utils/pdf-generator";
import { QuotationModal } from "@/components/modals/quotation-modal";
import { ReturnChallanModal } from "@/components/modals/return-challan-modal";
import { ReturnTrackingModal } from "@/components/modals/return-tracking-modal";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
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
  eventDetails: string;
  subtotal: string;
  gstRate: string;
  gstAmount: string;
  totalAmount: string;
  depositAmount?: string;
  sampleType?: 'none' | 'free_1day' | 'paid';
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate?: string;
  terms?: string;
  notes?: string;
  createdAt: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    company?: string;
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
    'sent': 'default',
    'paid': 'default',
    'overdue': 'destructive'
  } as const;

  const colors = {
    'draft': 'text-gray-600',
    'sent': 'text-blue-600',
    'paid': 'text-green-600',
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
      if (!response.ok) throw new Error("Failed to convert invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice converted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert invoice",
        variant: "destructive"
      });
    }
  });

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
              <span className="text-gray-600">Dispatch Date:</span>
              <span>{new Date(invoice.dispatchDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold">₹{invoice.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST ({invoice.gstRate}%):</span>
              <span>₹{invoice.gstAmount}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {invoice.eventDetails}
            </div>
            
            <div className="flex space-x-2 pt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => generatePDF(invoice, invoice.invoiceType as any)}
              >
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
              {invoice.invoiceType === 'quotation' && invoice.status === 'draft' && (
                <div className="flex space-x-1">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => convertToInvoice.mutate({ quoteId: invoice.id, invoiceType: 'proforma' })}
                    disabled={convertToInvoice.isPending}
                    className="flex-1"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    To Proforma
                  </Button>
                </div>
              )}
              {invoice.invoiceType === 'proforma' && invoice.status === 'sent' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => convertToInvoice.mutate({ quoteId: invoice.id, invoiceType: 'gst_invoice' })}
                  disabled={convertToInvoice.isPending}
                  className="w-full"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  To GST Invoice
                </Button>
              )}
              {invoice.invoiceType === 'gst_invoice' && invoice.status === 'paid' && (
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
    <div className="min-h-screen bg-gray-50">
      <Header title="GST Invoices & Return Processing" subtitle="Complete Indian GST invoice workflow with automated return challan processing" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GST Invoices, Quotations, and Return Tracking
          </h1>
          <p className="text-gray-600">
            Manage quotations, proforma invoices, GST invoices, final settlements, and inventory returns
          </p>
        </div>

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
              <div className="text-2xl font-bold">{gstInvoices.filter((i: Invoice) => i.status === 'sent').length}</div>
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
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="quotations">Quotations</TabsTrigger>
              <TabsTrigger value="proforma-invoices">Proforma Invoices</TabsTrigger>
              <TabsTrigger value="gst-invoices">GST Invoices</TabsTrigger>
              <TabsTrigger value="final-invoices">Final Invoices</TabsTrigger>
              <TabsTrigger value="returns">Return Tracking</TabsTrigger>
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