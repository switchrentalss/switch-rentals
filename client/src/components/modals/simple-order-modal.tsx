import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CataloguePicker, type HireLine } from "@/components/catalogue-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Calendar } from "lucide-react";
import type { Customer, InventoryItem } from "@shared/schema";
import { formatINR, rentalDays } from "@/lib/format";
import { billing, packingOnRent } from "@/lib/billing";

interface SelectedItem extends HireLine {}

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
  const [alsoQuote, setAlsoQuote] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const datesReady = Boolean(startDate && endDate);
  const { data: availability, isFetching: availabilityLoading } = useQuery<{
    itemId: number;
    available: number;
    reserved: number;
    totalStock: number;
  }[]>({
    queryKey: ["/api/inventory/availability", startDate, endDate],
    enabled: datesReady,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/availability?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
      );
      if (!res.ok) throw new Error("Could not check availability");
      return res.json();
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", {
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
      const order = await res.json();
      if (data.alsoQuote) {
        const packing = packingOnRent(data.totalAmount);
        const net = data.totalAmount + packing;
        const gst = Math.round(net * billing.gstRate * 100) / 100;
        const daysCount = rentalDays(data.startDate, data.endDate);
        await apiRequest("POST", "/api/invoices", {
          invoice: {
            customerId: data.customerId,
            orderId: order.id,
            invoiceType: "quotation",
            dispatchDate: data.dispatchDate,
            startDate: data.startDate,
            endDate: data.endDate,
            eventDetails: data.eventDetails,
            subtotal: String(net),
            rentAmount: String(data.totalAmount),
            packingAmount: String(packing),
            gstRate: "18.00",
            gstAmount: String(gst),
            totalAmount: String(net + gst),
            depositAmount: String(Number(data.depositAmount || 0)),
            status: "draft",
          },
          items: data.items.map((item: SelectedItem) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            ratePerDay: item.ratePerDay.toString(),
            days: daysCount,
            lineTotal: item.totalAmount.toString(),
          })),
        });
      }
      return order;
    },
    onSuccess: () => {
      toast({
        title: "Hire booked",
        description: alsoQuote
          ? "Stock is reserved. A quotation is ready under Invoices — send it on WhatsApp from there."
          : "Stock is reserved for these dates.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      handleReset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      let description = error.message || "Failed to create order";
      const jsonPart = String(error.message || "").replace(/^\d+:\s*/, "");
      try {
        const parsed = JSON.parse(jsonPart);
        if (parsed.message) description = parsed.message;
      } catch {
        // keep raw message
      }
      toast({
        title: "Could not create order",
        description,
        variant: "destructive",
      });
    },
  });



  const days = rentalDays(startDate, endDate);

  useEffect(() => {
    setSelectedItems((current) =>
      current.map((item) => ({
        ...item,
        totalAmount: item.quantity * item.ratePerDay * days,
      }))
    );
  }, [days]);

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
      alsoQuote,
      depositAmount,
    });
  };

  const handleReset = () => {
    setCustomerId(0);
    setDispatchDate("");
    setStartDate("");
    setEndDate("");
    setEventDetails("");
    setSelectedItems([]);
    setAlsoQuote(true);
    setDepositAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New hire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Customer Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold">Who is hiring?</Label>
              </div>
              <Select value={customerId ? customerId.toString() : undefined} onValueChange={(value) => setCustomerId(parseInt(value))}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="py-2">
                        <div className="font-semibold">{customer.company || customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.name !== customer.company ? customer.name : customer.phone}</div>
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
                <Label className="text-lg font-semibold">When does it move?</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-base font-medium">Van leaves (dispatch)</Label>
                  <Input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Billed from</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Due back / billed until</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Availability is based on overlapping bookings for these dates, not only warehouse stock.
              </p>
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

          <Card>
            <CardContent className="p-6">
              <CataloguePicker
                inventory={inventory}
                days={days}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                datesReady={datesReady}
                availability={availability}
                availabilityLoading={availabilityLoading}
                requireDates
              />
            </CardContent>
          </Card>

          {selectedItems.length > 0 && (
            <Card className="border-primary/20 bg-primary/[0.04]">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Rent</span>
                  <span className="tabular-nums">{formatINR(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Packing 3%</span>
                  <span className="tabular-nums">{formatINR(packingOnRent(totalAmount))}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Before GST</span>
                  <span className="tabular-nums">{formatINR(totalAmount + packingOnRent(totalAmount))}</span>
                </div>
                {alsoQuote && (
                  <div className="pt-2 space-y-1">
                    <Label className="text-sm">Security deposit (held, not GST)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                    />
                    {Number(depositAmount || 0) > 0 && (
                      <p className="text-sm font-medium">
                        To collect now {formatINR(totalAmount + packingOnRent(totalAmount) + Math.round((totalAmount + packingOnRent(totalAmount)) * billing.gstRate * 100) / 100 + Number(depositAmount))}
                      </p>
                    )}
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm pt-2">
                  <input type="checkbox" checked={alsoQuote} onChange={(e) => setAlsoQuote(e.target.checked)} />
                  Also make a quotation (same pieces) to send on WhatsApp
                </label>
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
              className="flex-1 h-12 text-lg"
            >
              {createOrderMutation.isPending ? "Saving…" : "Book this hire"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}