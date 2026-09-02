import { db } from "./db";
import { capitalEntries, cashPositions, customers, expenses, financeSettings, invoices, payments } from "@shared/schema";
import { eq, inArray, and, or, isNull, ne } from "drizzle-orm";
import { isInvoicePaymentKind } from "@shared/hire";

const MONTH_LABEL: Record<string, string> = {
  "2026-04": "Apr 2026",
  "2026-05": "May 2026",
  "2026-06": "Jun 2026",
  "2026-07": "Jul 2026",
  "2026-08": "Aug 2026",
  "2026-09": "Sep 2026",
  "2026-10": "Oct 2026",
  "2026-11": "Nov 2026",
  "2026-12": "Dec 2026",
  "2027-01": "Jan 2027",
  "2027-02": "Feb 2027",
  "2027-03": "Mar 2027",
};

const BUDGET_SHARE: Record<string, number> = {
  "2026-04": 0.07,
  "2026-05": 0.07,
  "2026-06": 0.04,
  "2026-07": 0.04,
  "2026-08": 0.04,
  "2026-09": 0.06,
  "2026-10": 0.1,
  "2026-11": 0.12,
  "2026-12": 0.12,
  "2027-01": 0.12,
  "2027-02": 0.12,
  "2027-03": 0.1,
};

const ANNUAL_BUDGET_FALLBACK = 7_000_000;

function n(v: string | number | null | undefined) {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(x) ? x : 0;
}

function monthKey(iso: string | null | undefined) {
  if (!iso) return "";
  return String(iso).slice(0, 7);
}

function hireNet(inv: {
  rentAmount: string | null;
  packingAmount: string | null;
  transportAmount: string | null;
  mistAmount: string | null;
  discountAmount: string | null;
  breakageAmount: string | null;
  subtotal: string;
}) {
  const rent = n(inv.rentAmount);
  const packing = n(inv.packingAmount);
  const transport = n(inv.transportAmount);
  const mist = n(inv.mistAmount);
  const discount = n(inv.discountAmount);
  const breakage = n(inv.breakageAmount);
  const composed = rent + packing + transport + mist - discount + breakage;
  if (Math.abs(composed) > 0.5) return { rent, packing, transport, mist, discount, breakage, net: composed };
  const sub = n(inv.subtotal);
  return { rent: sub, packing: 0, transport: 0, mist: 0, discount: 0, breakage: 0, net: sub };
}

export async function getSwitchFinance() {
  const settingsRows = await db.select().from(financeSettings).limit(1);
  const settings = settingsRows[0];
  const annualBudget = settings ? n(settings.annualBudgetNet) : ANNUAL_BUDGET_FALLBACK;
  const samirShare = settings ? n(settings.samirShare) : 0.74;
  const karanShare = settings ? n(settings.karanShare) : 0.26;
  const samirName = settings?.samirName || "Samir Chhabria";
  const karanName = settings?.karanName || "Karan Khiani";

  const billed = await db
    .select({
      invoice: invoices,
      customerName: customers.name,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        inArray(invoices.invoiceType, ["gst_invoice", "final_invoice"]),
        or(isNull(invoices.notes), ne(invoices.notes, "demo")),
        or(isNull(invoices.status), ne(invoices.status, "void")),
      ),
    );

  const payRows = await db.select().from(payments);
  const expRows = await db.select().from(expenses);
  const cashRows = await db.select().from(cashPositions);
  const capitalRows = await db.select().from(capitalEntries);

  const paidByInvoice = new Map<number, number>();
  const cashByMonth = new Map<string, number>();
  let tdsWithheld = 0;
  let cashInBankMethods = 0;
  let depositCashIn = 0;
  let depositRefunded = 0;
  let depositApplied = 0;
  for (const p of payRows) {
    const amt = n(p.amount);
    const kind = p.kind || "invoice";
    if (isInvoicePaymentKind(kind)) {
      paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) || 0) + amt);
    }
    const mk = monthKey(p.paidOn);
    if (kind === "deposit") depositCashIn += amt;
    if (kind === "refund") depositRefunded += amt;
    if (kind === "apply") depositApplied += amt;
    if (kind === "refund") continue;
    if (kind === "deposit" || kind === "apply") continue;
    if (p.method === "tds") {
      tdsWithheld += amt;
    } else {
      cashByMonth.set(mk, (cashByMonth.get(mk) || 0) + amt);
      cashInBankMethods += amt;
    }
  }

  const invoiceDtos = billed.map(({ invoice, customerName }) => {
    const parts = hireNet(invoice);
    const gst = n(invoice.gstAmount);
    const gross = parts.net + gst;
    const collected = paidByInvoice.get(invoice.id) || 0;
    const deposit = n(invoice.depositAmount);
    const pending = Math.max(0, round2(gross - collected));
    let status = "open";
    if (parts.net < -1) status = "credit";
    else if (pending < 2) status = "collected";
    else if (collected >= 2) status = "partial";
      const billedMonth = monthKey(invoice.startDate) || monthKey(invoice.dispatchDate);
      const asOf = new Date();
      const billedAt = new Date(invoice.startDate || invoice.dispatchDate);
      const ageDays = pending > 1 && !Number.isNaN(billedAt.getTime())
        ? Math.max(0, Math.floor((asOf.getTime() - billedAt.getTime()) / 86400000))
        : 0;
      return {
      id: invoice.id,
      month: billedMonth,
      monthLabel: MONTH_LABEL[billedMonth] || billedMonth,
      client: customerName,
      invoiceNo: invoice.invoiceNumber,
      eventDate: invoice.startDate,
      dispatchDate: invoice.dispatchDate,
      returnDate: invoice.returnDate,
      rent: round2(parts.rent),
      packing: round2(parts.packing),
      transport: round2(parts.transport),
      mist: round2(parts.mist),
      discount: round2(parts.discount),
      breakage: round2(parts.breakage),
      net: round2(parts.net),
      gst: round2(gst),
      gross: round2(gross),
      deposit: round2(deposit),
      collected: round2(collected),
      pending,
      status,
      ageDays,
    };
  });

  const monthSet = new Set(invoiceDtos.map((i) => i.month).filter(Boolean));
  for (const e of expRows) monthSet.add(monthKey(e.spentOn));
  for (const c of cashRows) monthSet.add(monthKey(c.asOf));
  const months = [...monthSet].filter(Boolean).sort();

  const expensesByMonth: Record<string, { fixed: number; ops: number; admin: number; nonctrl: number; capex: number; total: number; lines: { group: string; name: string; amount: number }[] }> = {};
  for (const e of expRows) {
    const mk = monthKey(e.spentOn);
    if (!expensesByMonth[mk]) {
      expensesByMonth[mk] = { fixed: 0, ops: 0, admin: 0, nonctrl: 0, capex: 0, total: 0, lines: [] };
    }
    const bucket = e.costGroup as "fixed" | "ops" | "admin" | "nonctrl" | "capex";
    const amt = n(e.amount);
    if (bucket in expensesByMonth[mk] && bucket !== "total" as never) {
      (expensesByMonth[mk] as any)[bucket] += amt;
    }
    expensesByMonth[mk].lines.push({ group: e.costGroup, name: e.category, amount: amt });
  }
  for (const mk of Object.keys(expensesByMonth)) {
    const b = expensesByMonth[mk];
    b.fixed = round2(b.fixed);
    b.ops = round2(b.ops);
    b.admin = round2(b.admin);
    b.nonctrl = round2(b.nonctrl);
    b.capex = round2(b.capex);
    b.total = round2(b.fixed + b.ops + b.admin + b.nonctrl);
  }

  const monthly = months.map((key) => {
    const subset = invoiceDtos.filter((i) => i.month === key);
    const rent = sum(subset, "rent");
    const packing = sum(subset, "packing");
    const transport = sum(subset, "transport");
    const mist = sum(subset, "mist");
    const discount = sum(subset, "discount");
    const breakage = sum(subset, "breakage");
    const net = rent + packing + transport + mist - discount + breakage;
    const gst = sum(subset, "gst");
    const exp = expensesByMonth[key] || { fixed: 0, ops: 0, admin: 0, nonctrl: 0, capex: 0, total: 0, lines: [] };
    const ebitda = net - exp.total;
    const budget = round2(annualBudget * (BUDGET_SHARE[key] || 0));
    const cashCollected = round2(cashByMonth.get(key) || 0);
    return {
      month: key,
      label: MONTH_LABEL[key] || key,
      invoiceCount: subset.length,
      rent: round2(rent),
      packing: round2(packing),
      transport: round2(transport),
      mist: round2(mist),
      discount: round2(discount),
      breakage: round2(breakage),
      net: round2(net),
      gst: round2(gst),
      gross: round2(net + gst),
      budget,
      vsBudget: round2(net - budget),
      cashCollected,
      collectedSameMonth: cashCollected,
      pending: round2(sum(subset, "pending")),
      depositsHeld: round2(sum(subset, "deposit")),
      openCount: subset.filter((i) => i.status === "open" || i.status === "partial").length,
      collectedCount: subset.filter((i) => i.status === "collected").length,
      collectionRate: net + gst ? round4(cashCollected / (net + gst)) : 0,
      breakageRate: rent ? round4(breakage / rent) : 0,
      fixedCost: exp.fixed,
      opsCost: exp.ops,
      adminCost: exp.admin,
      nonctrlCost: exp.nonctrl,
      totalOpex: exp.total,
      ebitda: round2(ebitda),
      ebitdaMargin: net ? round4(ebitda / net) : 0,
      forecast: false,
    };
  });

  const billedNet = sum(monthly, "net");
  const gstPass = sum(monthly, "gst");
  const stillOwed = sum(monthly, "pending");
  const cashIn = cashInBankMethods;
  const opexMix = {
    fixed: round2(expRows.filter((e) => e.costGroup === "fixed").reduce((s, e) => s + n(e.amount), 0)),
    ops: round2(expRows.filter((e) => e.costGroup === "ops").reduce((s, e) => s + n(e.amount), 0)),
    admin: round2(expRows.filter((e) => e.costGroup === "admin").reduce((s, e) => s + n(e.amount), 0)),
    nonctrl: round2(expRows.filter((e) => e.costGroup === "nonctrl").reduce((s, e) => s + n(e.amount), 0)),
    capex: round2(expRows.filter((e) => e.costGroup === "capex").reduce((s, e) => s + n(e.amount), 0)),
  };
  const opexBreakdown: { group: string; category: string; amount: number }[] = [];
  const catMap = new Map<string, number>();
  for (const e of expRows) {
    if (e.costGroup === "capex") continue;
    const key = `${e.costGroup}||${e.category}`;
    catMap.set(key, (catMap.get(key) || 0) + n(e.amount));
  }
  for (const [key, amount] of Array.from(catMap.entries())) {
    const [group, category] = key.split("||");
    opexBreakdown.push({ group, category, amount: round2(amount) });
  }
  opexBreakdown.sort((a, b) => b.amount - a.amount);
  const opex = opexMix.fixed + opexMix.ops + opexMix.admin + opexMix.nonctrl;
  const ebitda = billedNet - opex;
  const contribution = billedNet - opexMix.ops;
  const days = Math.max(1, months.length * 30);
  const dso = billedNet + gstPass > 0 ? round2((stillOwed / ((billedNet + gstPass) / days)) ) : 0;

  const ageing = { d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
  for (const inv of invoiceDtos) {
    if (inv.pending <= 1) continue;
    if (inv.ageDays <= 30) ageing.d0_30 += inv.pending;
    else if (inv.ageDays <= 60) ageing.d31_60 += inv.pending;
    else if (inv.ageDays <= 90) ageing.d61_90 += inv.pending;
    else ageing.d90 += inv.pending;
  }

  const pendingByClient = new Map<string, number>();
  for (const inv of invoiceDtos) {
    if (inv.pending <= 1) continue;
    pendingByClient.set(inv.client, (pendingByClient.get(inv.client) || 0) + inv.pending);
  }

  const cash: Record<string, { bank: number; cash: number }> = {};
  for (const row of cashRows) {
    cash[monthKey(row.asOf)] = { bank: n(row.bankAmount), cash: n(row.cashAmount) };
  }

  const invested = { samir: 0, karan: 0 };
  for (const row of capitalRows) {
    const signed = row.kind === "draw" ? -n(row.amount) : n(row.amount);
    if (row.partner === "karan") invested.karan += signed;
    else invested.samir += signed;
  }

  return {
    source: "Switch Rentals operations (live books)",
    company: {
      legalName: "Switch Rental Services LLP",
      gstin: "27AFHFS2025K1ZV",
      hsn: "997323",
    },
    budget: { annualNet: annualBudget, shares: BUDGET_SHARE },
    story: {
      billedNet: round2(billedNet),
      gstPassThrough: round2(gstPass),
      depositsNotRevenue: round2(Math.max(0, sum(invoiceDtos, "deposit") - depositRefunded - depositApplied)),
      depositsCollected: round2(depositCashIn),
      depositsRefunded: round2(depositRefunded),
      cashCollected: round2(cashIn),
      tdsWithheld: round2(tdsWithheld),
      stillOwed: round2(stillOwed),
      breakage: round2(sum(invoiceDtos, "breakage")),
      rent: round2(sum(invoiceDtos, "rent")),
      breakageOfRent: sum(invoiceDtos, "rent") ? round4(sum(invoiceDtos, "breakage") / sum(invoiceDtos, "rent")) : 0,
      openJobs: invoiceDtos.filter((i) => i.status === "open" || i.status === "partial").length,
      collectedJobs: invoiceDtos.filter((i) => i.status === "collected").length,
      paidLateJobs: 0,
      collectionRate: billedNet + gstPass ? round4((cashIn + tdsWithheld) / (billedNet + gstPass)) : 0,
      operatingProfit: round2(ebitda),
      operatingExpenses: round2(opex),
      contribution: round2(contribution),
      opexRatio: billedNet ? round4(opex / billedNet) : 0,
      dsoDays: dso,
    },
    opexMix,
    opexBreakdown,
    ageing: {
      d0_30: round2(ageing.d0_30),
      d31_60: round2(ageing.d31_60),
      d61_90: round2(ageing.d61_90),
      d90: round2(ageing.d90),
    },
    invoices: invoiceDtos,
    monthly,
    expensesByMonth,
    cash,
    pendingByClient: [...pendingByClient.entries()]
      .map(([client, pending]) => ({ client, pending: round2(pending) }))
      .sort((a, b) => b.pending - a.pending),
    capex: {
      samirShare,
      karanShare,
      samirInvested: round2(invested.samir),
      karanInvested: round2(invested.karan),
      totalInvested: round2(invested.samir + invested.karan),
      stockPurchases: opexMix.capex,
      remainingCapital: round2(invested.samir + invested.karan - opexMix.capex),
      ccgVendors: expRows
        .filter((e) => e.costGroup === "capex")
        .map((e) => ({ vendor: e.vendor || e.category, amount: n(e.amount), date: e.spentOn })),
    },
    partners: [
      { name: samirName, share: samirShare, role: "Operating partner", invested: round2(invested.samir) },
      { name: karanName, share: karanShare, role: "Partner", invested: round2(invested.karan) },
    ],
  };
}

function sum<T>(rows: T[], key: keyof T) {
  return rows.reduce((s, r) => s + n(r[key] as never), 0);
}
function round2(v: number) {
  return Math.round(v * 100) / 100;
}
function round4(v: number) {
  return Math.round(v * 10000) / 10000;
}
