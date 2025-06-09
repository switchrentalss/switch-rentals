import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const formSchema = z.object({
  orderId: z.number().min(1, "Please select an order"),
  itemId: z.number().min(1, "Please select an item"),
  quantityShipped: z.number().min(1, "Quantity shipped is required"),
  quantityReturned: z.number().min(0, "Quantity returned must be 0 or more"),
  conditionStatus: z.enum(["perfect", "damaged", "missing", "needs_cleaning"]),
  damageNotes: z.string().optional(),
  checkedBy: z.string().min(1, "Checked by is required"),
  penaltyAmount: z.string().default("0.00")
});

type FormData = z.infer<typeof formSchema>;

interface ReturnTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReturnTrackingModal({ open, onOpenChange }: ReturnTrackingModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderId: 0,
      itemId: 0,
      quantityShipped: 1,
      quantityReturned: 0,
      conditionStatus: "perfect",
      damageNotes: "",
      checkedBy: "",
      penaltyAmount: "0.00"
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
    enabled: open
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
    enabled: open
  });

  const createReturnTracking = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/inventory-returns", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-returns"] });
      toast({
        title: "Success",
        description: "Return tracking entry created successfully"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create return tracking entry",
        variant: "destructive"
      });
    }
  });

  // Calculate penalty amount based on condition
  const conditionStatus = form.watch("conditionStatus");
  const quantityReturned = form.watch("quantityReturned");
  const quantityShipped = form.watch("quantityShipped");
  const selectedItemId = form.watch("itemId");

  const selectedItem = inventoryItems.find((item: any) => item.id === selectedItemId);
  const missingQuantity = quantityShipped - quantityReturned;

  // Calculate penalties
  let penaltyAmount = 0;
  if (conditionStatus === "damaged" && quantityReturned > 0) {
    // 50% penalty for damaged items
    penaltyAmount = quantityReturned * parseFloat(selectedItem?.ratePerDay || "0") * 0.5;
  } else if (conditionStatus === "missing" || missingQuantity > 0) {
    // 100% penalty for missing items
    penaltyAmount = missingQuantity * parseFloat(selectedItem?.ratePerDay || "0");
  }

  const onSubmit = (data: FormData) => {
    const returnData = {
      ...data,
      penaltyAmount: penaltyAmount.toFixed(2)
    };

    createReturnTracking.mutate(returnData);
  };

  function getConditionBadge(status: string) {
    const variants = {
      'perfect': { variant: 'default' as const, color: 'text-green-600', icon: CheckCircle },
      'damaged': { variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle },
      'missing': { variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle },
      'needs_cleaning': { variant: 'secondary' as const, color: 'text-yellow-600', icon: Clock }
    };

    const config = variants[status as keyof typeof variants] || variants.perfect;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Create Return Tracking Entry</span>
          </DialogTitle>
          <DialogDescription>
            Track the condition and return status of rental items
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Order and Item Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orders.map((order: any) => (
                          <SelectItem key={order.id} value={order.id.toString()}>
                            {order.orderNumber} - {order.customer?.name}
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
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
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
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantityShipped"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Shipped *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantityReturned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Returned *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Condition Status */}
            <FormField
              control={form.control}
              name="conditionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="perfect">Perfect Condition</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="missing">Missing</SelectItem>
                      <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Damage Notes */}
            {(conditionStatus === "damaged" || conditionStatus === "needs_cleaning") && (
              <FormField
                control={form.control}
                name="damageNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Damage/Cleaning Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the damage or cleaning requirements..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Checked By */}
            <FormField
              control={form.control}
              name="checkedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checked By *</FormLabel>
                  <FormControl>
                    <Input placeholder="Staff member name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Penalty Calculation */}
            {penaltyAmount > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Penalty Calculation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {conditionStatus === "damaged" && (
                      <div>Damaged items (50% penalty): {quantityReturned} × ₹{selectedItem?.ratePerDay || 0} × 0.5 = ₹{penaltyAmount.toFixed(2)}</div>
                    )}
                    {missingQuantity > 0 && (
                      <div>Missing items (100% penalty): {missingQuantity} × ₹{selectedItem?.ratePerDay || 0} = ₹{(missingQuantity * parseFloat(selectedItem?.ratePerDay || "0")).toFixed(2)}</div>
                    )}
                    <div className="font-semibold text-red-700">Total Penalty: ₹{penaltyAmount.toFixed(2)}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Return Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span>Condition Status:</span>
                  {getConditionBadge(conditionStatus)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span>Missing Items:</span>
                  <span className={missingQuantity > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                    {missingQuantity} {missingQuantity > 0 ? "items missing" : "all returned"}
                  </span>
                </div>
              </CardContent>
            </Card>

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
                disabled={createReturnTracking.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createReturnTracking.isPending ? "Creating..." : "Create Return Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}