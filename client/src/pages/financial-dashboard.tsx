import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Header } from "@/components/layout/header";
import { formatINR } from "@/lib/format";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Truck, CalendarCheck, Undo2, Search, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type Invoice = {
  month: string;
  monthLabel: string;
  client: string;
  invoiceNo: string;
  eventDate: string;
  rent: number;
  packing: number;
  transport: number;
  discount: number;
  breakage: number;
  net: number;
  gst: number;
  gross: number;
  deposit: number;
  collected: number;
  pending: number;
  status: string;
  ageDays?: number;
};

type MonthRow = {
  month: string;
  label: string;
  forecast?: boolean;
  invoiceCount: number;
  rent: number;
  packing: number;
  transport: number;
  discount: number;
  breakage: number;
  net: number;
  gst: number;
  budget: number;
  pending: number;
  depositsHeld?: number;
  cashCollected?: number;
  openCount?: number;
  collectedCount?: number;
  breakageRate?: number;
  totalOpex: number;
  ebitda: number;
  fixedCost?: number;
  opsCost?: number;
};

type FinanceData = {
  story: {
    billedNet: number;
    gstPassThrough: number;
    depositsNotRevenue: number;
    depositsCollected?: number;
    depositsRefunded?: number;
    cashCollected: number;
    tdsWithheld?: number;
    stillOwed: number;
    breakage: number;
    rent: number;
    breakageOfRent: number;
    openJobs: number;
    collectedJobs: number;
    collectionRate: number;
    operatingProfit?: number;
    operatingExpenses?: number;
    contribution?: number;
    opexRatio?: number;
    dsoDays?: number;
  };
  invoices: Invoice[];
  monthly: MonthRow[];
  cash: Record<string, { bank: number }>;
  pendingByClient: { client: string; pending: number }[];
  opexMix?: { fixed: number; ops: number; admin: number; nonctrl: number; capex: number };
  opexBreakdown?: { group: string; category: string; amount: number }[];
  ageing?: { d0_30: number; d31_60: number; d61_90: number; d90: number };
  partners?: { name: string; share: number; role: string; invested?: number }[];
  capex?: { totalInvested: number; stockPurchases: number; remainingCapital: number };
};

function lakhs(n: number) {
  return `₹${(n / 100000).toFixed(2)}L`;
}

function inAgeBucket(days: number, key: string) {
  if (key === "d0_30") return days <= 30;
  if (key === "d31_60") return days > 30 && days <= 60;
  if (key === "d61_90") return days > 60 && days <= 90;
  return days > 90;
}

const AGE_LABEL: Record<string, string> = {
  d0_30: "Unpaid 0–30 days",
  d31_60: "Unpaid 31–60 days",
  d61_90: "Unpaid 61–90 days",
  d90: "Unpaid over 90 days",
};

const OPEX_LABEL: Record<string, string> = {
  fixed: "Fixed costs",
  ops: "Day-to-day ops",
  admin: "Admin",
  nonctrl: "Bank / AMC / other",
};

export default function FinancialDashboard() {
  const { data, isLoading } = useQuery<FinanceData>({ queryKey: ["/api/finance"] });
  const [tab, setTab] = useState("money");
  const [opexGroup, setOpexGroup] = useState<string | null>(null);
  const [ageKey, setAgeKey] = useState<string | null>(null);

  const actual = useMemo(() => (data?.monthly || []).filter((m) => !m.forecast), [data]);

  const mix = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Hire (rent)", value: data.story.rent, fill: "hsl(16 48% 28%)" },
      { name: "Packing / transport", value: actual.reduce((s, m) => s + m.packing + m.transport, 0), fill: "hsl(34 40% 50%)" },
      { name: "Breakage (damage)", value: data.story.breakage, fill: "hsl(0 48% 42%)" },
    ].filter((d) => d.value > 0);
  }, [data, actual]);

  const openInvoices = useMemo(() => {
    const rows = (data?.invoices || []).filter((i) => i.status === "open" || i.status === "partial");
    return [...rows].sort((a, b) => b.pending - a.pending);
  }, [data]);

  const maxPending = Math.max(...(data?.pendingByClient.map((p) => p.pending) || [1]), 1);

  const ageInvoices = useMemo(() => {
    if (!ageKey || !data) return [];
    return data.invoices
      .filter((i) => i.pending > 1 && inAgeBucket(i.ageDays || 0, ageKey))
      .sort((a, b) => b.pending - a.pending);
  }, [ageKey, data]);

  const opexLines = useMemo(() => {
    if (!opexGroup || !data?.opexBreakdown) return [];
    return data.opexBreakdown.filter((row) => row.group === opexGroup);
  }, [opexGroup, data]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Money" subtitle="Loading the books…" />
      </div>
    );
  }

  const s = data.story;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Money"
        subtitle="Four numbers that matter: what you billed, what came in, what is still out, and what is left after costs."
      />

      <div className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Type bills and payments in{" "}
          <Link href="/books" className="underline text-foreground font-medium">Books</Link>
          . Costs from the old Excel live in{" "}
          <Link href="/workbook" className="underline text-foreground font-medium">Workbook</Link>
          . This page only reads them.
          {s.dsoDays ? ` On average, clients take about ${Math.round(s.dsoDays)} days to pay.` : null}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/orders", icon: Truck, title: "1. Dispatch", body: "Van leaves. Not a sale yet." },
            { href: "/books", icon: CalendarCheck, title: "2. On hire", body: "Event days = billed rent." },
            { href: "/orders", icon: Undo2, title: "3. Return", body: "Back next day, 11am–2pm." },
            { href: "/invoices", icon: Search, title: "4. Inspect", body: "Charge breakage. Return deposit." },
          ].map((step) => (
            <Link key={step.title} href={step.href} className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors text-left">
              <step.icon className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
              <p className="text-xs text-primary mt-3 flex items-center gap-1">
                Open <ChevronRight className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="money">This year</TabsTrigger>
            <TabsTrigger value="collect">Who owes us</TabsTrigger>
            <TabsTrigger value="spend">Running costs</TabsTrigger>
            <TabsTrigger value="charts">Month by month</TabsTrigger>
          </TabsList>

          <TabsContent value="money" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <button type="button" className="text-left" onClick={() => setTab("charts")}>
                <Card className="border-primary/20 h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Billed (sales)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums">{lakhs(s.billedNet)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      What events earned, before GST. GST is tax, not profit. Click to see months.
                    </p>
                  </CardContent>
                </Card>
              </button>
              <Link href="/books">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cash in</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums text-emerald-800">{lakhs(s.cashCollected)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Money that actually landed. {(s.collectionRate * 100).toFixed(0)}% of bills are paid. Click to record a payment.
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <button type="button" className="text-left" onClick={() => setTab("collect")}>
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Still unpaid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums text-amber-800">{lakhs(s.stillOwed)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {s.openJobs} bills open · {s.collectedJobs} paid. Click to see who.
                    </p>
                  </CardContent>
                </Card>
              </button>
              <button type="button" className="text-left" onClick={() => setTab("spend")}>
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profit after costs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-semibold tabular-nums ${(s.operatingProfit || 0) >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      {lakhs(s.operatingProfit || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Billed minus rent, salary and other running costs ({formatINR(s.operatingExpenses || 0)}). Click to split costs.
                    </p>
                  </CardContent>
                </Card>
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              A July event is July billed even if the client pays in September. Security deposits are not sales. New crockery buys are not running costs.
            </p>
          </TabsContent>

          <TabsContent value="collect" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">How long have they not paid?</CardTitle>
                <CardDescription>Click a box to see the clients and invoice numbers. Chase 90+ days first.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {([
                  { key: "d0_30", label: "0–30 days", value: data.ageing?.d0_30 || 0 },
                  { key: "d31_60", label: "31–60 days", value: data.ageing?.d31_60 || 0 },
                  { key: "d61_90", label: "61–90 days", value: data.ageing?.d61_90 || 0 },
                  { key: "d90", label: "Over 90 days", value: data.ageing?.d90 || 0 },
                ] as const).map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setAgeKey(row.key)}
                    className="rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-2xl font-semibold tabular-nums mt-1">{lakhs(row.value)}</p>
                    <p className="text-xs text-primary mt-2">See who</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Biggest unpaid clients</CardTitle>
                <CardDescription>Paying these does not create extra sales — it only brings cash in.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pendingByClient.slice(0, 8).map((row) => (
                  <button
                    key={row.client}
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setAgeKey("d90");
                      setTab("collect");
                    }}
                  >
                    <div className="flex justify-between text-sm mb-1 gap-3">
                      <span className="truncate">{row.client}</span>
                      <span className="font-medium tabular-nums whitespace-nowrap">{formatINR(row.pending)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-700/80 rounded-full" style={{ width: `${Math.min(100, (row.pending / maxPending) * 100)}%` }} />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Open bills</CardTitle>
                <CardDescription>
                  Record payment in{" "}
                  <Link href="/books" className="underline">Books</Link>.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="p-2">When billed</th>
                      <th className="p-2">Invoice</th>
                      <th className="p-2">Client</th>
                      <th className="p-2 text-right">Bill</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-right">Still due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openInvoices.map((row, i) => (
                      <tr key={`${row.invoiceNo}-${i}`} className="border-b">
                        <td className="p-2 whitespace-nowrap">{row.monthLabel}</td>
                        <td className="p-2">{row.invoiceNo || "—"}</td>
                        <td className="p-2">
                          <div className="font-medium">{row.client}</div>
                          <div className="text-xs text-muted-foreground">{row.eventDate}</div>
                        </td>
                        <td className="p-2 text-right tabular-nums">{formatINR(row.gross)}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-800">{row.collected ? formatINR(row.collected) : "—"}</td>
                        <td className="p-2 text-right font-medium tabular-nums text-amber-900">{formatINR(row.pending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Where the money went</CardTitle>
                <CardDescription>
                  Click a row for rent vs salary vs the rest. Running costs are {((s.opexRatio || 0) * 100).toFixed(0)}% of billed sales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { key: "fixed", label: "Fixed — mill rent, salary, power", value: data.opexMix?.fixed || 0 },
                  { key: "ops", label: "Ops — packing wrap, delivery", value: data.opexMix?.ops || 0 },
                  { key: "admin", label: "Admin — CA, BMC, marketing", value: data.opexMix?.admin || 0 },
                  { key: "nonctrl", label: "Other — bank, AMC, interest", value: data.opexMix?.nonctrl || 0 },
                ].map((row) => {
                  const peak = Math.max(s.operatingExpenses || 1, 1);
                  return (
                    <button key={row.key} type="button" className="w-full text-left" onClick={() => setOpexGroup(row.key)}>
                      <div className="flex justify-between mb-1">
                        <span>{row.label}</span>
                        <span className="tabular-nums font-medium">{formatINR(row.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary/80 rounded-full" style={{ width: `${Math.min(100, (row.value / peak) * 100)}%` }} />
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Partner money vs crockery buys</CardTitle>
                <CardDescription>Capital in is not profit. Stock purchases are tagged as capex in Books.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {(data.partners || []).map((p) => (
                  <p key={p.name}>
                    {p.name} ({(p.share * 100).toFixed(0)}%) · put in {formatINR(p.invested || 0)}
                  </p>
                ))}
                <p>Total in {formatINR(data.capex?.totalInvested || 0)}</p>
                <p>Crockery bought {formatINR(data.capex?.stockPurchases || 0)}</p>
                <p className="font-medium">Still unspent {formatINR(data.capex?.remainingCapital || 0)}</p>
                <p className="text-xs text-muted-foreground">Opening stock plus this year’s CCG. Civil / legal mill setup stays on the Workbook CapEx tab.</p>
                <Link href="/workbook"><Button variant="outline" size="sm" className="mt-2">Open workbook (cost centres)</Button></Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Each month: billed vs cash vs unpaid</CardTitle>
                <CardDescription>
                  Brown = billed that month. Green = cash that arrived that month. Amber = still unpaid on those bills.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 h-64 pt-2">
                  {actual.map((m) => {
                    const peak = Math.max(...actual.map((x) => Math.max(x.net, x.cashCollected || 0, x.pending, 1)));
                    return (
                      <div key={m.month} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full">
                        <div className="flex-1 w-full flex items-end justify-center gap-1">
                          <div className="w-[28%] rounded-t bg-primary" style={{ height: `${(m.net / peak) * 100}%` }} title={`Billed ${formatINR(m.net)}`} />
                          <div className="w-[28%] rounded-t bg-emerald-800" style={{ height: `${((m.cashCollected || 0) / peak) * 100}%` }} title={`Cash ${formatINR(m.cashCollected || 0)}`} />
                          <div className="w-[28%] rounded-t bg-amber-600" style={{ height: `${(m.pending / peak) * 100}%` }} title={`Unpaid ${formatINR(m.pending)}`} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{m.label.replace(" 2026", "").replace(" 2027", "")}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Billed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-800 inline-block" /> Cash in</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" /> Unpaid</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">What billed sales are made of</CardTitle>
                  <CardDescription>
                    Breakage is billed when crates come back. It is {(s.breakageOfRent * 100).toFixed(1)}% of hire this year.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={mix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                        {mix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Bank vs profit that month</CardTitle>
                  <CardDescription>A strong billed month can still leave the ICICI account thin if clients pay late.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4 h-52">
                    {actual.map((m) => {
                      const peak = Math.max(...actual.map((x) => Math.max(Math.abs(x.ebitda), data.cash[x.month]?.bank || 0, 1)));
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full">
                          <div className="flex-1 w-full flex items-end justify-center gap-1">
                            <div className={`w-[36%] rounded-t ${m.ebitda >= 0 ? "bg-primary" : "bg-red-800"}`} style={{ height: `${(Math.abs(m.ebitda) / peak) * 100}%` }} />
                            <div className="w-[36%] rounded-t bg-emerald-800" style={{ height: `${((data.cash[m.month]?.bank || 0) / peak) * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground">{m.label.replace(" 2026", "")}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                    <span>Brown / red — profit that month</span>
                    <span>Green — bank at month end</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {actual.map((m) => (
                <Card key={m.month}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{m.label}</CardTitle>
                    <CardDescription>
                      {m.invoiceCount} events · {m.collectedCount} paid · {m.openCount} still open
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>
                      Billed {formatINR(m.net)} vs target {formatINR(m.budget)}. Cash that month {formatINR(m.cashCollected || 0)}. Unpaid {formatINR(m.pending)}.
                    </p>
                    {m.depositsHeld ? <p>Deposits on bills {formatINR(m.depositsHeld)} — not sales.</p> : null}
                    {m.breakage > 0 ? <p>Damage billed {formatINR(m.breakage)} ({((m.breakageRate || 0) * 100).toFixed(1)}% of hire).</p> : null}
                    <p>Running costs {formatINR(m.totalOpex)}.</p>
                    <p className={m.ebitda >= 0 ? "text-emerald-800" : "text-red-800"}>
                      Profit that month {formatINR(m.ebitda)}.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!opexGroup} onOpenChange={(open) => !open && setOpexGroup(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{opexGroup ? OPEX_LABEL[opexGroup] : "Costs"}</DialogTitle>
            <DialogDescription>Each line is what was entered in Books. Change it there if a split is wrong.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {opexLines.length === 0 ? (
              <p className="text-muted-foreground">No lines in this group yet.</p>
            ) : (
              opexLines.map((row) => (
                <div key={row.category} className="flex justify-between border-b py-2">
                  <span>{row.category}</span>
                  <span className="tabular-nums font-medium">{formatINR(row.amount)}</span>
                </div>
              ))
            )}
            <p className="font-medium pt-2 tabular-nums">
              Total {formatINR(opexLines.reduce((sum, row) => sum + row.amount, 0))}
            </p>
            <Link href="/books"><Button className="w-full mt-2">Add a cost in Books</Button></Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ageKey} onOpenChange={(open) => !open && setAgeKey(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ageKey ? AGE_LABEL[ageKey] : "Unpaid"}</DialogTitle>
            <DialogDescription>Collect these in Books. Age is counted from the hire start date.</DialogDescription>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="p-2">Invoice</th>
                <th className="p-2">Client</th>
                <th className="p-2">Event</th>
                <th className="p-2 text-right">Days</th>
                <th className="p-2 text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {ageInvoices.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-muted-foreground">Nothing in this bucket.</td></tr>
              ) : (
                ageInvoices.map((row) => (
                  <tr key={`${row.invoiceNo}-${row.client}`} className="border-b">
                    <td className="p-2">{row.invoiceNo || "—"}</td>
                    <td className="p-2 font-medium">{row.client}</td>
                    <td className="p-2 text-muted-foreground">{row.eventDate}</td>
                    <td className="p-2 text-right tabular-nums">{row.ageDays ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{formatINR(row.pending)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Link href="/books"><Button className="w-full">Record a payment</Button></Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
