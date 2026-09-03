import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { Link } from "wouter";
import { COST_GROUPS, EXPENSE_CATEGORIES, WORKBOOK_CENTERS } from "@shared/books";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Expense = {
  id: number;
  spentOn: string;
  costGroup: string;
  category: string;
  description: string;
  amount: string;
  vendor?: string | null;
};

type Finance = {
  story: {
    billedNet: number;
    cashCollected: number;
    stillOwed: number;
    operatingProfit?: number;
    operatingExpenses?: number;
  };
  monthly: { month: string; label: string; net: number; budget: number; totalOpex: number; ebitda: number; cashCollected?: number }[];
  cash: Record<string, { bank: number }>;
  capex?: { totalInvested: number; stockPurchases: number; remainingCapital: number };
  partners?: { name: string; invested?: number; share: number }[];
};

type Workbook = {
  source: string;
  sheets: { id: string; excelName: string; label: string; grid: (string | number | null)[][] }[];
  capexVendors: { vendor: string; amount: number }[];
  capitalDraws?: { amount: number; notes: string; occurredOn: string }[];
};

function amt(row: Expense) {
  return Number(row.amount) || 0;
}

function matchCenter(row: Expense, center: (typeof WORKBOOK_CENTERS)[number]) {
  if (row.category === center.category) return true;
  return (row.description || "").toLowerCase().includes(center.id.replace("-", " "));
}

export default function WorkbookPage() {
  const { toast } = useToast();
  const { data: book, isLoading: bookLoading } = useQuery<Workbook>({ queryKey: ["/api/workbook"] });
  const { data: finance } = useQuery<Finance>({ queryKey: ["/api/finance"] });
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const [tab, setTab] = useState("story");
  const [openCenter, setOpenCenter] = useState<string | null>(null);
  const [add, setAdd] = useState({
    spentOn: "",
    costGroup: "fixed",
    category: EXPENSE_CATEGORIES.fixed[0],
    description: "",
    vendor: "",
    amount: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/expenses", {
        spentOn: add.spentOn,
        costGroup: add.costGroup,
        category: add.category,
        description: add.description || add.category,
        vendor: add.vendor || undefined,
        amount: add.amount,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      toast({ title: "Posted to the mill", description: "This line is now in Money. It is not sitting only on a spreadsheet tab." });
      setAdd({ ...add, amount: "", description: "", vendor: "" });
    },
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  const byCenter = useMemo(() => {
    return WORKBOOK_CENTERS.map((center) => {
      const lines = expenses.filter((e) => matchCenter(e, center));
      const total = lines.reduce((s, e) => s + amt(e), 0);
      return { ...center, lines, total };
    });
  }, [expenses]);

  const cats = EXPENSE_CATEGORIES[add.costGroup] || [];

  if (bookLoading || !book || !finance) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Workbook" subtitle="Turning the Excel tracker into live mill books…" />
      </div>
    );
  }

  const s = finance.story;
  const profit = s.operatingProfit || 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Workbook"
        subtitle="The Forecast P&L spreadsheet, running as mill books — not a photocopy of Excel."
      />
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Samir’s Excel was how the mill was managed: one tab per cost, a P&amp;L, cash, capex. Those tabs are now
          cost centres. Hire billed on invoices feeds sales. Costs typed here (or in{" "}
          <Link href="/books" className="underline text-foreground font-medium">
            Books
          </Link>
          ) hit{" "}
          <Link href="/financial" className="underline text-foreground font-medium">
            Money
          </Link>
          . New crockery is capex, not profit. Opening stock is on{" "}
          <Link href="/stock-value" className="underline text-foreground font-medium">
            Stock value
          </Link>
          .
        </p>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Billed hire (live invoices)</CardDescription>
              <CardTitle className="tabular-nums text-2xl">{formatINR(s.billedNet)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">GST bills in the mill. Not the Excel forecast row.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Running costs (from Excel tabs)</CardDescription>
              <CardTitle className="tabular-nums text-2xl">{formatINR(s.operatingExpenses || 0)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Rent, salary, CA, OPS, refunds — posted, not a screenshot.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profit after those costs</CardDescription>
              <CardTitle className={`tabular-nums text-2xl ${profit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                {formatINR(profit)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Same number as Money. Crockery buys are kept out.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Still in the bank vs capital</CardDescription>
              <CardTitle className="tabular-nums text-2xl">{formatINR(finance.capex?.remainingCapital || 0)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Partner money in {formatINR(finance.capex?.totalInvested || 0)} minus crockery {formatINR(finance.capex?.stockPurchases || 0)}.
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="story">What replaced Excel</TabsTrigger>
            <TabsTrigger value="costs">Cost centres</TabsTrigger>
            <TabsTrigger value="capex">Crockery &amp; capital</TabsTrigger>
            <TabsTrigger value="cash">Cash</TabsTrigger>
            <TabsTrigger value="pnl">Month vs budget</TabsTrigger>
            <TabsTrigger value="add">Add a line</TabsTrigger>
            <TabsTrigger value="excel">Excel original</TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="mt-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Where each spreadsheet tab went</CardTitle>
                <CardDescription>
                  He does not need sixteen tabs to run the mill. He needs to know what a rupee is: hire, cost, stock, or partner money.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3">Excel tab</th>
                      <th className="py-2 pr-3">In the mill</th>
                      <th className="py-2 pr-3">What it means</th>
                      <th className="py-2 text-right">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCenter.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 align-top">
                        <td className="py-2.5 pr-3 font-medium whitespace-nowrap">{c.excel}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{c.livesOn}</td>
                        <td className="py-2.5 pr-3">{c.meaning}</td>
                        <td className="py-2.5 text-right tabular-nums font-medium">{formatINR(c.total)}</td>
                      </tr>
                    ))}
                    <tr className="align-top">
                      <td className="py-2.5 pr-3 font-medium">P&amp;L</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">Money → This year / month by month</td>
                      <td className="py-2.5 pr-3">
                        Live billed hire vs costs. Excel still has later-month forecasts; those are the budget, not bills we invented.
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{formatINR(s.billedNet)}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-2.5 pr-3 font-medium">Cash flow</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">Money + Books → Month-end bank</td>
                      <td className="py-2.5 pr-3">ICICI closing balance by month. Profit and bank cash are not the same.</td>
                      <td className="py-2.5 text-right">—</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-2.5 pr-3 font-medium">Refund to Samir</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">Books → Partner capital (draw)</td>
                      <td className="py-2.5 pr-3">Paying him back for Amazon on his card. Not a sale. Not a second crockery bill.</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {formatINR((book.capitalDraws || []).reduce((s, d) => s + d.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-4 grid md:grid-cols-2 gap-3">
            {byCenter
              .filter((c) => c.group !== "capex")
              .map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{c.label}</CardTitle>
                        <CardDescription>Was Excel “{c.excel}”</CardDescription>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">{formatINR(c.total)}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{c.meaning}</p>
                    <p className="text-xs text-muted-foreground">{c.livesOn}</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {c.lines.length === 0 ? (
                        <p className="text-muted-foreground">Nothing posted yet. Add the next bill on Add a line.</p>
                      ) : (
                        c.lines
                          .slice()
                          .sort((a, b) => String(b.spentOn).localeCompare(String(a.spentOn)))
                          .slice(0, 8)
                          .map((line) => (
                            <div key={line.id} className="flex justify-between gap-2 border-b py-1">
                              <span className="truncate">
                                {line.spentOn} · {line.vendor || line.description}
                              </span>
                              <span className="tabular-nums">{formatINR(line.amount)}</span>
                            </div>
                          ))
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdd({
                          ...add,
                          costGroup: c.group,
                          category: c.category,
                          description: c.label,
                        });
                        setTab("add");
                        setOpenCenter(c.id);
                      }}
                    >
                      Add to {c.label}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="capex" className="mt-4 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              {(finance.partners || []).map((p) => (
                <Card key={p.name}>
                  <CardHeader className="pb-2">
                    <CardDescription>{p.name} ({Math.round(p.share * 100)}%)</CardDescription>
                    <CardTitle className="tabular-nums">{formatINR(p.invested || 0)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Capital in. Not hire. Not profit.</CardContent>
                </Card>
              ))}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Still unspent after crockery</CardDescription>
                  <CardTitle className="tabular-nums">{formatINR(finance.capex?.remainingCapital || 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  <Link href="/stock-value" className="underline">
                    Stock value
                  </Link>{" "}
                  shows what plates on the shelf are still worth.
                </CardContent>
              </Card>
            </div>
            {byCenter
              .filter((c) => c.group === "capex")
              .map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle>{c.label}</CardTitle>
                    <CardDescription>
                      {c.meaning} Total {formatINR(c.total)}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {c.id === "capex" &&
                      book.capexVendors.map((v) => (
                        <div key={v.vendor} className="flex justify-between border-b py-1">
                          <span>{v.vendor}</span>
                          <span className="tabular-nums">{formatINR(v.amount)}</span>
                        </div>
                      ))}
                    {c.lines.map((line) => (
                      <div key={line.id} className="flex justify-between border-b py-1">
                        <span>
                          {line.spentOn} · {line.vendor || line.description}
                        </span>
                        <span className="tabular-nums">{formatINR(line.amount)}</span>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="outline"
                      onClick={() => {
                        setAdd({ ...add, costGroup: "capex", category: c.category, description: c.label });
                        setTab("add");
                      }}
                    >
                      Record a crockery buy
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="cash" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>ICICI at month end</CardTitle>
                <CardDescription>
                  From the Cash flow tab, then kept in Books. A profitable month can still leave the account thin if clients pay late.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(finance.cash || {}).length === 0 ? (
                  <p className="text-muted-foreground">No month-end bank yet. Enter it in Books.</p>
                ) : (
                  Object.entries(finance.cash)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, row]) => (
                      <div key={month} className="flex justify-between border-b py-2">
                        <span>{month}</span>
                        <span className="tabular-nums font-medium">{formatINR(row.bank)}</span>
                      </div>
                    ))
                )}
                <Link href="/books">
                  <Button variant="outline" size="sm" className="mt-2">
                    Update month-end bank in Books
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pnl" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Live month vs Excel budget</CardTitle>
                <CardDescription>
                  Billed is GST invoices. Budget is the ₹70L year target split the way the P&amp;L tab splits season. Costs are the cost-centre lines.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3">Month</th>
                      <th className="py-2 pr-3 text-right">Billed</th>
                      <th className="py-2 pr-3 text-right">Excel budget</th>
                      <th className="py-2 pr-3 text-right">Running costs</th>
                      <th className="py-2 pr-3 text-right">Profit</th>
                      <th className="py-2 text-right">Cash in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.monthly.map((m) => (
                      <tr key={m.month} className="border-b last:border-0">
                        <td className="py-2 pr-3">{m.label}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatINR(m.net)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{formatINR(m.budget)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatINR(m.totalOpex)}</td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${m.ebitda >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                          {formatINR(m.ebitda)}
                        </td>
                        <td className="py-2 text-right tabular-nums">{formatINR(m.cashCollected || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Add the next rupee the way Excel used a tab</CardTitle>
                <CardDescription>
                  Pick the same head he used in the spreadsheet. It posts to Books and immediately changes Money.
                  {openCenter ? ` Prefill: ${WORKBOOK_CENTERS.find((c) => c.id === openCenter)?.label}.` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Date paid</Label>
                  <Input type="date" value={add.spentOn} onChange={(e) => setAdd({ ...add, spentOn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={add.costGroup}
                    onValueChange={(v) => setAdd({ ...add, costGroup: v, category: EXPENSE_CATEGORIES[v]?.[0] || "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_GROUPS.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Excel-style head</Label>
                  <Select value={add.category} onValueChange={(v) => setAdd({ ...add, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cats.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>What / who</Label>
                  <Input value={add.description} onChange={(e) => setAdd({ ...add, description: e.target.value })} placeholder="e.g. Omkar traders — packing wrap" />
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input value={add.vendor} onChange={(e) => setAdd({ ...add, vendor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={add.amount} onChange={(e) => setAdd({ ...add, amount: e.target.value })} />
                </div>
                <Button disabled={!add.spentOn || !add.amount || save.isPending} onClick={() => save.mutate()}>
                  Post to Money
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excel" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Original spreadsheet</CardTitle>
                <CardDescription>
                  {book.source} — only for checking a number against the file he sent. Day-to-day work is the other tabs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {book.sheets.map((sheet) => (
                  <details key={sheet.id} className="rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">{sheet.label}</summary>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full min-w-[640px] text-xs">
                        <tbody>
                          {sheet.grid.map((row, ri) => (
                            <tr key={ri} className="border-b last:border-0">
                              {row.map((cell, ci) => (
                                <td key={ci} className={`py-1 pr-2 ${typeof cell === "number" ? "text-right tabular-nums" : ""}`}>
                                  {cell == null
                                    ? ""
                                    : typeof cell === "number"
                                      ? cell.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                                      : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
