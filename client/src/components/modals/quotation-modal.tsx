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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calculator } from "lucide-react";

const quotationSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  eventDate: z.string().min(1, "Event date is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  eventDetails: z.string().min(1, "Event details are required"),
  terms: z.string().optional(),
  items: z.array(z.object({
    itemId: z.number().min(1, "Please select an item"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    ratePerDay: z.number().min(0, "Rate must be positive"),
    totalAmount: z.number().min(0, "Total amount must be positive")
  })).min(1, "At least one item is required")
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationModal({ open, onOpenChange }: QuotationModalProps) {
  const { toast } = useToast();
  const [gstRate] = useState(18);
  
  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: 0,
      eventDate: "",
      startDate: "",
      endDate: "",
      eventDetails: "",
      terms: "Payment due within 30 days of invoice date. Advance payment of 50% required for booking confirmation.",
      items: [{ itemId: 0, quantity: 1, ratePerDay: 0, totalAmount: 0 }]
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    }
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const response = await fetch("/api/inventory");
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    }
  });

  const createQuotation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.ratePerDay * days), 0);
      const gstAmount = (subtotal * gstRate) / 100;
      const totalAmount = subtotal + gstAmount;

      const invoiceData = {
        customerId: data.customerId,
        invoiceType: 'quotation',
        eventDate: data.eventDate,
        startDate: data.startDate,
        endDate: data.endDate,
        eventDetails: data.eventDetails,
        subtotal: subtotal.toFixed(2),
        gstRate: gstRate.toString(),
        gstAmount: gstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: 'draft',
        terms: data.terms
      };

      const invoiceItems = data.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        ratePerDay: item.ratePerDay.toFixed(2),
        days: days,
        lineTotal: (item.quantity * item.ratePerDay * days).toFixed(2)
      }));

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: invoiceData, items: invoiceItems })
      });
      if (!response.ok) throw new Error("Failed to create quotation");
      return response.json();
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive"
      });
    }
  });

  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [...currentItems, { itemId: 0, quantity: 1, ratePerDay: 0, totalAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue("items", currentItems.filter((_, i) => i !== index));
    }
  };

  const updateItemTotal = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    const startDate = new Date(form.getValues("startDate"));
    const endDate = new Date(form.getValues("endDate"));
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (!isNaN(days) && days > 0) {
      const total = item.quantity * item.ratePerDay * days;
      form.setValue(`items.${index}.totalAmount`, total);
    }
  };

  const calculateTotals = () => {
    const items = form.getValues("items");
    const startDate = new Date(form.getValues("startDate"));
    const endDate = new Date(form.getValues("endDate"));
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (isNaN(days) || days <= 0) return { subtotal: 0, gstAmount: 0, total: 0, days: 0 };

    const subtotal = items.reduce((sum, item) => {
      if (item.itemId && item.quantity && item.ratePerDay) {
        return sum + (item.quantity * item.ratePerDay * days);
      }
      return sum;
    }, 0);

    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;

    return { subtotal, gstAmount, total, days };
  };

  const { subtotal, gstAmount, total, days } = calculateTotals();

  const onSubmit = (data: QuotationFormData) => {
    createQuotation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quotation</DialogTitle>
          <DialogDescription>
            Create a professional quotation that can be converted to invoices later
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer and Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
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
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
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
                    <FormLabel>Rental Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          // Recalculate totals when dates change
                          setTimeout(() => {
                            const items = form.getValues("items");
                            items.forEach((_, index) => updateItemTotal(index));
                          }, 100);
                        }}
                      />
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
                    <FormLabel>Rental End Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Recalculate totals when dates change
                          setTimeout(() => {
                            const items = form.getValues("items");
                            items.forEach((_, index) => updateItemTotal(index));
                          }, 100);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eventDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the event, special requirements, setup details..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quotation Items</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                {days > 0 && (
                  <Badge variant="outline" className="w-fit">
                    Rental Duration: {days} day{days !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch("items").map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-lg">
                    <div className="col-span-4">
                      <Label className="text-sm">Inventory Item</Label>
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field }) => (
                          <Select onValueChange={(value) => {
                            const selectedItem = inventoryItems.find((inv: any) => inv.id === parseInt(value));
                            field.onChange(parseInt(value));
                            if (selectedItem) {
                              form.setValue(`items.${index}.ratePerDay`, parseFloat(selectedItem.ratePerDay));
                              updateItemTotal(index);
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map((invItem: any) => (
                                <SelectItem key={invItem.id} value={invItem.id.toString()}>
                                  <div className="flex flex-col">
                                    <span>{invItem.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ₹{invItem.ratePerDay}/day • {invItem.availableStock} available
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-sm">Quantity</Label>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value) || 1);
                              updateItemTotal(index);
                            }}
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-sm">Rate/Day</Label>
                      <FormField
                        control={form.control}
                        name={`items.${index}.ratePerDay`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              updateItemTotal(index);
                            }}
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-3">
                      <Label className="text-sm">Line Total</Label>
                      <div className="p-2 bg-gray-50 rounded border text-sm font-medium">
                        ₹{item.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={form.watch("items").length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Totals Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Quotation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({gstRate}%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Payment terms, delivery conditions, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createQuotation.isPending}>
                {createQuotation.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}