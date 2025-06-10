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
        title: "⚠️ Missing Information",
        description: "Please fill all required fields and add at least one item",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      customerId,
      dispatchDate,
      startDate,
      endDate,
      eventDetails,
      items: selectedItems,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">📋 Create New Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-purple-600" />
                <Label className="text-lg font-semibold">Add Items</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <Label className="text-base font-medium">Select Item</Label>
                  <Select value={selectedItemId.toString()} onValueChange={(value) => setSelectedItemId(parseInt(value))}>
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Choose an item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory?.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="py-2">
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-sm text-gray-600">₹{item.ratePerDay}/day</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-base font-medium">Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="h-12 text-lg"
                    />
                    <Button onClick={handleAddItem} className="h-12 px-6 bg-green-600 hover:bg-green-700">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-lg font-semibold mb-3 block">Selected Items</Label>
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{item.itemName}</div>
                        <div className="text-gray-600">
                          {item.quantity} × ₹{item.ratePerDay}/day = ₹{item.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Total Estimate</span>
                    <span className="text-2xl font-bold text-green-600">₹{totalAmount.toFixed(2)}</span>
                  </div>
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