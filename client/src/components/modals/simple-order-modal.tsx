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
import { Plus, Trash2, User, Calendar, Package, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Filter inventory based on search and category
  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

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
    setSearchTerm("");
    setSelectedCategory("");
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

          {/* Search and Select Items */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-6 w-6 text-purple-600" />
                <Label className="text-2xl font-bold">Select Items</Label>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-lg border-2 border-gray-300 focus:border-blue-500 rounded-lg"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.from(new Set(inventory?.map(item => item.category) || [])).map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category ? "" : category)}
                    className="rounded-full px-4 py-2"
                  >
                    {category}
                  </Button>
                ))}
                {selectedCategory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory("")}
                    className="rounded-full px-4 py-2 text-gray-500"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>

              {/* Selected Items Cart Style */}
              {selectedItems.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">Selected Items</h3>
                  <div className="space-y-3">
                    {selectedItems.map((selectedItem) => {
                      const item = inventory?.find(i => i.id === selectedItem.itemId);
                      if (!item) return null;
                      
                      return (
                        <div key={selectedItem.itemId} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">₹{item.ratePerDay}/day</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 border rounded-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newQty = Math.max(0, selectedItem.quantity - 1);
                                  if (newQty === 0) {
                                    setSelectedItems(selectedItems.filter(si => si.itemId !== selectedItem.itemId));
                                  } else {
                                    const updatedItems = [...selectedItems];
                                    const itemIndex = updatedItems.findIndex(si => si.itemId === selectedItem.itemId);
                                    updatedItems[itemIndex].quantity = newQty;
                                    updatedItems[itemIndex].totalAmount = newQty * parseFloat(item.ratePerDay);
                                    setSelectedItems(updatedItems);
                                  }
                                }}
                                className="w-10 h-10 p-0 hover:bg-gray-100"
                                disabled={selectedItem.quantity <= 1}
                              >
                                -
                              </Button>
                              
                              <span className="w-12 text-center font-semibold text-lg">
                                {selectedItem.quantity}
                              </span>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newQty = selectedItem.quantity + 1;
                                  const updatedItems = [...selectedItems];
                                  const itemIndex = updatedItems.findIndex(si => si.itemId === selectedItem.itemId);
                                  updatedItems[itemIndex].quantity = newQty;
                                  updatedItems[itemIndex].totalAmount = newQty * parseFloat(item.ratePerDay);
                                  setSelectedItems(updatedItems);
                                }}
                                className="w-10 h-10 p-0 hover:bg-gray-100"
                              >
                                +
                              </Button>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right min-w-20">
                              <div className="font-bold text-lg">₹{selectedItem.totalAmount.toFixed(2)}</div>
                            </div>
                            
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItems(selectedItems.filter(si => si.itemId !== selectedItem.itemId));
                              }}
                              className="w-10 h-10 p-0 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Items */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <h3 className="font-bold text-lg text-gray-800 sticky top-0 bg-white py-2">Available Items</h3>
                {filteredInventory?.map((item) => {
                  const isSelected = selectedItems.some(si => si.itemId === item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => {
                        if (!isSelected) {
                          const newItem: SelectedItem = {
                            itemId: item.id,
                            itemName: item.name,
                            quantity: 1,
                            ratePerDay: parseFloat(item.ratePerDay),
                            totalAmount: parseFloat(item.ratePerDay),
                          };
                          setSelectedItems([...selectedItems, newItem]);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-green-600">₹{item.ratePerDay}</span>
                            <span className="text-sm text-gray-500">/day</span>
                          </div>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          ✓
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newItem: SelectedItem = {
                              itemId: item.id,
                              itemName: item.name,
                              quantity: 1,
                              ratePerDay: parseFloat(item.ratePerDay),
                              totalAmount: parseFloat(item.ratePerDay),
                            };
                            setSelectedItems([...selectedItems, newItem]);
                          }}
                          className="px-4 py-2"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {filteredInventory?.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No items found matching your search</p>
                </div>
              )}
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