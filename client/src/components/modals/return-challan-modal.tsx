import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, AlertTriangle, XCircle, Package } from "lucide-react";
import { lateReturnCharge, toteCharge, todayIso } from "@shared/hire";
import type { InvoiceWithCustomer } from "@shared/schema";

interface ReturnItem {
  itemId: number;
  itemName: string;
  quantityShipped: number;
  quantityReturned: number;
  conditionStatus: 'perfect' | 'damaged' | 'missing' | 'needs_cleaning';
  damageNotes?: string;
  penaltyAmount: number;
}

const returnChallanSchema = z.object({
  returns: z.array(z.object({
    itemId: z.number(),
    quantityReturned: z.number().min(0),
    conditionStatus: z.enum(['perfect', 'damaged', 'missing', 'needs_cleaning']),
    damageNotes: z.string().optional(),
    penaltyAmount: z.number().min(0).default(0),
  }))
});

type ReturnChallanFormData = z.infer<typeof returnChallanSchema>;

interface ReturnChallanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gstInvoice: InvoiceWithCustomer | null;
}

export function ReturnChallanModal({ open, onOpenChange, gstInvoice }: ReturnChallanModalProps) {
  const { toast } = useToast();
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [actualReturnDate, setActualReturnDate] = useState(todayIso());
  const [toteLost, setToteLost] = useState("0");

  const form = useForm<ReturnChallanFormData>({
    resolver: zodResolver(returnChallanSchema),
    defaultValues: {
      returns: []
    },
  });

  // Initialize return items when invoice is loaded
  useEffect(() => {
    if (gstInvoice && gstInvoice.items) {
      const initialItems: ReturnItem[] = gstInvoice.items.map(item => ({
        itemId: item.itemId,
        itemName: item.item.name,
        quantityShipped: item.quantity,
        quantityReturned: item.quantity, // Default to full return
        conditionStatus: 'perfect',
        damageNotes: '',
        penaltyAmount: 0,
      }));
      setReturnItems(initialItems);
    }
  }, [gstInvoice]);

  const processReturnsMutation = useMutation({
    mutationFn: async (data: ReturnChallanFormData) => {
      return apiRequest("POST", `/api/invoices/${gstInvoice?.id}/process-returns`, {
        returns: data.returns,
        actualReturnDate,
        toteLost: Number(toteLost || 0),
      });
    },
    onSuccess: () => {
      toast({
        title: "Return settled",
        description: "Breakage, late hire and lost totes are on this GST bill. Stock has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process returns",
        variant: "destructive",
      });
    },
  });

  const updateReturnItem = (index: number, updates: Partial<ReturnItem>) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    // Calculate penalty for damaged/missing items
    if (updates.conditionStatus === 'damaged' || updates.conditionStatus === 'missing') {
      const item = gstInvoice?.items.find(i => i.itemId === updatedItems[index].itemId);
      if (item?.item.replacementCost) {
        const penaltyRate = updates.conditionStatus === 'missing' ? 1.0 : 0.5; // 100% for missing, 50% for damaged
        updatedItems[index].penaltyAmount = parseFloat(item.item.replacementCost) * penaltyRate;
      }
    } else {
      updatedItems[index].penaltyAmount = 0;
    }
    
    setReturnItems(updatedItems);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'perfect':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'damaged':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'needs_cleaning':
        return <Package className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'perfect': return 'text-green-600 bg-green-50 border-green-200';
      case 'damaged': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'missing': return 'text-red-600 bg-red-50 border-red-200';
      case 'needs_cleaning': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const onSubmit = (data: ReturnChallanFormData) => {
    const returnsData = returnItems.map(item => ({
      itemId: item.itemId,
      quantityShipped: item.quantityShipped,
      quantityReturned: item.quantityReturned,
      conditionStatus: item.conditionStatus,
      damageNotes: item.damageNotes || '',
      penaltyAmount: item.penaltyAmount,
    }));

    processReturnsMutation.mutate({ returns: returnsData });
  };

  const totalPenalty = returnItems.reduce((sum, item) => sum + item.penaltyAmount, 0);
  const rent = Number(gstInvoice?.rentAmount || gstInvoice?.subtotal || 0);
  const late = gstInvoice ? lateReturnCharge(rent, gstInvoice.endDate, actualReturnDate) : { extra: 0, extraDays: 0 };
  const tote = toteCharge(Number(toteLost || 0));
  const perfectItems = returnItems.filter(item => item.conditionStatus === 'perfect').length;
  const damagedItems = returnItems.filter(item => item.conditionStatus === 'damaged').length;
  const missingItems = returnItems.filter(item => item.conditionStatus === 'missing').length;
  const cleaningItems = returnItems.filter(item => item.conditionStatus === 'needs_cleaning').length;

  if (!gstInvoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Challan Processing - {gstInvoice.invoiceNumber}</DialogTitle>
          <p className="text-sm text-gray-600">
            Process returned inventory items and generate final settlement invoice
          </p>
        </DialogHeader>

        {/* Customer and Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{gstInvoice.customer.name}</div>
              <div className="text-xs text-gray-500">{gstInvoice.customer.company}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{gstInvoice.eventDetails}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Invoice Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">₹{gstInvoice.totalAmount}</div>
              <div className="text-xs text-gray-500">GST Invoice</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Late return / tote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="text-xs text-muted-foreground">Actually returned on</label>
              <Input type="date" value={actualReturnDate} onChange={(e) => setActualReturnDate(e.target.value)} />
              <label className="text-xs text-muted-foreground">Lost tote boxes</label>
              <Input type="number" min={0} value={toteLost} onChange={(e) => setToteLost(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {late.extraDays ? `${late.extraDays} extra day(s) · ₹${late.extra.toLocaleString("en-IN")} late hire` : "On time if back the day after hire end"}
                {tote ? ` · totes ₹${tote.toLocaleString("en-IN")}` : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Return Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Return Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{perfectItems}</div>
                  <div className="text-sm text-gray-500">Perfect</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{damagedItems}</div>
                  <div className="text-sm text-gray-500">Damaged</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{missingItems}</div>
                  <div className="text-sm text-gray-500">Missing</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{cleaningItems}</div>
                  <div className="text-sm text-gray-500">Needs Cleaning</div>
                </div>
              </div>
            </div>
            
            {totalPenalty + late.extra + tote > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  Charges are added to this GST invoice (not a second bill): damage ₹{totalPenalty.toFixed(0)}
                  {late.extra ? ` · late ${late.extraDays}d ₹${late.extra}` : ""}
                  {tote ? ` · lost tote ₹${tote}` : ""}. GST 18% applies.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Return Processing */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Return Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  {returnItems.map((returnItem, index) => (
                    <div key={returnItem.itemId} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="font-medium">{returnItem.itemName}</div>
                          <div className="text-sm text-gray-500">
                            Shipped: {returnItem.quantityShipped} items
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Returned</label>
                          <Input
                            type="number"
                            min="0"
                            max={returnItem.quantityShipped}
                            value={returnItem.quantityReturned}
                            onChange={(e) => updateReturnItem(index, { 
                              quantityReturned: parseInt(e.target.value) || 0 
                            })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Condition</label>
                          <select
                            value={returnItem.conditionStatus}
                            onChange={(e) => updateReturnItem(index, { 
                              conditionStatus: e.target.value as any 
                            })}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="perfect">Perfect</option>
                            <option value="damaged">Damaged</option>
                            <option value="missing">Missing</option>
                            <option value="needs_cleaning">Needs Cleaning</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Penalty</label>
                          <div className="mt-1 text-sm font-medium text-red-600">
                            ₹{returnItem.penaltyAmount.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <Badge className={`${getStatusColor(returnItem.conditionStatus)} border`}>
                            {getStatusIcon(returnItem.conditionStatus)}
                            <span className="ml-1 capitalize">{returnItem.conditionStatus.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      {(returnItem.conditionStatus === 'damaged' || returnItem.conditionStatus === 'needs_cleaning') && (
                        <div className="mt-3">
                          <label className="text-sm font-medium">Notes</label>
                          <Input
                            placeholder="Describe the damage or cleaning requirements..."
                            value={returnItem.damageNotes}
                            onChange={(e) => updateReturnItem(index, { damageNotes: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {totalPenalty > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
                    <div className="text-lg font-semibold mb-2">Penalty Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal Penalty:</span>
                        <span>₹{totalPenalty.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (18%):</span>
                        <span>₹{(totalPenalty * 0.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total Penalty Amount:</span>
                        <span>₹{(totalPenalty * 1.18).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={processReturnsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {processReturnsMutation.isPending ? "Processing..." : "Settle return on this bill"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}