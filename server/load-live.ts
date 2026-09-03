import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { importWorkbookBooks } from "./import-workbook";
import {
  capitalEntries,
  customers,
  financeSettings,
  inventoryItems,
  invoiceItems,
  invoices,
  payments,
} from "@shared/schema";

function lastDay(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

async function seedLiveBooks(hireItemId: number) {
  const finance = JSON.parse(readFileSync(join(process.cwd(), "server/data/switch-finance.json"), "utf8"));
  const people = await db.select().from(customers);
  const byName = new Map(people.map((c) => [c.name, c.id]));
  const usedNumbers = new Set<string>();
  let i = 0;
  let invoicesAdded = 0;
  let skipped = 0;
  for (const row of finance.invoices as any[]) {
    i += 1;
    const customerId = byName.get(row.client);
    if (!customerId) {
      skipped += 1;
      continue;
    }
    let invoiceNumber = String(row.invoiceNo || "").trim() || `LIVE-${row.month}-${i}`;
    if (usedNumbers.has(invoiceNumber)) invoiceNumber = `${invoiceNumber}-${row.month}`;
    usedNumbers.add(invoiceNumber);
    const startDate = `${row.month}-01`;
    const endDate = lastDay(row.month);
    const [inv] = await db
      .insert(invoices)
      .values({
        customerId,
        invoiceNumber,
        invoiceType: "gst_invoice",
        dispatchDate: startDate,
        startDate,
        endDate,
        returnDate: endDate,
        eventDetails: row.eventDate || "Hire",
        subtotal: String(row.net),
        gstRate: "18.00",
        gstAmount: String(row.gst),
        totalAmount: String(row.gross),
        depositAmount: String(row.deposit || 0),
        rentAmount: String(row.rent || 0),
        packingAmount: String(row.packing || 0),
        transportAmount: String(row.transport || 0),
        mistAmount: String(row.mist || 0),
        discountAmount: String(row.discount || 0),
        breakageAmount: String(row.breakage || 0),
        status: row.pending > 2 ? "sent" : "paid",
      })
      .returning();
    await db.insert(invoiceItems).values({
      invoiceId: inv.id,
      itemId: hireItemId,
      quantity: 1,
      ratePerDay: String(row.rent || 0),
      days: 1,
      lineTotal: String(row.net),
    });
    if (row.collected > 1) {
      await db.insert(payments).values({
        invoiceId: inv.id,
        amount: String(row.collected),
        paidOn: lastDay(row.month),
        method: String(row.paymentType || "").toLowerCase().includes("cash") ? "cash" : "bank",
        kind: "invoice",
      });
    }
    invoicesAdded += 1;
  }
  return { invoicesAdded, skipped };
}

async function ensureFinanceClients() {
  const finance = JSON.parse(readFileSync(join(process.cwd(), "server/data/switch-finance.json"), "utf8")) as {
    invoices: { client: string; gstNumber: string }[];
  };
  const people = await db.select().from(customers);
  const seen = new Set(people.map((c) => c.name.trim().toLowerCase()));
  const liveCustomers = [];
  for (const row of finance.invoices) {
    const name = row.client.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 40);
    const gst = (row.gstNumber || "").replace(/\s/g, "");
    liveCustomers.push({
      name,
      email: `${slug || "client"}@clients.switchrental.in`,
      phone: "9125660485",
      address: "Mumbai",
      company: name,
      gstNumber: /^[0-9A-Z]{15}$/i.test(gst) ? gst.toUpperCase() : undefined,
    });
  }
  if (liveCustomers.length) {
    await db.insert(customers).values(liveCustomers);
  }
  return liveCustomers.length;
}

async function main() {
  await db.execute(sql`
    TRUNCATE inventory_returns, invoice_items, payments, invoices, order_items, orders,
      inventory_items, customers, enquiries, operating_expenses, cash_positions, capital_entries
    RESTART IDENTITY CASCADE
  `);

  const boot = await storage.bootstrapOps();
  const extraClients = await ensureFinanceClients();
  const [hireItem] = await db.select().from(inventoryItems).limit(1);
  if (!hireItem) throw new Error("Catalogue did not load");
  const books = await seedLiveBooks(hireItem.id);
  const workbook = await importWorkbookBooks();

  await db.delete(financeSettings);
  await db.insert(financeSettings).values({
    annualBudgetNet: "7000000.00",
    samirName: "Samir Chhabria",
    karanName: "Karan Khiani",
    samirShare: "0.7400",
    karanShare: "0.2600",
  });
  await db.insert(capitalEntries).values([
    {
      partner: "samir",
      kind: "contribution",
      amount: "4810000.00",
      occurredOn: "2026-04-01",
      notes: "Opening capital toward crockery stock",
    },
    {
      partner: "karan",
      kind: "contribution",
      amount: "1690000.00",
      occurredOn: "2026-04-01",
      notes: "Opening capital toward crockery stock",
    },
  ]);

  console.log(
    JSON.stringify(
      {
        catalogueItems: boot.items,
        clients: boot.clients + extraClients,
        extraClients,
        invoices: books.invoicesAdded,
        skippedInvoices: books.skipped,
        workbookExpenses: workbook.expenses,
        workbookSheets: workbook.sheets,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
