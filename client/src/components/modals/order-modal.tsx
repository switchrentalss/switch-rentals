import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Package } from "lucide-react";
import type { Customer, InventoryItem } from "@shared/schema";

const orderSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  eventDate: z.string().min(1, "Dispatch date is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  eventDetails: z.string().optional(),
  items: z.array(z.object({
    itemId: z.number().min(1),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    ratePerDay: z.string(),
    totalAmount: z.string(),
  })).min(1, "At least one item is required"),
  totalAmount: z.string(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderModal({ open, onOpenChange }: OrderModalProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Array<{
    itemId: number;
    quantity: number;
    ratePerDay: string;
    totalAmount: string;
  }>>([]);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: 0,
      eventDate: "",
      startDate: "",
      endDate: "",
      eventDetails: "",
      items: [],
      totalAmount: "0.00",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const { items, totalAmount, ...orderData } = data;
      return apiRequest("POST", "/api/orders", {
        order: { ...orderData, totalAmount },
        items: items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          ratePerDay: item.ratePerDay,
          totalAmount: item.totalAmount,
        })),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
      form.reset();
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setSelectedItems([...selectedItems, {
      itemId: 0,
      quantity: 1,
      ratePerDay: "0.00",
      totalAmount: "0.00",
    }]);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
    updateFormItems(newItems);
  };

  const updateItem = (index: number, updates: Partial<typeof selectedItems[0]>) => {
    const newItems = selectedItems.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    );
    
    // Calculate total amount for the item
    if (updates.itemId || updates.quantity) {
      const item = newItems[index];
      const inventoryItem = inventory?.find(inv => inv.id === item.itemId);
      if (inventoryItem) {
        const days = calculateDays();
        const total = parseFloat(inventoryItem.ratePerDay) * item.quantity * days;
        item.ratePerDay = inventoryItem.ratePerDay;
        item.totalAmount = total.toFixed(2);
      }
    }
    
    setSelectedItems(newItems);
    updateFormItems(newItems);
  };

  const updateFormItems = (items: typeof selectedItems) => {
    const days = calculateDays();
    const total = items.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
    
    form.setValue("items", items);
    form.setValue("totalAmount", total.toFixed(2));
  };

  const calculateDays = () => {
    const startDate = form.getValues("startDate");
    const endDate = form.getValues("endDate");
    
    if (!startDate || !endDate) return 1;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays);
  };

  const onSubmit = (data: OrderFormData) => {
    createOrderMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
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
                    <FormLabel>Dispatch Date</FormLabel>
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
                    <FormLabel>Rental Start</FormLabel>
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
                    <FormLabel>Rental End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      placeholder="Wedding reception, corporate event, etc." 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">Selected Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {selectedItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-500" />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Select 
                        value={item.itemId.toString()} 
                        onValueChange={(value) => updateItem(index, { itemId: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory?.filter(inv => inv.availableStock > 0).map((inventoryItem) => (
                            <SelectItem key={inventoryItem.id} value={inventoryItem.id.toString()}>
                              {inventoryItem.name} (₹{inventoryItem.ratePerDay}/day)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                          updateItem(index, { quantity: newQuantity });
                        }}
                        min="1"
                        step="1"
                      />

                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">₹{item.totalAmount}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedItems.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    No items selected. Click "Add Item" to get started.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Total Estimate</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{form.watch("totalAmount")}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
