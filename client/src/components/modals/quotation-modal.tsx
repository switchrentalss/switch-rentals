import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calculator, IndianRupee, Package, Calendar, FileText } from "lucide-react";

const formSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  dispatchDate: z.string().min(1, "Dispatch date is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  eventDetails: z.string().min(1, "Event details are required"),
  depositAmount: z.string().default("0"),
  sampleType: z.enum(["none", "free_1day", "paid"]).default("none"),
  items: z.array(z.object({
    itemId: z.number().min(1, "Please select an item"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    ratePerDay: z.string().min(1, "Rate is required"),
    totalAmount: z.string().min(1, "Total amount is required")
  })).min(1, "At least one item is required"),
  terms: z.string().optional(),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface QuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationModal({ open, onOpenChange }: QuotationModalProps) {
  const [gstRate] = useState(18);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: 0,
      dispatchDate: "",
      startDate: "",
      endDate: "",
      eventDetails: "",
      depositAmount: "0",
      sampleType: "none",
      items: [{ itemId: 0, quantity: 1, ratePerDay: "", totalAmount: "" }],
      terms: "Payment Terms: 50% advance, balance on delivery. Security deposit refundable after return of items in good condition.",
      notes: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: open
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
    enabled: open
  });

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Quotation created successfully"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive"
      });
    }
  });

  // Calculate totals
  const watchedItems = form.watch("items");
  const depositAmount = parseFloat(form.watch("depositAmount") || "0");
  const sampleType = form.watch("sampleType");

  const calculateItemTotal = (quantity: number, ratePerDay: string, startDate: string, endDate: string) => {
    if (!ratePerDay || !startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return quantity * parseFloat(ratePerDay) * days;
  };

  const subtotal = watchedItems.reduce((sum, item, index) => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    return sum + calculateItemTotal(item.quantity, item.ratePerDay, startDate, endDate);
  }, 0);

  // Add sample charges if applicable
  const sampleCharges = sampleType === "paid" ? subtotal * 0.1 : 0; // 10% for paid samples
  const totalBeforeGst = subtotal + sampleCharges + depositAmount;
  const gstAmount = totalBeforeGst * (gstRate / 100);
  const totalAmount = totalBeforeGst + gstAmount;

  // Update item totals when dates change
  useEffect(() => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (startDate && endDate) {
      watchedItems.forEach((item, index) => {
        const total = calculateItemTotal(item.quantity, item.ratePerDay, startDate, endDate);
        form.setValue(`items.${index}.totalAmount`, total.toFixed(2));
      });
    }
  }, [form.watch("startDate"), form.watch("endDate"), watchedItems]);

  const onSubmit = (data: FormData) => {
    const invoiceData = {
      customerId: data.customerId,
      invoiceType: "quotation",
      dispatchDate: data.dispatchDate,
      startDate: data.startDate,
      endDate: data.endDate,
      eventDetails: data.eventDetails,
      subtotal: subtotal.toFixed(2),
      gstRate: gstRate.toString(),
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      depositAmount: data.depositAmount,
      sampleType: data.sampleType,
      status: "draft",
      terms: data.terms,
      notes: data.notes,
      items: data.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        ratePerDay: item.ratePerDay,
        days: Math.max(1, Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1),
        lineTotal: item.totalAmount
      }))
    };

    createInvoice.mutate(invoiceData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Create New Quotation</span>
          </DialogTitle>
          <DialogDescription>
            Create a professional quotation with deposit and sample options for your customer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer and Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} - {customer.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dispatchDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Dispatch Date *</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental End Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Event Details */}
            <FormField
              control={form.control}
              name="eventDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Details *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the event, venue, special requirements..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deposit and Sample Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Deposit & Sample Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sampleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sample Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Sample</SelectItem>
                            <SelectItem value="free_1day">Free Sample (1 Day)</SelectItem>
                            <SelectItem value="paid">Paid Sample (10% of rental)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {sampleType === "free_1day" && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      Free sample for 1 day. Charges will apply from day 2 at regular rental rates.
                    </p>
                  </div>
                )}

                {sampleType === "paid" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      Paid sample at 10% of total rental amount. Sample charges: ₹{sampleCharges.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Rental Items</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ itemId: 0, quantity: 1, ratePerDay: "", totalAmount: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end space-x-2 p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Item *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                const selectedItem = inventoryItems.find((item: any) => item.id === parseInt(value));
                                field.onChange(parseInt(value));
                                if (selectedItem) {
                                  form.setValue(`items.${index}.ratePerDay`, selectedItem.ratePerDay);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inventoryItems.map((item: any) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name} - ₹{item.ratePerDay}/day
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel>Qty *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => {
                                  const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                  field.onChange(newValue);
                                }}
                                onFocus={(e) => e.target.select()} // Select all text on focus
                                value={field.value === 0 ? "" : field.value} // Show empty string instead of 0
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.ratePerDay`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <FormLabel>Rate/Day</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onFocus={(e) => e.target.select()} // Select all text on focus
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.totalAmount`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>Total</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Calculation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Price Calculation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Rental Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {sampleCharges > 0 && (
                    <div className="flex justify-between">
                      <span>Sample Charges (10%):</span>
                      <span>₹{sampleCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {depositAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Security Deposit:</span>
                      <span>₹{depositAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({gstRate}%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Amount:</span>
                    <span className="flex items-center">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Special instructions, delivery notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createInvoice.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}