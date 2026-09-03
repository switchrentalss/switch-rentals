import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { breakageFromPurchase } from "@shared/inventory-value";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const inventorySchema = z.object({
  sku: z.string().optional(),
  itemCode: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  totalStock: z.number().min(1, "Total stock must be at least 1"),
  availableStock: z.number().min(0, "Available stock cannot be negative"),
  outStock: z.number().min(0, "Out stock cannot be negative").default(0),
  ratePerDay: z.string().min(1, "Rate per day is required"),
  purchaseCost: z.string().optional(),
  purchaseGstRate: z.string().optional(),
  replacementCost: z.string().optional(),
  status: z.string().default("in_stock"),
  location: z.string().optional(),
  supplier: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

const categories = [
  "Mono Portions Artevo",
  "Mesa Portions Artevo", 
  "Plates",
  "Glassware",
  "Cutlery",
  "Linens",
  "Serving",
  "Decor",
  "Furniture",
  "Other"
];

const subcategories = {
  "Mono Portions Artevo": ["Small Rectangular Plates (Half)", "Round Plates", "Square Plates"],
  "Mesa Portions Artevo": ["Rectangular Platter", "Large Serving Plates", "Buffet Plates"],
  "Plates": ["Dinner Plates", "Side Plates", "Dessert Plates"],
  "Glassware": ["Wine Glasses", "Water Glasses", "Champagne Flutes"],
  "Cutlery": ["Dinner Sets", "Dessert Sets", "Serving Sets"],
  "Linens": ["Tablecloths", "Napkins", "Table Runners"],
  "Serving": ["Serving Trays", "Bowls", "Platters"],
  "Decor": ["Centerpieces", "Candles", "Decorative Items"],
  "Furniture": ["Tables", "Chairs", "Buffet Stands"],
  "Other": ["Miscellaneous Items"]
};

const statusOptions = [
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "on_order", label: "On Order" },
  { value: "discontinued", label: "Discontinued" }
];

const maintenanceStatusOptions = [
  { value: "available", label: "Available" },
  { value: "out_for_rent", label: "Out for Rent" },
  { value: "needs_cleaning", label: "Needs Cleaning" },
  { value: "in_repair", label: "In Repair" },
  { value: "damaged", label: "Damaged" },
  { value: "retired", label: "Retired" }
];

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: any;
}

export function InventoryModal({ open, onOpenChange, editingItem }: InventoryModalProps) {
  const { toast } = useToast();

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: editingItem ? {
      sku: editingItem.sku || "",
      itemCode: editingItem.itemCode || "",
      name: editingItem.name,
      description: editingItem.description || "",
      category: editingItem.category,
      subcategory: editingItem.subcategory || "",
      totalStock: editingItem.totalStock,
      availableStock: editingItem.availableStock,
      outStock: editingItem.outStock || 0,
      ratePerDay: editingItem.ratePerDay,
      purchaseCost: editingItem.purchaseCost && Number(editingItem.purchaseCost) > 0 ? String(editingItem.purchaseCost) : "",
      purchaseGstRate: Number(editingItem.purchaseGstRate) === 5 ? "5.00" : "18.00",
      replacementCost: editingItem.replacementCost || "",
      status: editingItem.status || "in_stock",
      location: editingItem.location || "",
      supplier: editingItem.supplier || "",
      purchaseDate: editingItem.purchaseDate || "",
      warrantyExpiry: editingItem.warrantyExpiry || "",
      notes: editingItem.notes || "",
    } : {
      sku: "",
      itemCode: "",
      name: "",
      description: "",
      category: "",
      subcategory: "",
      totalStock: 1,
      availableStock: 1,
      outStock: 0,
      ratePerDay: "",
      purchaseCost: "",
      purchaseGstRate: "18.00",
      replacementCost: "",
      status: "in_stock",
      location: "",
      supplier: "",
      purchaseDate: "",
      warrantyExpiry: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      form.reset({
        sku: editingItem.sku || "",
        itemCode: editingItem.itemCode || "",
        name: editingItem.name,
        description: editingItem.description || "",
        category: editingItem.category,
        subcategory: editingItem.subcategory || "",
        totalStock: editingItem.totalStock,
        availableStock: editingItem.availableStock,
        outStock: editingItem.outStock || 0,
        ratePerDay: editingItem.ratePerDay,
        purchaseCost: editingItem.purchaseCost && Number(editingItem.purchaseCost) > 0 ? String(editingItem.purchaseCost) : "",
        purchaseGstRate: Number(editingItem.purchaseGstRate) === 5 ? "5.00" : "18.00",
        replacementCost: editingItem.replacementCost || "",
        status: editingItem.status || "in_stock",
        location: editingItem.location || "",
        supplier: editingItem.supplier || "",
        purchaseDate: editingItem.purchaseDate || "",
        warrantyExpiry: editingItem.warrantyExpiry || "",
        notes: editingItem.notes || "",
      });
    } else {
      form.reset();
    }
  }, [open, editingItem, form]);

  const createInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      return apiRequest("POST", "/api/inventory", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-value"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      return apiRequest("PUT", `/api/inventory/${editingItem.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-value"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InventoryFormData) => {
    // Ensure available stock doesn't exceed total stock
    if (data.availableStock > data.totalStock) {
      form.setError("availableStock", {
        message: "Available stock cannot exceed total stock"
      });
      return;
    }
    
    const payload = {
      ...data,
      purchaseGstRate: Number(data.purchaseGstRate) === 5 ? "5.00" : "18.00",
      purchaseCost: data.purchaseCost && Number(data.purchaseCost) > 0 ? data.purchaseCost : "0.00",
      replacementCost:
        data.replacementCost && Number(data.replacementCost) > 0
          ? data.replacementCost
          : data.purchaseCost && Number(data.purchaseCost) > 0
            ? String(breakageFromPurchase(Number(data.purchaseCost)))
            : data.replacementCost,
    };
    if (editingItem) {
      updateInventoryMutation.mutate(payload);
    } else {
      createInventoryMutation.mutate(payload);
    }
  };

  // Sync available stock with total stock when total stock changes
  const handleTotalStockChange = (value: string) => {
    const totalStock = parseInt(value) || 0;
    const currentAvailable = form.getValues("availableStock");
    
    form.setValue("totalStock", totalStock);
    
    // If available stock exceeds new total, adjust it
    if (currentAvailable > totalStock) {
      form.setValue("availableStock", totalStock);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU/ID</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU-001 or SKANS-C154H-31" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="itemCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code</FormLabel>
                    <FormControl>
                      <Input placeholder="C154H-11.25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Small Rectangular Plates (Half)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.watch("category") && subcategories[form.watch("category") as keyof typeof subcategories]?.map((subcat) => (
                          <SelectItem key={subcat} value={subcat}>
                            {subcat}
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
                name="totalStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Stock *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value) || 0);
                          handleTotalStockChange(e.target.value);
                        }}
                        min="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Stock *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min="0"
                        max={form.watch("totalStock")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Out Stock</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={form.watch("totalStock") - form.watch("availableStock")}
                        disabled
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ratePerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate/Day (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25.00" 
                        {...field}
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy cost (₹, ex-GST)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100.00"
                        {...field}
                        step="0.01"
                        onBlur={() => {
                          field.onBlur();
                          const buy = Number(form.getValues("purchaseCost"));
                          const listed = form.getValues("replacementCost");
                          if (buy > 0 && (!listed || Number(listed) <= 0)) {
                            form.setValue("replacementCost", breakageFromPurchase(buy).toFixed(2));
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>What the mill paid the supplier, before GST.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseGstRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST on purchase</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "18.00"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="GST rate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5.00">5%</SelectItem>
                        <SelectItem value="18.00">18%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Input GST on the buy. Breakage billed to clients is always 18%.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="replacementCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breakage / replace (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="125.00" 
                        {...field}
                        step="0.01"
                      />
                    </FormControl>
                    <FormDescription>
                      Usually 125% of buy. GST on this line to the client is always 18%.
                      {Number(form.watch("purchaseCost")) > 0 ? (
                        <button
                          type="button"
                          className="ml-2 underline text-foreground"
                          onClick={() =>
                            form.setValue(
                              "replacementCost",
                              breakageFromPurchase(Number(form.getValues("purchaseCost"))).toFixed(2),
                            )
                          }
                        >
                          Set 125% of buy
                        </button>
                      ) : null}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse A, Shelf 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Expiry</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., 10.5 inch ceramic plates, dishwasher safe" 
                      rows={3} 
                      {...field} 
                    />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about maintenance, care instructions, or special handling" 
                      rows={2} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInventoryMutation.isPending || updateInventoryMutation.isPending}
              >
                {editingItem
                  ? updateInventoryMutation.isPending
                    ? "Saving…"
                    : "Save item"
                  : createInventoryMutation.isPending
                    ? "Creating..."
                    : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
