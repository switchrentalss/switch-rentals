import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { OrderWithCustomer, DashboardMetrics } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  
  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  // Calculate additional metrics
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const recentOrders = orders?.slice(0, 10) || [];

  // Report generation functions
  const generateMonthlyRevenueReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Switch Rental Services LLP', 20, 30);
    doc.setFontSize(16);
    doc.text('Monthly Revenue Report', 20, 45);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 55);
    
    // Summary
    doc.text(`Total Orders: ${totalOrders}`, 20, 75);
    doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString()}`, 20, 85);
    doc.text(`Average Order Value: ₹${avgOrderValue.toLocaleString()}`, 20, 95);
    
    // Orders table
    if (orders && orders.length > 0) {
      const tableData = orders.map(order => [
        order.orderNumber,
        order.customer.name,
        format(new Date(order.eventDate), 'dd/MM/yyyy'),
        order.status,
        `₹${parseFloat(order.totalAmount).toLocaleString()}`
      ]);
      
      (doc as any).autoTable({
        head: [['Order No.', 'Customer', 'Event Date', 'Status', 'Amount']],
        body: tableData,
        startY: 110,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save('monthly_revenue_report.pdf');
    toast({
      title: "Report Generated",
      description: "Monthly revenue report has been downloaded successfully.",
    });
  };

  const generateInventoryUtilizationReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Switch Rental Services LLP', 20, 30);
    doc.setFontSize(16);
    doc.text('Inventory Utilization Report', 20, 45);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 55);
    
    // Inventory table
    if (inventory && Array.isArray(inventory) && inventory.length > 0) {
      const tableData = inventory.map((item: any) => [
        item.name,
        item.category,
        item.totalStock,
        item.availableStock,
        item.totalStock - item.availableStock,
        `${(((item.totalStock - item.availableStock) / item.totalStock) * 100).toFixed(1)}%`,
        `₹${item.ratePerDay}`
      ]);
      
      (doc as any).autoTable({
        head: [['Item Name', 'Category', 'Total Stock', 'Available', 'Out', 'Utilization %', 'Rate/Day']],
        body: tableData,
        startY: 75,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save('inventory_utilization_report.pdf');
    toast({
      title: "Report Generated",
      description: "Inventory utilization report has been downloaded successfully.",
    });
  };

  const generateCustomerReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Switch Rental Services LLP', 20, 30);
    doc.setFontSize(16);
    doc.text('Customer Rental History Report', 20, 45);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 55);
    
    // Customer summary by orders
    if (orders && orders.length > 0) {
      const customerSummary: { [key: string]: { name: string; orders: number; revenue: number } } = {};
      
      orders.forEach(order => {
        const customerId = order.customerId.toString();
        if (!customerSummary[customerId]) {
          customerSummary[customerId] = {
            name: order.customer.name,
            orders: 0,
            revenue: 0
          };
        }
        customerSummary[customerId].orders++;
        customerSummary[customerId].revenue += parseFloat(order.totalAmount);
      });
      
      const tableData = Object.values(customerSummary).map(customer => [
        customer.name,
        customer.orders,
        `₹${customer.revenue.toLocaleString()}`,
        `₹${(customer.revenue / customer.orders).toLocaleString()}`
      ]);
      
      (doc as any).autoTable({
        head: [['Customer Name', 'Total Orders', 'Total Revenue', 'Avg Order Value']],
        body: tableData,
        startY: 75,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save('customer_report.pdf');
    toast({
      title: "Report Generated",
      description: "Customer report has been downloaded successfully.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Reports" 
        subtitle="View analytics and generate reports for your rental business."
      />
      
      <div className="p-6 space-y-6 flex-1">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{avgOrderValue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.activeOrders || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={generateMonthlyRevenueReport}
              >
                <div className="text-left">
                  <div className="font-medium">Monthly Revenue Report</div>
                  <div className="text-sm text-gray-500">Generate revenue breakdown by month</div>
                </div>
                <Download className="w-4 h-4 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={generateInventoryUtilizationReport}
              >
                <div className="text-left">
                  <div className="font-medium">Inventory Utilization</div>
                  <div className="text-sm text-gray-500">View item usage statistics</div>
                </div>
                <Download className="w-4 h-4 ml-auto" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4"
                onClick={generateCustomerReport}
              >
                <div className="text-left">
                  <div className="font-medium">Customer Report</div>
                  <div className="text-sm text-gray-500">Export customer rental history</div>
                </div>
                <Download className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{order.totalAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={order.status === "active" ? "default" : "secondary"}>
                            {order.status}
                          </Badge>
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
    </div>
  );
}
