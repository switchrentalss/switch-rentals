import { readFileSync } from "fs";
import { join } from "path";
import "dotenv/config";
import { db } from "./db";
import {
  customers,
  inventoryItems,
  orders,
  orderItems,
  invoices,
  invoiceItems,
  inventoryReturns,
  enquiries,
  payments,
  expenses,
  cashPositions,
  financeSettings,
  capitalEntries,
} from "../shared/schema";
import { sql } from "drizzle-orm";

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
  for (const row of finance.invoices as any[]) {
    i += 1;
    const customerId = byName.get(row.client);
    if (!customerId) continue;
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
      });
    }
  }
  for (const [month, block] of Object.entries(finance.expensesByMonth || {}) as any) {
    if (!["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].includes(month)) continue;
    for (const line of block.lines || []) {
      if (!line.amount) continue;
      await db.insert(expenses).values({
        spentOn: lastDay(month),
        costGroup: line.group,
        category: line.name,
        description: line.name,
        amount: String(line.amount),
      });
    }
  }
  for (const [month, pos] of Object.entries(finance.cash || {}) as any) {
    await db.insert(cashPositions).values({
      asOf: lastDay(month),
      bankAmount: String(pos.bank || 0),
      cashAmount: String(pos.cash || 0),
      notes: "Imported from cash-flow workbook",
    });
  }
}

async function seed() {
  await db.execute(sql`
    TRUNCATE inventory_returns, invoice_items, payments, invoices, order_items, orders, inventory_items, customers, enquiries, operating_expenses, cash_positions, capital_entries, finance_settings
    RESTART IDENTITY CASCADE
  `);

  const [meera, rahul, priya, arjun] = await db
    .insert(customers)
    .values([
      {
        name: "Meera Shah",
        email: "meera@marigoldevents.in",
        phone: "9820091201",
        address: "Bandra West, Mumbai 400050",
        company: "Marigold Events",
        gstNumber: "27AABCU9603R1ZM",
      },
      {
        name: "Rahul Khanna",
        email: "rahul@khannaweddings.com",
        phone: "9876543210",
        address: "Juhu Tara Road, Mumbai 400049",
        company: "Khanna Weddings",
        gstNumber: "27AAGCK1234P1Z2",
      },
      {
        name: "Priya Desai",
        email: "priya@desaicatering.in",
        phone: "9811122233",
        address: "Andheri East, Mumbai 400069",
        company: "Desai Catering Co.",
        gstNumber: "27AAPCD7788Q1Z5",
      },
      {
        name: "Arjun Malhotra",
        email: "studio@malhotrafilms.in",
        phone: "9900011122",
        address: "Worli, Mumbai 400018",
        company: "Malhotra Films",
        gstNumber: "27AAMCM4455L1Z9",
      },
    ])
    .returning();

  const items = await db
    .insert(inventoryItems)
    .values([
      { name: "Bone China Dinner Plate", description: "10.5 inch white gold rim", category: "Plates", totalStock: 400, availableStock: 280, outStock: 120, ratePerDay: "18.00", maintenanceStatus: "available", replacementCost: "220.00", status: "in_stock" },
      { name: "Coupe Salad Plate", description: "Matte ivory", category: "Plates", totalStock: 350, availableStock: 310, outStock: 40, ratePerDay: "12.00", maintenanceStatus: "available", replacementCost: "140.00", status: "in_stock" },
      { name: "Crystal Water Goblet", description: "Lead-free crystal", category: "Glassware", totalStock: 300, availableStock: 210, outStock: 90, ratePerDay: "22.00", maintenanceStatus: "available", replacementCost: "280.00", status: "in_stock" },
      { name: "Champagne Flute", description: "Tall stem", category: "Glassware", totalStock: 240, availableStock: 48, outStock: 192, ratePerDay: "20.00", maintenanceStatus: "available", replacementCost: "260.00", status: "in_stock" },
      { name: "Gold Cutlery Set", description: "5-piece PVD gold", category: "Cutlery", totalStock: 280, availableStock: 190, outStock: 90, ratePerDay: "35.00", maintenanceStatus: "available", replacementCost: "450.00", status: "in_stock" },
      { name: "Serving Bowl — Large", description: "White porcelain", category: "Serveware", totalStock: 80, availableStock: 62, outStock: 18, ratePerDay: "45.00", maintenanceStatus: "available", replacementCost: "600.00", status: "in_stock" },
      { name: "Charger Plate — Antique Gold", description: "13 inch", category: "Plates", totalStock: 160, availableStock: 22, outStock: 138, ratePerDay: "28.00", maintenanceStatus: "available", replacementCost: "380.00", status: "in_stock" },
      { name: "Espresso Cup & Saucer", description: "Bone china", category: "Crockery", totalStock: 200, availableStock: 200, outStock: 0, ratePerDay: "10.00", maintenanceStatus: "available", replacementCost: "90.00", status: "in_stock" },
    ])
    .returning();

  const [o1, o2, o3, o4, o5] = await db
    .insert(orders)
    .values([
      { customerId: meera.id, orderNumber: "ORD-014", eventDate: "2026-03-12", startDate: "2026-03-11", endDate: "2026-03-13", eventDetails: "Mehendi at Juhu villa", status: "returned", totalAmount: "86400.00", createdAt: new Date("2026-03-02T10:00:00") },
      { customerId: rahul.id, orderNumber: "ORD-021", eventDate: "2026-06-08", startDate: "2026-06-07", endDate: "2026-06-09", eventDetails: "Khanna–Kapoor wedding, Grand Hyatt", status: "returned", totalAmount: "214500.00", createdAt: new Date("2026-05-20T10:00:00") },
      { customerId: priya.id, orderNumber: "ORD-028", eventDate: "2026-08-22", startDate: "2026-08-21", endDate: "2026-08-23", eventDetails: "Corporate gala, BKC", status: "active", totalAmount: "128700.00", createdAt: new Date("2026-08-10T10:00:00") },
      { customerId: arjun.id, orderNumber: "ORD-031", eventDate: "2026-08-18", startDate: "2026-08-17", endDate: "2026-08-19", eventDetails: "Film wrap dinner, Worli", status: "overdue", totalAmount: "41200.00", createdAt: new Date("2026-08-12T10:00:00") },
      { customerId: meera.id, orderNumber: "ORD-033", eventDate: "2026-09-05", startDate: "2026-09-04", endDate: "2026-09-06", eventDetails: "Sangeet, St. Regis", status: "pending", totalAmount: "156000.00", createdAt: new Date("2026-08-20T10:00:00") },
    ])
    .returning();

  await db.insert(orderItems).values([
    { orderId: o1.id, itemId: items[0].id, quantity: 120, ratePerDay: "18.00", totalAmount: "6480.00" },
    { orderId: o1.id, itemId: items[2].id, quantity: 80, ratePerDay: "22.00", totalAmount: "5280.00" },
    { orderId: o2.id, itemId: items[0].id, quantity: 220, ratePerDay: "18.00", totalAmount: "11880.00" },
    { orderId: o2.id, itemId: items[3].id, quantity: 180, ratePerDay: "20.00", totalAmount: "10800.00" },
    { orderId: o2.id, itemId: items[4].id, quantity: 200, ratePerDay: "35.00", totalAmount: "21000.00" },
    { orderId: o3.id, itemId: items[0].id, quantity: 80, ratePerDay: "18.00", totalAmount: "4320.00" },
    { orderId: o3.id, itemId: items[6].id, quantity: 80, ratePerDay: "28.00", totalAmount: "6720.00" },
    { orderId: o3.id, itemId: items[4].id, quantity: 90, ratePerDay: "35.00", totalAmount: "9450.00" },
    { orderId: o4.id, itemId: items[2].id, quantity: 40, ratePerDay: "22.00", totalAmount: "2640.00" },
    { orderId: o4.id, itemId: items[5].id, quantity: 12, ratePerDay: "45.00", totalAmount: "1620.00" },
    { orderId: o5.id, itemId: items[0].id, quantity: 180, ratePerDay: "18.00", totalAmount: "9720.00" },
    { orderId: o5.id, itemId: items[4].id, quantity: 180, ratePerDay: "35.00", totalAmount: "18900.00" },
    { orderId: o5.id, itemId: items[6].id, quantity: 90, ratePerDay: "28.00", totalAmount: "7560.00" },
  ]);

  const [q1, p1, g1] = await db
    .insert(invoices)
    .values([
      {
        customerId: meera.id,
        orderId: o1.id,
        invoiceNumber: "QUO-0008",
        invoiceType: "quotation",
        dispatchDate: "2026-09-04",
        startDate: "2026-09-04",
        endDate: "2026-09-06",
        eventDetails: "Sangeet, St. Regis — 180 pax",
        subtotal: "132203.00",
        gstRate: "18.00",
        gstAmount: "23796.54",
        totalAmount: "156000.00",
        status: "draft",
        terms: "50% advance. Balance before dispatch.",
        createdAt: new Date("2026-08-20T10:00:00"),
      },
      {
        customerId: priya.id,
        orderId: o3.id,
        invoiceNumber: "PRO-0004",
        invoiceType: "proforma",
        dispatchDate: "2026-08-21",
        startDate: "2026-08-21",
        endDate: "2026-08-23",
        eventDetails: "Corporate gala, BKC",
        subtotal: "109068.00",
        gstRate: "18.00",
        gstAmount: "19632.00",
        totalAmount: "128700.00",
        status: "sent",
        createdAt: new Date("2026-08-10T10:00:00"),
      },
      {
        customerId: rahul.id,
        orderId: o2.id,
        invoiceNumber: "GST-0012",
        invoiceType: "gst_invoice",
        dispatchDate: "2026-06-07",
        startDate: "2026-06-07",
        endDate: "2026-06-09",
        eventDetails: "Khanna–Kapoor wedding",
        subtotal: "181780.00",
        gstRate: "18.00",
        gstAmount: "32720.00",
        totalAmount: "214500.00",
        status: "paid",
        notes: "demo",
        createdAt: new Date("2026-06-09T10:00:00"),
      },
      {
        customerId: meera.id,
        orderId: o1.id,
        invoiceNumber: "FIN-0003",
        invoiceType: "final_invoice",
        dispatchDate: "2026-03-11",
        startDate: "2026-03-11",
        endDate: "2026-03-13",
        eventDetails: "Mehendi settlement",
        subtotal: "73220.00",
        gstRate: "18.00",
        gstAmount: "13180.00",
        totalAmount: "86400.00",
        status: "paid",
        notes: "demo",
        createdAt: new Date("2026-03-14T10:00:00"),
      },
    ])
    .returning();

  await db.insert(invoiceItems).values([
    { invoiceId: q1.id, itemId: items[0].id, quantity: 180, ratePerDay: "18.00", days: 3, lineTotal: "9720.00" },
    { invoiceId: p1.id, itemId: items[6].id, quantity: 80, ratePerDay: "28.00", days: 3, lineTotal: "6720.00" },
    { invoiceId: g1.id, itemId: items[0].id, quantity: 220, ratePerDay: "18.00", days: 3, lineTotal: "11880.00" },
  ]);

  await db.insert(inventoryReturns).values([
    {
      orderId: o1.id,
      invoiceId: q1.id,
      itemId: items[0].id,
      quantityShipped: 120,
      quantityReturned: 118,
      conditionStatus: "perfect",
      checkedBy: "Ravi Patil",
    },
    {
      orderId: o2.id,
      invoiceId: g1.id,
      itemId: items[3].id,
      quantityShipped: 180,
      quantityReturned: 176,
      conditionStatus: "damaged",
      damageNotes: "4 flutes chipped at the rim during teardown",
      penaltyAmount: "1040.00",
      checkedBy: "Sana Sheikh",
    },
  ]);

  await db.insert(enquiries).values([
    {
      name: "Nisha Rao",
      company: "Sea View Banquets",
      phone: "9819988776",
      email: "nisha@seaviewbanquets.in",
      eventDate: "2026-09-20",
      covers: "280",
      message: "Need gold rim dinner set and crystal for a Saturday wedding at Bandra.",
      status: "new",
    },
    {
      name: "Vikram Patel",
      company: "Patel Family",
      phone: "9821023344",
      eventDate: "2026-10-04",
      covers: "120",
      message: "Sangeet at home — coupe plates and gold cutlery. Please WhatsApp rates.",
      status: "new",
    },
  ]);

  const finance = JSON.parse(readFileSync(join(process.cwd(), "server/data/switch-finance.json"), "utf8")) as {
    invoices: { client: string; gstNumber: string }[];
  };
  const seen = new Set<string>();
  const liveCustomers = [];
  for (const row of finance.invoices) {
    const name = row.client.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
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

  await seedLiveBooks(items[0].id);

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

  console.log("Demo data loaded for Switch Rentals.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
