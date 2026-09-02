import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SimpleOrderModal } from "@/components/modals/simple-order-modal";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ClipboardList,
  Package,
  IndianRupee,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Truck,
  Undo2,
  Banknote,
  CalendarDays,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatDate, formatINR, stockPercent, catalogueCode } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { todayIso } from "@shared/hire";
import type { OrderWithCustomer, InventoryItem, Enquiry } from "@shared/schema";

function MetricLink({
  href,
  title,
  value,
  hint,
  icon: Icon,
}: {
  href: string;
  title: string;
  value: string | number;
  hint: string;
  icon: typeof ClipboardList;
}) {
  return (
    <Link href={href} className="block h-full rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{hint}</p>
          </div>
          <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
    </Link>
  );
}

function getStatusClass(status: string) {
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

type FinanceInvoice = {
  month: string;
  monthLabel: string;
  client: string;
  invoiceNo: string;
  eventDate: string;
  net: number;
  gst: number;
  gross: number;
  collected: number;
  pending: number;
  status: string;
};

type MonthRow = {
  month: string;
  label: string;
  forecast?: boolean;
  invoiceCount: number;
  net: number;
  gst: number;
  gross?: number;
  pending: number;
  cashCollected?: number;
};

function monthTitle(key: string) {
  try {
    return format(parseISO(`${key}-01`), "MMMM yyyy");
  } catch {
    return key;
  }
}

function getStockStatus(item: InventoryItem) {
  const pct = stockPercent(item.availableStock, item.totalStock);
  if (pct === 0) return { status: "Out of Stock", className: "bg-red-100 text-red-800" };
  if (pct < 20) return { status: "Low Stock", className: "bg-amber-100 text-amber-800" };
  return { status: "In Stock", className: "bg-emerald-100 text-emerald-800" };
}

export default function Dashboard() {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [drill, setDrill] = useState<{ title: string; invoices?: FinanceInvoice[]; orders?: OrderWithCustomer[] } | null>(null);
  const { toast } = useToast();

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: finance } = useQuery<{
    story: { billedNet: number; stillOwed: number; operatingProfit?: number; cashCollected: number };
    monthly: MonthRow[];
    invoices: FinanceInvoice[];
    pendingByClient: { client: string; pending: number }[];
  }>({ queryKey: ["/api/finance"] });
  const s = finance?.story;

  const { data: leads = [] } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const bootstrap = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/ops/bootstrap")).json(),
    onSuccess: (data: { itemsAdded: number; clientsAdded: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Ready for the mill",
        description: `Added ${data.itemsAdded} SKUs and ${data.clientsAdded} clients.`,
      });
    },
  });

  const markLead = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      });
      if (!res.ok) throw new Error("Failed to update enquiry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({ title: "Marked contacted", description: "This website lead is now in the contacted list." });
    },
  });

  const today = todayIso();
  const recentOrders = orders?.slice(0, 6) || [];
  const dispatchToday = (orders || []).filter((o) => o.startDate === today && o.status !== "cancelled" && o.status !== "returned");
  const returnsDue = (orders || []).filter(
    (o) => o.endDate <= today && o.status !== "returned" && o.status !== "cancelled",
  );
  const onHire = (orders || []).filter((o) => o.status === "active" || (o.startDate <= today && o.endDate >= today && o.status === "pending"));
  const monthKey = today.slice(0, 7);
  const monthRow = (finance?.monthly || []).find((m) => m.month === monthKey && !m.forecast);
  const monthInvoices = (finance?.invoices || []).filter((i) => i.month === monthKey);
  const monthOrders = (orders || []).filter(
    (o) => o.status !== "cancelled" && ((o.startDate || "").startsWith(monthKey) || (o.eventDate || "").startsWith(monthKey)),
  );
  const monthBilled = monthRow?.gross ?? monthInvoices.reduce((sum, i) => sum + i.gross, 0);
  const monthCash = monthRow?.cashCollected || 0;
  const monthPending = monthRow?.pending ?? monthInvoices.reduce((sum, i) => sum + i.pending, 0);
  const unpaidInvoices = (finance?.invoices || []).filter((i) => i.pending > 1).sort((a, b) => b.pending - a.pending);
  const chartMonths = useMemo(
    () =>
      (finance?.monthly || [])
        .filter((m) => !m.forecast)
        .slice(-8)
        .map((m) => ({
          month: m.month,
          name: m.label.replace(" 2026", "").replace(" 2027", " ’27"),
          billed: m.gross ?? m.net + m.gst,
          cash: m.cashCollected || 0,
          pending: m.pending,
          jobs: m.invoiceCount,
        })),
    [finance],
  );
  const lowStockItems = inventory?.filter((item) => stockPercent(item.availableStock, item.totalStock) < 20) || [];
  const visibleInventory = useMemo(() => {
    const term = inventorySearch.toLowerCase();
    return (inventory || [])
      .filter((item) =>
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.sku || "").toLowerCase().includes(term) ||
        (item.itemCode || "").toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [inventory, inventorySearch]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="This morning at the mill"
        subtitle="Dock work for the mill, and this month’s bills and collections for the owner."
        actionLabel="New hire"
        onNewOrder={() => setShowOrderModal(true)}
      />

      <div className="p-6 space-y-6 flex-1">
        {(inventory?.length || 0) < 20 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">Load the Switch catalogue codes and the clients from the revenue tracker so the mill can type SRS-023 instead of hunting a dropdown.</p>
              <Button onClick={() => bootstrap.mutate()} disabled={bootstrap.isPending}>Load catalogue & clients</Button>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricLink href="/orders" title="Out on hire" value={onHire.length} hint="Open hires to mark dispatched or returned." icon={ClipboardList} />
          <MetricLink href="/orders" title="Leaving today" value={dispatchToday.length} hint="Pick list for the van — codes and quantities below." icon={Truck} />
          <MetricLink href="/financial" title="Still unpaid" value={s ? formatINR(s.stillOwed) : "—"} hint="Owner: who owes rent. Floor: chase these clients." icon={IndianRupee} />
          <MetricLink href="/orders" title="Due back" value={returnsDue.length} hint="Count, inspect, then add breakage on the GST bill." icon={Undo2} />
        </div>

        <div>
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight">This month · {monthTitle(monthKey)}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Jobs billed, cash that came in, and what the market still owes. Tap a number to see the list.</p>
            </div>
            <Link href="/financial" className="text-sm text-primary shrink-0">Full money screen</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setDrill({ title: `Hires in ${monthTitle(monthKey)}`, orders: monthOrders })}
              className="text-left rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Hires this month</p>
                  <p className="text-3xl font-semibold tabular-nums mt-2">{monthOrders.length}</p>
                  <p className="text-xs text-muted-foreground mt-2">{monthRow?.invoiceCount ?? monthInvoices.length} GST bills in {format(parseISO(`${monthKey}-01`), "MMM")}</p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDrill({ title: `Billed in ${monthTitle(monthKey)}`, invoices: monthInvoices })}
              className="text-left rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Bill value this month</p>
                  <p className="text-3xl font-semibold tabular-nums mt-2">{formatINR(monthBilled)}</p>
                  <p className="text-xs text-muted-foreground mt-2">GST invoices raised for events this month</p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
              </div>
            </button>
            <Link href="/books" className="block rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Cash in this month</p>
                  <p className="text-3xl font-semibold tabular-nums mt-2">{formatINR(monthCash)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Collections recorded in Books</p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setDrill({ title: "Still unpaid in the market", invoices: unpaidInvoices })}
              className="text-left rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Still to collect</p>
                  <p className="text-3xl font-semibold tabular-nums mt-2">{s ? formatINR(s.stillOwed) : formatINR(monthPending)}</p>
                  <p className="text-xs text-muted-foreground mt-2">{unpaidInvoices.length} open bills · {formatINR(monthPending)} from this month</p>
                </div>
                <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Leaving today</CardTitle>
              <Link href="/orders"><span className="text-sm text-primary">All orders</span></Link>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dispatchToday.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">Nothing leaving today. Book a hire when a client confirms.</p>
              ) : dispatchToday.map((o) => (
                <Link key={o.id} href="/orders" className="block border rounded-lg p-3 hover:bg-accent/40">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium">{o.customer.company || o.customer.name}</span>
                      <Badge className={getStatusClass(o.status)}>{o.orderNumber}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{o.eventDetails || "Hire"} · van {formatDate(o.startDate)}</p>
                    <ul className="mt-2 space-y-0.5">
                      {(o.items || []).map((row) => (
                        <li key={row.id} className="text-xs font-mono">
                          {catalogueCode(row.item)} · {row.quantity} × {row.item?.name}
                        </li>
                      ))}
                    </ul>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Due back / overdue</CardTitle>
              <Link href="/invoices"><span className="text-sm text-primary">Inspect bills</span></Link>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {returnsDue.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">Nothing waiting at the dock.</p>
              ) : returnsDue.slice(0, 8).map((o) => (
                <Link key={o.id} href="/orders" className="block border rounded-lg p-3 hover:bg-accent/40">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium">{o.customer.company || o.customer.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">due {formatDate(o.endDate)}</span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {(o.items || []).map((row) => (
                        <li key={row.id} className="text-xs font-mono">
                          {catalogueCode(row.item)} · {row.quantity} × {row.item?.name}
                        </li>
                      ))}
                    </ul>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Billed vs cash vs still owed</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Each bar is a month. Click a month to open those GST bills. Figures in ₹ lakhs on the axis.</p>
            </div>
            <Link href="/financial"><Button variant="outline" size="sm">Money</Button></Link>
          </CardHeader>
          <CardContent className="h-72">
            {chartMonths.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">Raise GST bills and this chart fills in.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartMonths}
                  onClick={(state) => {
                    const month = (state?.activePayload?.[0]?.payload as { month?: string } | undefined)?.month;
                    if (!month) return;
                    setDrill({
                      title: `GST bills · ${monthTitle(month)}`,
                      invoices: (finance?.invoices || []).filter((i) => i.month === month),
                    });
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(Number(v) / 100000).toFixed(1)}L`} />
                  <Tooltip
                    formatter={(value) => formatINR(Number(value || 0))}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { name?: string; jobs?: number } | undefined;
                      return row?.jobs != null ? `${row.name} · ${row.jobs} bills` : String(row?.name || "");
                    }}
                  />
                  <Legend />
                  <Bar dataKey="billed" name="Billed" fill="hsl(16 48% 28%)" radius={[4, 4, 0, 0]} cursor="pointer" />
                  <Bar dataKey="cash" name="Cash in" fill="hsl(34 40% 50%)" radius={[4, 4, 0, 0]} cursor="pointer" />
                  <Bar dataKey="pending" name="Still owed" fill="hsl(0 48% 42%)" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This year’s books</p>
              <p className="text-lg font-semibold tabular-nums mt-1">
                Billed {s ? formatINR(s.billedNet) : "—"}
                <span className="text-muted-foreground font-normal"> · </span>
                Cash in {s ? formatINR(s.cashCollected) : "—"}
                <span className="text-muted-foreground font-normal"> · </span>
                Profit {s ? formatINR(s.operatingProfit || 0) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Billed is what events earned. Cash is what hit the bank. Profit is billed minus running costs.</p>
            </div>
            <Link href="/financial">
              <Button>
                Open money screen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Latest orders</CardTitle>
                <Link href="/orders">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-10">
                  <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No orders yet. Book the first hire from here.</p>
                  <Button onClick={() => setShowOrderModal(true)}>New hire</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <Link key={order.id} href="/orders" className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/40 transition-colors">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customer.name} · {order.items.length} items · back {formatDate(order.endDate)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-medium tabular-nums">{formatINR(order.totalAmount)}</p>
                          <Badge className={getStatusClass(order.status)}>{order.status}</Badge>
                        </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Website leads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">New messages from the public contact form show up here.</p>
                ) : (
                  leads.slice(0, 6).map((lead) => (
                    <div key={lead.id} className="rounded-xl border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[lead.company, lead.covers && `${lead.covers} covers`, lead.eventDate && formatDate(lead.eventDate)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Badge className={lead.status === "new" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                          {lead.status}
                        </Badge>
                      </div>
                      {lead.message && <p className="text-xs text-muted-foreground line-clamp-2">{lead.message}</p>}
                      <div className="flex flex-wrap gap-2">
                        {lead.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openWhatsApp(
                                lead.phone,
                                `Hi ${lead.name}, this is Switch Rental Services. We received your enquiry${lead.eventDate ? ` for ${lead.eventDate}` : ""}.`,
                              )
                            }
                          >
                            <MessageCircle className="w-3 h-3 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                        {lead.status === "new" && (
                          <Button size="sm" variant="secondary" onClick={() => markLead.mutate(lead.id)} disabled={markLead.isPending}>
                            Mark contacted
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" onClick={() => setShowOrderModal(true)}>
                  <ClipboardList className="w-4 h-4 mr-2" />
                  New order
                </Button>
                <Link href="/books"><Button variant="outline" className="w-full justify-start">Enter a bill or payment</Button></Link>
                <Link href="/invoices"><Button variant="outline" className="w-full justify-start">Quotations & GST</Button></Link>
                <Link href="/inventory">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" />
                    Stock
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-base font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
                    Low stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lowStockItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.availableStock} of {item.totalStock} available</p>
                      </div>
                      <Badge className={getStockStatus(item).className}>{getStockStatus(item).status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Stock on the floor</CardTitle>
              <Input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search items..."
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {inventoryLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : visibleInventory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No matching inventory items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                      <th className="py-3 pr-4">Item</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Available</th>
                      <th className="py-3 pr-4">Out</th>
                      <th className="py-3 pr-4">Rate / day</th>
                      <th className="py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInventory.map((item) => {
                      const stock = getStockStatus(item);
                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{item.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{item.category}</td>
                          <td className="py-3 pr-4 text-emerald-700 tabular-nums">{item.availableStock}</td>
                          <td className="py-3 pr-4 tabular-nums">{item.outStock}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatINR(item.ratePerDay)}</td>
                          <td className="py-3"><Badge className={stock.className}>{stock.status}</Badge></td>
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

      <SimpleOrderModal open={showOrderModal} onOpenChange={setShowOrderModal} />

      <Dialog open={!!drill} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drill?.title}</DialogTitle>
            <DialogDescription>Open the hire or the GST list to act on a row.</DialogDescription>
          </DialogHeader>
          {drill?.orders && (
            <div className="space-y-2">
              {drill.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No hires in this month yet.</p>
              ) : (
                drill.orders.map((order) => (
                  <Link key={order.id} href="/orders" className="flex justify-between gap-3 border rounded-lg p-3 text-sm hover:bg-accent/40">
                    <span>
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="text-muted-foreground"> · {order.customer.company || order.customer.name}</span>
                    </span>
                    <span className="tabular-nums shrink-0">{formatINR(order.totalAmount)}</span>
                  </Link>
                ))
              )}
              <Link href={`/orders?month=${monthKey}`} className="block text-sm text-primary pt-2">Open all hires for this month</Link>
            </div>
          )}
          {drill?.invoices && (
            <div className="space-y-2">
              {drill.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No GST bills in this view.</p>
              ) : (
                drill.invoices.slice(0, 40).map((inv) => (
                  <Link key={inv.invoiceNo} href="/invoices" className="flex justify-between gap-3 border rounded-lg p-3 text-sm hover:bg-accent/40">
                    <span>
                      <span className="font-medium">{inv.invoiceNo}</span>
                      <span className="text-muted-foreground"> · {inv.client}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block tabular-nums">{formatINR(inv.gross)}</span>
                      {inv.pending > 1 && (
                        <span className="block text-xs text-amber-800">due {formatINR(inv.pending)}</span>
                      )}
                    </span>
                  </Link>
                ))
              )}
              <Link href="/invoices" className="block text-sm text-primary pt-2">Open invoices</Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
