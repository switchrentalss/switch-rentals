import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const returnSchema = z.object({
  returns: z.array(z.object({
    itemId: z.number(),
    quantityShipped: z.number(),
    quantityReturned: z.number(),
    conditionStatus: z.enum(['perfect', 'damaged', 'missing', 'needs_cleaning']),
    damageNotes: z.string().optional(),
    penaltyAmount: z.string().optional(),
    checkedBy: z.string().min(1, "Inspector name required")
  })).min(1, "At least one return item required")
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface ReturnChallanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gstInvoice: any;
}

export function ReturnChallanModal({ open, onOpenChange, gstInvoice }: ReturnChallanModalProps) {
  const { toast } = useToast();
  
  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      returns: gstInvoice?.items?.map((item: any) => ({
        itemId: item.itemId,
        quantityShipped: item.quantity,
        quantityReturned: item.quantity,
        conditionStatus: 'perfect',
        damageNotes: '',
        penaltyAmount: '0',
        checkedBy: ''
      })) || []
    }
  });

  const processReturns = useMutation({
    mutationFn: async (data: ReturnFormData) => {
      const response = await fetch(`/api/invoices/${gstInvoice.id}/process-returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returns: data.returns })
      });
      if (!response.ok) throw new Error("Failed to process returns");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-returns"] });
      toast({
        title: "Success",
        description: "Return challan processed and final invoice generated"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process return challan",
        variant: "destructive"
      });
    }
  });

  const getConditionIcon = (status: string) => {
    switch (status) {
      case 'perfect': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'damaged': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'missing': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'needs_cleaning': return <Package2 className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getConditionBadge = (status: string) => {
    switch (status) {
      case 'perfect': return <Badge variant="default" className="bg-green-100 text-green-800">Perfect</Badge>;
      case 'damaged': return <Badge variant="destructive">Damaged</Badge>;
      case 'missing': return <Badge variant="destructive">Missing</Badge>;
      case 'needs_cleaning': return <Badge variant="secondary">Needs Cleaning</Badge>;
      default: return null;
    }
  };

  const calculatePenaltyAmount = (index: number, status: string) => {
    const returns = form.getValues("returns");
    const returnItem = returns[index];
    const originalItem = gstInvoice?.items?.find((item: any) => item.itemId === returnItem.itemId);
    
    if (status === 'damaged') {
      // 50% of original rate per day for damaged items
      const penaltyRate = originalItem ? parseFloat(originalItem.ratePerDay) * 0.5 : 0;
      form.setValue(`returns.${index}.penaltyAmount`, penaltyRate.toFixed(2));
    } else if (status === 'missing') {
      // 100% of original rate per day for missing items
      const penaltyRate = originalItem ? parseFloat(originalItem.ratePerDay) : 0;
      form.setValue(`returns.${index}.penaltyAmount`, penaltyRate.toFixed(2));
    } else {
      form.setValue(`returns.${index}.penaltyAmount`, '0');
    }
  };

  const onSubmit = (data: ReturnFormData) => {
    processReturns.mutate(data);
  };

  if (!gstInvoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package2 className="h-5 w-5 mr-2" />
            Return Challan Processing - {gstInvoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Process returned inventory items and generate final settlement invoice
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Customer</div>
              <div className="font-semibold">{gstInvoice.customer?.name}</div>
              <div className="text-sm text-gray-500">{gstInvoice.customer?.company}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Event Details</div>
              <div className="font-semibold">{gstInvoice.eventDetails}</div>
              <div className="text-sm text-gray-500">{gstInvoice.eventDate}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Invoice Total</div>
              <div className="font-semibold">₹{gstInvoice.totalAmount}</div>
              <div className="text-sm text-gray-500">GST Invoice</div>
            </CardContent>
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Return Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch("returns").map((returnItem, index) => {
                  const originalItem = gstInvoice?.items?.find((item: any) => item.itemId === returnItem.itemId);
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{originalItem?.item?.name || 'Unknown Item'}</h4>
                          <p className="text-sm text-gray-500">
                            Code: {originalItem?.item?.productCode} | Rate: ₹{originalItem?.ratePerDay}/day
                          </p>
                        </div>
                        {getConditionBadge(returnItem.conditionStatus)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm">Shipped Qty</Label>
                          <div className="p-2 bg-gray-50 rounded text-sm font-medium">
                            {returnItem.quantityShipped}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Returned Qty</Label>
                          <FormField
                            control={form.control}
                            name={`returns.${index}.quantityReturned`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                max={returnItem.quantityShipped}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value) || 0);
                                }}
                              />
                            )}
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Condition</Label>
                          <FormField
                            control={form.control}
                            name={`returns.${index}.conditionStatus`}
                            render={({ field }) => (
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                calculatePenaltyAmount(index, value);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="perfect">
                                    <div className="flex items-center">
                                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                      Perfect
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="damaged">
                                    <div className="flex items-center">
                                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                                      Damaged
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="missing">
                                    <div className="flex items-center">
                                      <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                      Missing
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="needs_cleaning">
                                    <div className="flex items-center">
                                      <Package2 className="h-4 w-4 text-blue-500 mr-2" />
                                      Needs Cleaning
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Penalty Amount (₹)</Label>
                          <FormField
                            control={form.control}
                            name={`returns.${index}.penaltyAmount`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                className={returnItem.conditionStatus !== 'perfect' ? 'border-red-200 bg-red-50' : ''}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {(returnItem.conditionStatus === 'damaged' || returnItem.conditionStatus === 'missing') && (
                        <div>
                          <Label className="text-sm">Damage/Loss Notes</Label>
                          <FormField
                            control={form.control}
                            name={`returns.${index}.damageNotes`}
                            render={({ field }) => (
                              <Textarea
                                placeholder="Describe the damage or provide details about missing items..."
                                {...field}
                              />
                            )}
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-sm">Checked By (Inspector)</Label>
                        <FormField
                          control={form.control}
                          name={`returns.${index}.checkedBy`}
                          render={({ field }) => (
                            <Input
                              placeholder="Enter inspector name"
                              {...field}
                            />
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Summary Section */}
            <Card>
              <CardHeader>
                <CardTitle>Return Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['perfect', 'damaged', 'missing', 'needs_cleaning'].map(status => {
                    const count = form.watch("returns").filter(r => r.conditionStatus === status).length;
                    const totalPenalty = form.watch("returns")
                      .filter(r => r.conditionStatus === status)
                      .reduce((sum, r) => sum + parseFloat(r.penaltyAmount || '0'), 0);
                    
                    return (
                      <div key={status} className="text-center p-3 rounded-lg border">
                        {getConditionIcon(status)}
                        <div className="mt-2 font-semibold">{count} Items</div>
                        <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
                        {(status === 'damaged' || status === 'missing') && totalPenalty > 0 && (
                          <div className="text-sm font-medium text-red-600 mt-1">
                            Penalty: ₹{totalPenalty.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> A final invoice will be automatically generated with penalty charges for damaged/missing items. 
                    GST (18%) will be applied to all penalty amounts as per Indian tax regulations.
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={processReturns.isPending}>
                {processReturns.isPending ? "Processing..." : "Process Returns & Generate Final Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}