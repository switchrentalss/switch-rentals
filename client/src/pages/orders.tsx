import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SimpleOrderModal } from "@/components/modals/simple-order-modal";
import { ReturnChallanModal } from "@/components/modals/return-challan-modal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Filter, Eye, MoreHorizontal, Edit, Package, FileText, Trash2, Download, Settings, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import type { OrderWithCustomer, InvoiceWithCustomer } from "@shared/schema";

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    case "returned":
      return "outline";
    default:
      return "outline";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    case "returned":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function Orders() {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [editingOrder, setEditingOrder] = useState<OrderWithCustomer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithCustomer | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders?.filter(order => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    return order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           order.eventDetails?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header 
        title="Orders Management" 
        subtitle="Create and manage rental orders with simple workflow"
        onNewOrder={() => setShowOrderModal(true)}
      />
      
      <div className="p-6 space-y-6 flex-1">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search orders by number, customer, or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No orders found" : "No orders yet"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search terms"
                    : "Create your first rental order to get started"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowOrderModal(true)}>
                    Create New Order
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                            <div className="text-sm text-gray-500">
                              Created {format(new Date(order.createdAt), "MMM dd, yyyy")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.customer.name}</div>
                            <div className="text-sm text-gray-500">{order.customer.company}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(order.eventDate), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items.length} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{order.totalAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(order.endDate), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => {
                                setEditingOrder(order);
                                setShowOrderModal(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingOrder(order);
                                setShowOrderModal(true);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // Navigate to inventory returns with order filter
                                window.location.href = `/inventory-returns?order=${order.id}`;
                              }}>
                                <Package className="w-4 h-4 mr-2" />
                                Track Items
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // Navigate to invoices page with order filter
                                window.location.href = `/invoices?order=${order.id}`;
                              }}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setOrderToDelete(order);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderModal 
        open={showOrderModal} 
        onOpenChange={(open) => {
          setShowOrderModal(open);
          if (!open) setEditingOrder(null);
        }}
        editingOrder={editingOrder}
      />

      <ReturnChallanModal
        open={showReturnModal}
        onOpenChange={setShowReturnModal}
        gstInvoice={selectedInvoice}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order "{orderToDelete?.orderNumber}"? This action cannot be undone and will permanently remove the order and return all allocated inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderToDelete) {
                  deleteOrderMutation.mutate(orderToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
