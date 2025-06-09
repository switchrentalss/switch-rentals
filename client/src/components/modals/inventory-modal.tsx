import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const inventorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  totalStock: z.number().min(1, "Total stock must be at least 1"),
  availableStock: z.number().min(0, "Available stock cannot be negative"),
  ratePerDay: z.string().min(1, "Rate per day is required"),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

const categories = [
  "Plates",
  "Glassware", 
  "Cutlery",
  "Linens",
  "Serving",
  "Decor",
  "Furniture",
  "Other"
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
      name: editingItem.name,
      description: editingItem.description || "",
      category: editingItem.category,
      totalStock: editingItem.totalStock,
      availableStock: editingItem.availableStock,
      ratePerDay: editingItem.ratePerDay,
    } : {
      name: "",
      description: "",
      category: "",
      totalStock: 1,
      availableStock: 1,
      ratePerDay: "",
    },
  });

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
    
    createInventoryMutation.mutate(data);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dinner Plates (White)" {...field} />
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
                name="ratePerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate per Day *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="2.50" 
                        {...field} 
                      />
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
                disabled={createInventoryMutation.isPending}
              >
                {createInventoryMutation.isPending ? "Creating..." : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
