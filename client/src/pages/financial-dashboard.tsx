import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  BarChart3,
  PieChart,
  FileText,
  Download
} from "lucide-react";

interface RevenueData {
  month: string;
  receivables: number;
  payments: number;
  netFlow: number;
  operationalCosts: number;
  vendorPayments: number;
  profit: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  type: 'fixed' | 'variable';
  description: string;
}

export default function FinancialDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-year");

  // Mock data based on your Excel structure
  const revenueData: RevenueData[] = [
    {
      month: "January",
      receivables: 311542,
      payments: 196000,
      netFlow: 115542,
      operationalCosts: 83519,
      vendorPayments: 0,
      profit: 32023
    },
    {
      month: "February", 
      receivables: 435946,
      payments: 195624,
      netFlow: 240322,
      operationalCosts: 31716,
      vendorPayments: 50000,
      profit: 158606
    },
    {
      month: "March",
      receivables: 533572,
      payments: 219630,
      netFlow: 313942,
      operationalCosts: 52306,
      vendorPayments: 70000,
      profit: 191636
    },
    {
      month: "April",
      receivables: 837365,
      payments: 180500,
      netFlow: 656865,
      operationalCosts: 128077,
      vendorPayments: 100000,
      profit: 428788
    },
    {
      month: "May",
      receivables: 1007468,
      payments: 222577,
      netFlow: 784891,
      operationalCosts: 336796,
      vendorPayments: 0,
      profit: 448095
    },
    {
      month: "June",
      receivables: 2431617,
      payments: 183683,
      netFlow: 2247934,
      operationalCosts: 256966,
      vendorPayments: 0,
      profit: 1990968
    }
  ];

  const expenseCategories: ExpenseCategory[] = [
    { category: "Rent TDS", amount: 4950, type: 'fixed', description: "Monthly office rent with TDS" },
    { category: "Salary Unit", amount: 45000, type: 'fixed', description: "Staff salaries" },
    { category: "Salary HO", amount: 3000, type: 'fixed', description: "Head office salary" },
    { category: "Travel", amount: 3500, type: 'variable', description: "Business travel expenses" },
    { category: "Water", amount: 3500, type: 'fixed', description: "Utility - Water" },
    { category: "Electricity Bill", amount: 7601, type: 'fixed', description: "Utility - Electricity" },
    { category: "Old Vendor URGENT", amount: 4729, type: 'variable', description: "Urgent vendor payments" },
    { category: "PPT", amount: 200, type: 'variable', description: "Presentation materials" },
    { category: "Police Bill", amount: 627, type: 'fixed', description: "Security clearance" },
    { category: "CA Fees", amount: 22340, type: 'variable', description: "Chartered Accountant fees" },
    { category: "GST", amount: 5276, type: 'variable', description: "GST payments" },
    { category: "Interest", amount: 6000, type: 'variable', description: "Interest payments" },
    { category: "Petty Cash", amount: 2000, type: 'variable', description: "Daily operational expenses" }
  ];

  const totalRevenue = revenueData.reduce((sum, month) => sum + month.receivables, 0);
  const totalProfit = revenueData.reduce((sum, month) => sum + month.profit, 0);
  const currentMonthRevenue = revenueData[revenueData.length - 1]?.receivables || 0;
  const currentMonthProfit = revenueData[revenueData.length - 1]?.profit || 0;

  return (
    <div className="p-6 space-y-6">
      <Header 
        title="Financial Dashboard" 
        subtitle="Comprehensive revenue tracking and financial analytics"
      />

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +142% from last year
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(currentMonthRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              June 2025 performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit (YTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalProfit / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Net profit after all expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((totalProfit / totalRevenue) * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall profitability ratio
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="space-y-4">
        <TabsList>
          <TabsTrigger value="current-year">Current Year</TabsTrigger>
          <TabsTrigger value="monthly-breakdown">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="expense-analysis">Expense Analysis</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="current-year" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue and profit tracking across months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium">{month.month}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{(month.receivables / 100000).toFixed(1)}L</div>
                        <div className="text-sm text-green-600">₹{(month.profit / 100000).toFixed(1)}L profit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly comparison of income and costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.slice(-3).map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{month.month}</span>
                        <Badge variant="outline">
                          {((month.profit / month.receivables) * 100).toFixed(1)}% margin
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Revenue: ₹{(month.receivables / 100000).toFixed(1)}L</span>
                          <span>Costs: ₹{((month.operationalCosts + month.vendorPayments) / 100000).toFixed(1)}L</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(month.profit / month.receivables) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expense-analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fixed vs Variable Costs</CardTitle>
                <CardDescription>Breakdown of operational expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        ₹{(expenseCategories.filter(e => e.type === 'fixed').reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-sm text-blue-600">Fixed Costs</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        ₹{(expenseCategories.filter(e => e.type === 'variable').reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-sm text-orange-600">Variable Costs</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Detailed breakdown of all expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {expenseCategories
                    .sort((a, b) => b.amount - a.amount)
                    .map((expense, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{expense.category}</div>
                        <div className="text-xs text-gray-500">{expense.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{expense.amount.toLocaleString()}</div>
                        <Badge variant={expense.type === 'fixed' ? 'default' : 'secondary'} className="text-xs">
                          {expense.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
              <CardDescription>Monthly cash inflow and outflow tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Receivables</th>
                      <th className="text-right p-2">Payments Out</th>
                      <th className="text-right p-2">Operations</th>
                      <th className="text-right p-2">Vendor Payments</th>
                      <th className="text-right p-2">Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.map((month) => (
                      <tr key={month.month} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{month.month}</td>
                        <td className="p-2 text-right text-green-600">₹{month.receivables.toLocaleString()}</td>
                        <td className="p-2 text-right text-red-600">₹{month.payments.toLocaleString()}</td>
                        <td className="p-2 text-right text-orange-600">₹{month.operationalCosts.toLocaleString()}</td>
                        <td className="p-2 text-right text-purple-600">₹{month.vendorPayments.toLocaleString()}</td>
                        <td className={`p-2 text-right font-semibold ${month.netFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{month.netFlow.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Export reports and manage financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Monthly Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate P&L Statement
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Financial Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}