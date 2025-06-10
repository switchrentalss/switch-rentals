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
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header 
          title="Orders Management" 
          subtitle="Create and manage rental orders with simple workflow"
          onNewOrder={() => setShowOrderModal(true)}
        />
        
        <div className="p-6 space-y-6 flex-1">
        {/* Top Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Left side - Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search Orders"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right side - Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowOrderModal(true)} className="bg-blue-600 hover:bg-blue-700 h-10">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Orders</h3>
              <span className="text-sm text-gray-500">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
          </div>
          
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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
                  <Button onClick={() => setShowOrderModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Order
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {/* Table Header */}
                <div className="grid grid-cols-8 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  <div className="col-span-1">Order Date</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Order Number</div>
                  <div className="col-span-1">Draft Title</div>
                  <div className="col-span-2">Company</div>
                  <div className="col-span-1">Buyer</div>
                  <div className="col-span-1">Ship Start</div>
                </div>

                {/* Order Rows */}
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-8 gap-4 px-4 py-4 hover:bg-gray-50 transition-colors items-center group"
                  >
                    {/* Status Circle + Date */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        order.status === 'active' ? 'bg-green-500' :
                        order.status === 'pending' ? 'bg-yellow-500' :
                        order.status === 'overdue' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}>
                        {order.status === 'active' ? '✓' :
                         order.status === 'pending' ? '⏳' :
                         order.status === 'overdue' ? '⚠' : '○'}
                      </div>
                      <div className="text-sm text-gray-900">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </div>
                    </div>

                    {/* Status Text */}
                    <div className="text-sm font-medium capitalize">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Order Number */}
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </div>

                    {/* Draft Title / Event Details */}
                    <div className="text-sm text-gray-600 truncate">
                      {order.eventDetails || "Order Details"}
                    </div>

                    {/* Company */}
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-gray-900">{order.customer.name}</div>
                      <div className="text-xs text-gray-500">{order.customer.company || order.customer.phone}</div>
                    </div>

                    {/* Buyer */}
                    <div className="text-sm text-gray-900">
                      {order.customer.name.split(' ')[0]}
                    </div>

                    {/* Ship Start */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900">
                        {format(new Date(order.startDate), "MMM dd, yyyy")}
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                            window.location.href = `/inventory-returns?order=${order.id}`;
                          }}>
                            <Package className="w-4 h-4 mr-2" />
                            Track Items
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SimpleOrderModal 
        open={showOrderModal} 
        onOpenChange={(open) => {
          setShowOrderModal(open);
          if (!open) setEditingOrder(null);
        }}
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
    </>
  );
}
