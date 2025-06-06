import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { queryClient } from "@/lib/queryClient";
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
  eventDate: string;
  startDate: string;
  endDate: string;
  eventDetails: string;
  subtotal: string;
  gstRate: string;
  gstAmount: string;
  totalAmount: string;
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
      return <Eye className="h-4 w-4 text-purple-500" />;
    case 'gst_invoice':
      return <IndianRupee className="h-4 w-4 text-green-500" />;
    case 'final_invoice':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
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

  const convertToInvoice = useMutation({
    mutationFn: async ({ quoteId, invoiceType }: { quoteId: number; invoiceType: string }) => {
      const response = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceType })
      });
      if (!response.ok) throw new Error('Failed to convert quote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
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
            {invoice.customer?.name} • {invoice.customer?.company}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Event Date:</span>
              <span className="font-medium">{new Date(invoice.eventDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount:</span>
              <span className="font-semibold text-green-600">₹{parseFloat(invoice.totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">GST ({invoice.gstRate}%):</span>
              <span className="text-sm">₹{parseFloat(invoice.gstAmount).toLocaleString()}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Due Date:</span>
                <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
              {invoice.invoiceType === 'quotation' && invoice.status !== 'converted' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => convertToInvoice.mutate({ quoteId: invoice.id, invoiceType: 'proforma' })}
                  disabled={convertToInvoice.isPending}
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Convert
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
            Order #{returnItem.orderId} • {returnItem.item?.category}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Shipped:</span>
                <div className="font-medium">{returnItem.quantityShipped} units</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Returned:</span>
                <div className="font-medium">{returnItem.quantityReturned} units</div>
              </div>
            </div>
            {returnItem.penaltyAmount !== '0.00' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Penalty:</span>
                <span className="font-semibold text-red-600">₹{parseFloat(returnItem.penaltyAmount).toLocaleString()}</span>
              </div>
            )}
            {returnItem.damageNotes && (
              <div>
                <span className="text-sm text-gray-600">Notes:</span>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{returnItem.damageNotes}</p>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Checked by: {returnItem.checkedBy || 'Pending'}</span>
              <span>{new Date(returnItem.returnDate).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Header 
        title="Invoice Management" 
        subtitle="GST invoices, quotations, and return tracking"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gstInvoices.filter((i: Invoice) => i.status === 'sent').length}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryReturns.filter((r: InventoryReturn) => r.conditionStatus !== 'perfect').length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2.4L</div>
            <p className="text-xs text-muted-foreground">From completed orders</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="quotations">Quotations</TabsTrigger>
            <TabsTrigger value="proforma">Proforma</TabsTrigger>
            <TabsTrigger value="gst-invoices">GST Invoices</TabsTrigger>
            <TabsTrigger value="final-invoices">Final Invoices</TabsTrigger>
            <TabsTrigger value="returns">Return Tracking</TabsTrigger>
          </TabsList>

          <div className="flex space-x-2">
            <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quotation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Quotation</DialogTitle>
                  <DialogDescription>
                    Create a quotation that can be converted to invoices later
                  </DialogDescription>
                </DialogHeader>
                {/* Quotation form would go here */}
                <div className="p-4 text-center text-gray-500">
                  Quotation creation form will be implemented here
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={returnTrackingOpen} onOpenChange={setReturnTrackingOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Truck className="h-4 w-4 mr-2" />
                  Process Returns
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process Inventory Returns</DialogTitle>
                  <DialogDescription>
                    Check returned items and update their condition
                  </DialogDescription>
                </DialogHeader>
                {/* Return processing form would go here */}
                <div className="p-4 text-center text-gray-500">
                  Return processing form will be implemented here
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="quotations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotationsLoading ? (
              <div className="col-span-full text-center py-8">Loading quotations...</div>
            ) : quotations.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No quotations found. Create your first quotation to get started.
              </div>
            ) : (
              quotations.map((quote: Invoice) => (
                <InvoiceCard key={quote.id} invoice={quote} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="proforma" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proformaLoading ? (
              <div className="col-span-full text-center py-8">Loading proforma invoices...</div>
            ) : proformaInvoices.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No proforma invoices found. Convert quotations to create proforma invoices.
              </div>
            ) : (
              proformaInvoices.map((invoice: Invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="gst-invoices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gstLoading ? (
              <div className="col-span-full text-center py-8">Loading GST invoices...</div>
            ) : gstInvoices.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No GST invoices found. Convert approved quotations to GST invoices.
              </div>
            ) : (
              gstInvoices.map((invoice: Invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="final-invoices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalLoading ? (
              <div className="col-span-full text-center py-8">Loading final invoices...</div>
            ) : finalInvoices.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No final invoices found. Process returns to generate final invoices.
              </div>
            ) : (
              finalInvoices.map((invoice: Invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {returnsLoading ? (
              <div className="col-span-full text-center py-8">Loading return records...</div>
            ) : inventoryReturns.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No return records found. Items will appear here when orders are completed.
              </div>
            ) : (
              inventoryReturns.map((returnItem: InventoryReturn) => (
                <ReturnTrackingCard key={returnItem.id} returnItem={returnItem} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}