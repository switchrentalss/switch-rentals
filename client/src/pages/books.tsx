import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatINR } from "@/lib/format";
import { billing } from "@/lib/billing";
import { sendInvoiceAndToast } from "@/utils/pdf-generator";
import { COST_GROUPS, EXPENSE_CATEGORIES, PAYMENT_METHODS, CAPITAL_KINDS, PARTNERS, PAYMENT_KINDS } from "@shared/books";
import { Link } from "wouter";
import type { Customer, InvoiceWithCustomer } from "@shared/schema";

function invalidateBooks() {
  queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
  queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
  queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
  queryClient.invalidateQueries({ queryKey: ["/api/finance-settings"] });
  queryClient.invalidateQueries({ queryKey: ["/api/capital-entries"] });
}

export default function Books() {
  const { toast } = useToast();
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: allInvoices = [] } = useQuery<InvoiceWithCustomer[]>({ queryKey: ["/api/invoices"] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/payments"] });
  const { data: expenseRows = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"] });
  const { data: cashRows = [] } = useQuery<any[]>({ queryKey: ["/api/cash-positions"] });
  const { data: settings } = useQuery<any>({ queryKey: ["/api/finance-settings"] });
  const { data: capitalRows = [] } = useQuery<any[]>({ queryKey: ["/api/capital-entries"] });

  const [bill, setBill] = useState({
    customerId: "",
    invoiceNumber: "",
    dispatchDate: "",
    startDate: "",
    endDate: "",
    returnDate: "",
    eventDetails: "",
    rentAmount: "",
    packingAmount: "",
    transportAmount: "",
    mistAmount: "",
    discountAmount: "",
    breakageAmount: "",
    depositAmount: "",
  });
  const rent = Number(bill.rentAmount || 0);
  const packing = bill.packingAmount === "" ? Math.round(rent * billing.packingRate * 100) / 100 : Number(bill.packingAmount || 0);
  const net =
    rent +
    packing +
    Number(bill.transportAmount || 0) +
    Number(bill.mistAmount || 0) -
    Number(bill.discountAmount || 0) +
    Number(bill.breakageAmount || 0);
  const gst = Math.round(net * 0.18 * 100) / 100;

  const [pay, setPay] = useState({ invoiceId: "", amount: "", paidOn: "", method: "bank", kind: "invoice", notes: "" });
  const [exp, setExp] = useState({
    spentOn: "",
    costGroup: "fixed",
    category: EXPENSE_CATEGORIES.fixed[0],
    description: "",
    amount: "",
    vendor: "",
  });
  const [cash, setCash] = useState({ asOf: "", bankAmount: "", cashAmount: "0", notes: "" });
  const [capital, setCapital] = useState({ partner: "samir", kind: "contribution", amount: "", occurredOn: "", notes: "" });
  const [budget, setBudget] = useState({ annualBudgetNet: "", samirShare: "0.74", karanShare: "0.26" });

  const saveBill = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rental-bills", {
        ...bill,
        customerId: Number(bill.customerId),
        packingAmount: packing,
        rentAmount: rent,
      });
      return res.json();
    },
    onSuccess: async (invoice) => {
      invalidateBooks();
      toast({ title: "Hire bill saved", description: "Opening the tax invoice on WhatsApp for the purchaser." });
      if (invoice?.invoiceNumber) {
        await sendInvoiceAndToast(invoice, toast);
      }
    },
    onError: () => toast({ title: "Could not save bill", variant: "destructive" }),
  });

  const savePay = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments", {
        invoiceId: Number(pay.invoiceId),
        amount: pay.amount,
        paidOn: pay.paidOn,
        method: pay.method,
        kind: pay.kind,
        notes: pay.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateBooks();
      toast({ title: "Payment recorded", description: "Cash is counted on the date received, not the event month." });
    },
    onError: () => toast({ title: "Could not save payment", variant: "destructive" }),
  });

  const saveExp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/expenses", {
        ...exp,
        amount: exp.amount,
        vendor: exp.vendor || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateBooks();
      toast({ title: "Expense recorded", description: "This hits operating profit in that month." });
    },
    onError: () => toast({ title: "Could not save expense", variant: "destructive" }),
  });

  const saveCash = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cash-positions", cash);
      return res.json();
    },
    onSuccess: () => {
      invalidateBooks();
      toast({ title: "Bank balance saved" });
    },
    onError: () => toast({ title: "Could not save cash position", variant: "destructive" }),
  });

  const saveCapital = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/capital-entries", capital);
      return res.json();
    },
    onSuccess: () => {
      invalidateBooks();
      toast({ title: "Capital entry saved" });
    },
    onError: () => toast({ title: "Could not save capital", variant: "destructive" }),
  });

  const saveBudget = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/finance-settings", {
        annualBudgetNet: budget.annualBudgetNet || settings?.annualBudgetNet,
        samirShare: budget.samirShare,
        karanShare: budget.karanShare,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateBooks();
      toast({ title: "Budget and partner shares saved" });
    },
    onError: () => toast({ title: "Could not save settings", variant: "destructive" }),
  });

  const categories = EXPENSE_CATEGORIES[exp.costGroup] || [];
  const paidByInvoice = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of payments) {
      map.set(p.invoiceId, (map.get(p.invoiceId) || 0) + Number(p.amount || 0));
    }
    return map;
  }, [payments]);
  const hireBills = useMemo(
    () =>
      allInvoices.filter(
        (i) =>
          (i.invoiceType === "gst_invoice" || i.invoiceType === "final_invoice") &&
          i.notes !== "demo",
      ),
    [allInvoices],
  );
  const openBills = useMemo(
    () =>
      hireBills.filter((i) => {
        const remaining = Number(i.totalAmount) - (paidByInvoice.get(i.id) || 0);
        return remaining > 1;
      }),
    [hireBills, paidByInvoice],
  );
  const paymentBills = pay.kind === "invoice" ? openBills : hireBills;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Books"
        subtitle="This replaces the Excel tracker. Enter hire bills, collections, running costs, and month-end bank here — the Financial Dashboard reads only these records."
      />
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          After you save, open the <Link href="/financial"><span className="underline">Financial Dashboard</span></Link> to see operating profit.
          Deposits stay off revenue. GST is billed but is not margin.
        </p>
        <Tabs defaultValue="bill">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="bill">1. Hire bill</TabsTrigger>
            <TabsTrigger value="pay">2. Client payment</TabsTrigger>
            <TabsTrigger value="deposit">2b. Deposit</TabsTrigger>
            <TabsTrigger value="exp">3. Operating expense</TabsTrigger>
            <TabsTrigger value="bank">4. Month-end bank</TabsTrigger>
            <TabsTrigger value="capital">5. Partner capital</TabsTrigger>
            <TabsTrigger value="budget">6. FY budget</TabsTrigger>
          </TabsList>

          <TabsContent value="bill" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Raise a hire invoice</CardTitle>
                <CardDescription>
                  Dispatch is when stock leaves. Hire start/end is when you earn rent. Return is inspection — enter breakage then, not on dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Client</Label>
                  <Select value={bill.customerId} onValueChange={(v) => setBill({ ...bill, customerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.company || c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Their invoice no. (optional)" value={bill.invoiceNumber} onChange={(v) => setBill({ ...bill, invoiceNumber: v })} />
                <Field label="Event / notes" value={bill.eventDetails} onChange={(v) => setBill({ ...bill, eventDetails: v })} />
                <Field type="date" label="Dispatch" value={bill.dispatchDate} onChange={(v) => setBill({ ...bill, dispatchDate: v })} />
                <Field type="date" label="Hire start (earned from)" value={bill.startDate} onChange={(v) => setBill({ ...bill, startDate: v })} />
                <Field type="date" label="Hire end" value={bill.endDate} onChange={(v) => setBill({ ...bill, endDate: v })} />
                <Field type="date" label="Return / inspect" value={bill.returnDate} onChange={(v) => setBill({ ...bill, returnDate: v })} />
                <Field type="number" label="Hire / rent" value={bill.rentAmount} onChange={(v) => setBill({ ...bill, rentAmount: v })} />
                <Field type="number" label={`Packing (blank = ${billing.packingRate * 100}% of hire)`} value={bill.packingAmount} onChange={(v) => setBill({ ...bill, packingAmount: v })} />
                <Field type="number" label="Transport" value={bill.transportAmount} onChange={(v) => setBill({ ...bill, transportAmount: v })} />
                <Field type="number" label="Miscellaneous / other hire charges" value={bill.mistAmount} onChange={(v) => setBill({ ...bill, mistAmount: v })} />
                <Field type="number" label="Discount" value={bill.discountAmount} onChange={(v) => setBill({ ...bill, discountAmount: v })} />
                <Field type="number" label="Breakage / damage (after return)" value={bill.breakageAmount} onChange={(v) => setBill({ ...bill, breakageAmount: v })} />
                <Field type="number" label="Security deposit (not revenue)" value={bill.depositAmount} onChange={(v) => setBill({ ...bill, depositAmount: v })} />
                <div className="md:col-span-2 rounded-lg bg-muted p-4 text-sm space-y-1">
                  <p>Net earned (ex-GST): <strong>{formatINR(net)}</strong></p>
                  <p>GST 18%: {formatINR(gst)} · Gross: <strong>{formatINR(net + gst)}</strong></p>
                  <p className="text-muted-foreground">Deposit {formatINR(Number(bill.depositAmount || 0))} is held aside and never added to net.</p>
                </div>
                <Button className="md:col-span-2" disabled={!bill.customerId || !bill.startDate || saveBill.isPending} onClick={() => saveBill.mutate()}>
                  Save hire bill
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pay" className="mt-4 grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Record money in</CardTitle>
                <CardDescription>Use the date it landed in the bank or cash box. A July event paid in September is July revenue and September cash.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Invoice</Label>
                <Select value={pay.invoiceId} onValueChange={(v) => setPay({ ...pay, invoiceId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bill" /></SelectTrigger>
                  <SelectContent>
                    {paymentBills.map((i) => {
                      const remaining = Number(i.totalAmount) - (paidByInvoice.get(i.id) || 0);
                      return (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.invoiceNumber} · {i.customer?.name} · due {formatINR(remaining)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Field type="date" label="Received on" value={pay.paidOn} onChange={(v) => setPay({ ...pay, paidOn: v })} />
                <Field type="number" label="Amount (do not include deposit refunds here)" value={pay.amount} onChange={(v) => setPay({ ...pay, amount: v })} />
                <Label>What this money is</Label>
                <Select value={pay.kind} onValueChange={(v) => setPay({ ...pay, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_KINDS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Method</Label>
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!pay.invoiceId || !pay.paidOn || savePay.isPending} onClick={() => savePay.mutate()}>
                  Save payment
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent collections</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm max-h-[420px] overflow-y-auto">
                {payments.slice(0, 20).map((p) => (
                  <div key={p.id} className="flex justify-between border-b py-2">
                    <span>{p.paidOn} · {p.customerName} · {p.kind || "invoice"} · {p.method}</span>
                    <span>{formatINR(p.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Security deposits</CardTitle>
                <CardDescription>
                  Collecting a deposit is cash in the bank, not a sale. Refunding it is cash out, not an expense. Applying it to breakage or unpaid hire clears both the liability and the bill.
                  Use the payment form: pick the invoice, set “What this money is” to deposit / refund / apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {hireBills.filter((i) => Number(i.depositAmount) > 0).slice(0, 30).map((i) => (
                  <div key={i.id} className="flex justify-between border-b py-2 gap-2">
                    <span>{i.invoiceNumber} · {i.customer?.name}</span>
                    <span>Held on bill {formatINR(i.depositAmount)}</span>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setPay({ ...pay, kind: "deposit" })}>
                  Record a deposit movement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exp" className="mt-4 grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Running cost</CardTitle>
                <CardDescription>Salary, Gupta Mills rent, CA, packing wrap, AMC — anything that is not a client bill. Capex (new crockery) is tagged separately and kept out of EBITDA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field type="date" label="Date paid" value={exp.spentOn} onChange={(v) => setExp({ ...exp, spentOn: v })} />
                <Label>Type</Label>
                <Select
                  value={exp.costGroup}
                  onValueChange={(v) => setExp({ ...exp, costGroup: v, category: EXPENSE_CATEGORIES[v]?.[0] || "" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COST_GROUPS.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Category</Label>
                <Select value={exp.category} onValueChange={(v) => setExp({ ...exp, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Field label="What was it" value={exp.description} onChange={(v) => setExp({ ...exp, description: v })} />
                <Field label="Vendor (optional)" value={exp.vendor} onChange={(v) => setExp({ ...exp, vendor: v })} />
                <Field type="number" label="Amount" value={exp.amount} onChange={(v) => setExp({ ...exp, amount: v })} />
                <Button disabled={!exp.spentOn || !exp.amount || saveExp.isPending} onClick={() => saveExp.mutate()}>
                  Save expense
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Latest costs</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm max-h-[420px] overflow-y-auto">
                {expenseRows.slice(0, 24).map((e) => (
                  <div key={e.id} className="flex justify-between border-b py-2 gap-2">
                    <span>{e.spentOn} · {e.category}<br /><span className="text-muted-foreground">{e.description}</span></span>
                    <span>{formatINR(e.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">What is actually in the account</CardTitle>
                <CardDescription>Take this from the ICICI statement on the last day of the month. P&amp;L profit and bank cash are not the same thing.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 max-w-3xl">
                <Field type="date" label="As of" value={cash.asOf} onChange={(v) => setCash({ ...cash, asOf: v })} />
                <Field type="number" label="Bank" value={cash.bankAmount} onChange={(v) => setCash({ ...cash, bankAmount: v })} />
                <Field type="number" label="Petty cash on hand" value={cash.cashAmount} onChange={(v) => setCash({ ...cash, cashAmount: v })} />
                <div className="md:col-span-2">
                  <Label>Note</Label>
                  <Textarea value={cash.notes} onChange={(e) => setCash({ ...cash, notes: e.target.value })} />
                </div>
                <Button disabled={!cash.asOf || !cash.bankAmount || saveCash.isPending} onClick={() => saveCash.mutate()}>
                  Save month-end cash
                </Button>
                <div className="md:col-span-2 text-sm space-y-1">
                  {cashRows.map((r) => (
                    <p key={r.id}>{r.asOf}: bank {formatINR(r.bankAmount)}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capital" className="mt-4 grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Partner money in / out</CardTitle>
                <CardDescription>
                  This is not revenue. It funds crockery purchases (capex) and working capital. Draws reduce what is left in the business.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Partner</Label>
                <Select value={capital.partner} onValueChange={(v) => setCapital({ ...capital, partner: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTNERS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Type</Label>
                <Select value={capital.kind} onValueChange={(v) => setCapital({ ...capital, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPITAL_KINDS.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Field type="date" label="Date" value={capital.occurredOn} onChange={(v) => setCapital({ ...capital, occurredOn: v })} />
                <Field type="number" label="Amount" value={capital.amount} onChange={(v) => setCapital({ ...capital, amount: v })} />
                <Field label="Note" value={capital.notes} onChange={(v) => setCapital({ ...capital, notes: v })} />
                <Button disabled={!capital.occurredOn || !capital.amount || saveCapital.isPending} onClick={() => saveCapital.mutate()}>
                  Save capital entry
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm max-h-[420px] overflow-y-auto">
                {capitalRows.map((row) => (
                  <div key={row.id} className="flex justify-between border-b py-2">
                    <span>{row.occurredOn} · {row.partner} · {row.kind}</span>
                    <span>{formatINR(row.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Year target</CardTitle>
                <CardDescription>
                  Net hire budget for the financial year (ex-GST). Monthly bars on the dashboard split this by wedding season (lean monsoon, peak winter).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 max-w-3xl">
                <Field
                  type="number"
                  label="Annual net budget"
                  value={budget.annualBudgetNet || String(settings?.annualBudgetNet || "")}
                  onChange={(v) => setBudget({ ...budget, annualBudgetNet: v })}
                />
                <Field label="Samir share (0–1)" value={budget.samirShare} onChange={(v) => setBudget({ ...budget, samirShare: v })} />
                <Field label="Karan share (0–1)" value={budget.karanShare} onChange={(v) => setBudget({ ...budget, karanShare: v })} />
                <Button className="md:col-span-2" disabled={saveBudget.isPending} onClick={() => saveBudget.mutate()}>
                  Save budget
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
