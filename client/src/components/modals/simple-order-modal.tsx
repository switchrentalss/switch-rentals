import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, User, Calendar, Package } from "lucide-react";
import type { Customer, InventoryItem } from "@shared/schema";

interface SelectedItem {
  itemId: number;
  itemName: string;
  quantity: number;
  ratePerDay: number;
  totalAmount: number;
}

interface SimpleOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleOrderModal({ open, onOpenChange }: SimpleOrderModalProps) {
  const { toast } = useToast();
  
  // Form state
  const [customerId, setCustomerId] = useState<number>(0);
  const [dispatchDate, setDispatchDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/orders", {
        order: {
          customerId: data.customerId,
          eventDate: data.dispatchDate,
          startDate: data.startDate,
          endDate: data.endDate,
          eventDetails: data.eventDetails,
          totalAmount: data.totalAmount.toString(),
        },
        items: data.items.map((item: SelectedItem) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          ratePerDay: item.ratePerDay.toString(),
          totalAmount: item.totalAmount.toString(),
        })),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Order Created",
        description: "New order has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      handleReset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (selectedItemId === 0 || quantity < 1) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please select an item and enter quantity",
        variant: "destructive",
      });
      return;
    }

    const item = inventory?.find(i => i.id === selectedItemId);
    if (!item) return;

    const existingItemIndex = selectedItems.findIndex(si => si.itemId === selectedItemId);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity = quantity;
      updatedItems[existingItemIndex].totalAmount = quantity * parseFloat(item.ratePerDay);
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const newItem: SelectedItem = {
        itemId: selectedItemId,
        itemName: item.name,
        quantity: quantity,
        ratePerDay: parseFloat(item.ratePerDay),
        totalAmount: quantity * parseFloat(item.ratePerDay),
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    setSelectedItemId(0);
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(item => item.itemId !== itemId));
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.totalAmount, 0);

  const handleSubmit = () => {
    if (!customerId || !dispatchDate || !startDate || !endDate || selectedItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Prepare items data for API
    const orderItems = selectedItems.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      ratePerDay: item.ratePerDay.toString(),
      totalAmount: item.totalAmount.toString(),
    }));

    createOrderMutation.mutate({
      customerId,
      dispatchDate,
      startDate,
      endDate,
      eventDetails,
      items: orderItems,
      totalAmount,
    });
  };

  const handleReset = () => {
    setCustomerId(0);
    setDispatchDate("");
    setStartDate("");
    setEndDate("");
    setEventDetails("");
    setSelectedItems([]);
    setSelectedItemId(0);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">📋 Create New Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Customer Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold">Select Customer</Label>
              </div>
              <Select value={customerId.toString()} onValueChange={(value) => setCustomerId(parseInt(value))}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="py-2">
                        <div className="font-semibold">{customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.phone}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <Label className="text-lg font-semibold">Event Dates</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-base font-medium">Dispatch Date</Label>
                  <Input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-lg font-semibold mb-3 block">Event Details (Optional)</Label>
              <Input
                placeholder="Enter event details..."
                value={eventDetails}
                onChange={(e) => setEventDetails(e.target.value)}
                className="h-12 text-lg"
              />
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-purple-600" />
                <Label className="text-lg font-semibold">Select Items</Label>
              </div>
              
              {/* Available Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {inventory?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{item.name}</div>
                      <div className="text-green-600 font-medium">₹{item.ratePerDay}/day</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="0"
                        value={
                          selectedItems.find(si => si.itemId === item.id)?.quantity || 0
                        }
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 0;
                          if (qty === 0) {
                            // Remove item if quantity is 0
                            setSelectedItems(selectedItems.filter(si => si.itemId !== item.id));
                          } else {
                            const existingItemIndex = selectedItems.findIndex(si => si.itemId === item.id);
                            if (existingItemIndex >= 0) {
                              // Update existing item
                              const updatedItems = [...selectedItems];
                              updatedItems[existingItemIndex].quantity = qty;
                              updatedItems[existingItemIndex].totalAmount = qty * parseFloat(item.ratePerDay);
                              setSelectedItems(updatedItems);
                            } else {
                              // Add new item
                              const newItem: SelectedItem = {
                                itemId: item.id,
                                itemName: item.name,
                                quantity: qty,
                                ratePerDay: parseFloat(item.ratePerDay),
                                totalAmount: qty * parseFloat(item.ratePerDay),
                              };
                              setSelectedItems([...selectedItems, newItem]);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && e.currentTarget.value === '0') {
                            e.currentTarget.value = '';
                          }
                        }}
                        className="w-20 h-10 text-center text-lg font-semibold"
                        placeholder="0"
                      />
                      
                      <div className="text-right min-w-24">
                        <div className="text-lg font-bold text-blue-600">
                          ₹{((selectedItems.find(si => si.itemId === item.id)?.quantity || 0) * parseFloat(item.ratePerDay)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          {selectedItems.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-semibold">Order Total</span>
                    <div className="text-sm text-gray-600">{selectedItems.length} items selected</div>
                  </div>
                  <span className="text-3xl font-bold text-blue-600">₹{totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-lg"
              disabled={createOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}