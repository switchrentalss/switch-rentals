import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderModal } from "@/components/modals/order-modal";
import { useState } from "react";
import { 
  ClipboardList, 
  Package, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown 
} from "lucide-react";
import { format } from "date-fns";
import type { DashboardMetrics, OrderWithCustomer, InventoryItem } from "@shared/schema";

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  className = "" 
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center mt-4">
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
              {trendValue}
            </span>
            <span className="text-gray-500 text-sm ml-2">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    default:
      return "outline";
  }
}

function getStockStatus(item: InventoryItem): { status: string; variant: "default" | "secondary" | "destructive" } {
  const stockPercentage = (item.availableStock / item.totalStock) * 100;
  
  if (stockPercentage === 0) {
    return { status: "Out of Stock", variant: "destructive" };
  } else if (stockPercentage < 20) {
    return { status: "Low Stock", variant: "destructive" };
  } else {
    return { status: "In Stock", variant: "default" };
  }
}

export default function Dashboard() {
  const [showOrderModal, setShowOrderModal] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const recentOrders = orders?.slice(0, 5) || [];
  const lowStockItems = inventory?.filter(item => {
    const stockPercentage = (item.availableStock / item.totalStock) * 100;
    return stockPercentage < 20;
  }) || [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening with your rental business."
        onNewOrder={() => setShowOrderModal(true)}
      />
      
      <div className="p-6 space-y-6 flex-1">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Orders"
            value={metrics?.activeOrders || 0}
            icon={ClipboardList}
            trend="up"
            trendValue="+12%"
          />
          <MetricCard
            title="Items Out"
            value={metrics?.itemsOut || 0}
            icon={Package}
            trendValue="89% utilization"
          />
          <MetricCard
            title="Revenue (Month)"
            value={metrics?.monthlyRevenue || "$0.00"}
            icon={DollarSign}
            trend="up"
            trendValue="+18%"
          />
          <MetricCard
            title="Overdue Items"
            value={metrics?.overdueItems || 0}
            icon={AlertTriangle}
            trendValue="Needs attention"
            className={metrics?.overdueItems && metrics.overdueItems > 0 ? "border-red-200" : ""}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No orders yet. Create your first order!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium text-gray-900">{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">{order.customer.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{order.items.length} items</p>
                            <p className="text-sm text-gray-500">
                              Return: {format(new Date(order.endDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  onClick={() => setShowOrderModal(true)}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Create New Order
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  Update Inventory
                </Button>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lowStockItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Only {item.availableStock} left</p>
                        </div>
                        <Badge variant={stockStatus.variant} className="text-xs">
                          {stockStatus.status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Inventory Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inventory Overview</CardTitle>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {inventoryLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !inventory || inventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No inventory items yet. Add your first item!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.slice(0, 5).map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.totalStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.availableStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalStock - item.availableStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.ratePerDay}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderModal 
        open={showOrderModal} 
        onOpenChange={setShowOrderModal}
      />
    </div>
  );
}
