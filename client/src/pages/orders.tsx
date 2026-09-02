import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SimpleOrderModal } from "@/components/modals/simple-order-modal";
import { ReturnTrackingModal } from "@/components/modals/return-tracking-modal";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sendInvoiceAndToast } from "@/utils/pdf-generator";
import { Plus, Search, MoreHorizontal, Eye, Package, FileText, Trash2, Download, ClipboardList, Truck, Undo2 } from "lucide-react";
import { formatDate, formatINR } from "@/lib/format";
import { useLocation, useSearch } from "wouter";
import type { OrderWithCustomer } from "@shared/schema";

function statusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    case "returned":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function exportOrders(orders: OrderWithCustomer[]) {
  const header = ["Order Number", "Customer", "Company", "Event", "Status", "Start", "End", "Amount"];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.customer.name,
    order.customer.company || "",
    order.eventDetails || "",
    order.status,
    order.startDate,
    order.endDate,
    order.totalAmount,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "switch-rentals-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const monthFilter = new URLSearchParams(search).get("month");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithCustomer | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderWithCustomer | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
  });

  const billOrder = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/orders/${id}/bill`);
      return res.json();
    },
    onSuccess: async (inv: { invoiceNumber: string }) => {
      toast({ title: "GST bill raised", description: `${inv.invoiceNumber} — sending to the purchaser on WhatsApp.` });
      await sendInvoiceAndToast(inv as any, toast);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      setLocation("/invoices");
    },
    onError: (error: any) => {
      toast({ title: "Could not raise bill", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/orders/${id}`),
    onSuccess: () => {
      toast({ title: "Order cancelled", description: "Stock has been returned to inventory." });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel order", variant: "destructive" });
    },
  });

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (monthFilter) {
        const inMonth =
          (order.startDate || "").startsWith(monthFilter) ||
          (order.eventDate || "").startsWith(monthFilter) ||
          (order.endDate || "").startsWith(monthFilter);
        if (!inMonth) return false;
      }
      const haystack = `${order.orderNumber} ${order.customer.name} ${order.customer.company || ""} ${order.eventDetails || ""}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [orders, searchTerm, statusFilter, monthFilter]);

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header
          title="Hires"
          subtitle="Book the van, pull by code, mark dispatched, inspect on return."
          onNewOrder={() => setShowOrderModal(true)}
        />

        <div className="p-6 space-y-6 flex-1">
          <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by order, client, or event"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              {monthFilter && (
                <Button variant="secondary" size="sm" onClick={() => setLocation("/orders")}>
                  {monthFilter} ✕
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportOrders(filteredOrders);
                toast({ title: "Exported", description: `${filteredOrders.length} orders downloaded as CSV.` });
              }}
              disabled={filteredOrders.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-serif text-xl">All orders</h3>
              <span className="text-sm text-muted-foreground">{filteredOrders.length} shown</span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">{searchTerm ? "No matching orders" : "No orders yet"}</h3>
                <Button onClick={() => setShowOrderModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
                    <tr>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Event</th>
                      <th className="px-5 py-3">Dispatch</th>
                      <th className="px-5 py-3">Return</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-t hover:bg-accent/30">
                        <td className="px-5 py-4">
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p>{order.customer.name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer.company || order.customer.phone}</p>
                        </td>
                        <td className="px-5 py-4 text-sm">{order.eventDetails || "—"}</td>
                        <td className="px-5 py-4 text-sm">{formatDate(order.startDate)}</td>
                        <td className="px-5 py-4 text-sm">{formatDate(order.endDate)}</td>
                        <td className="px-5 py-4 font-medium">{formatINR(order.totalAmount)}</td>
                        <td className="px-5 py-4">
                          <Badge className={statusClass(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewOrder(order)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View details
                              </DropdownMenuItem>
                              {order.status === "pending" && (
                                <DropdownMenuItem onClick={() => setStatus.mutate({ id: order.id, status: "active" })}>
                                  <Truck className="w-4 h-4 mr-2" />
                                  Mark dispatched
                                </DropdownMenuItem>
                              )}
                              {(order.status === "active" || order.status === "overdue" || order.status === "pending") && (
                                <DropdownMenuItem onClick={() => setStatus.mutate({ id: order.id, status: "returned" })}>
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Mark returned
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => billOrder.mutate(order.id)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Raise GST bill
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowReturnModal(true)}>
                                <Package className="w-4 h-4 mr-2" />
                                Track returns
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setOrderToDelete(order);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancel order
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
          </div>
        </div>
      </div>

      <SimpleOrderModal open={showOrderModal} onOpenChange={setShowOrderModal} />
      <ReturnTrackingModal open={showReturnModal} onOpenChange={setShowReturnModal} />

      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{viewOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4 text-sm">
              <p><span className="text-muted-foreground">Client:</span> {viewOrder.customer.name}</p>
              <p><span className="text-muted-foreground">Event:</span> {viewOrder.eventDetails || "—"}</p>
              <p><span className="text-muted-foreground">Period:</span> {formatDate(viewOrder.startDate)} – {formatDate(viewOrder.endDate)}</p>
              <div className="border rounded-lg divide-y">
                {viewOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between px-3 py-2">
                    <span>{item.item.name} × {item.quantity}</span>
                    <span>{formatINR(item.totalAmount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-right font-semibold text-base">Total {formatINR(viewOrder.totalAmount)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel {orderToDelete?.orderNumber}? Allocated inventory will be returned to available stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteOrderMutation.isPending}
              onClick={() => orderToDelete && deleteOrderMutation.mutate(orderToDelete.id)}
            >
              {deleteOrderMutation.isPending ? "Cancelling..." : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
