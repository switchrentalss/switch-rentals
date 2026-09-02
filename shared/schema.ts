import { pgTable, text, serial, integer, decimal, date, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address").notNull(),
  company: varchar("company", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 15 }),
  notes: text("notes"),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 50 }).unique(),
  itemCode: varchar("item_code", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  totalStock: integer("total_stock").notNull(),
  availableStock: integer("available_stock").notNull(),
  outStock: integer("out_stock").notNull().default(0),
  ratePerDay: decimal("rate_per_day", { precision: 10, scale: 2 }).notNull(),
  maintenanceStatus: varchar("maintenance_status", { length: 50 }).notNull().default("available"),
  replacementCost: decimal("replacement_cost", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 30 }).notNull().default("in_stock"),
  location: varchar("location", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }),
  purchaseDate: date("purchase_date"),
  warrantyExpiry: date("warranty_expiry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  eventDate: date("event_date").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  eventDetails: text("event_details"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  ratePerDay: decimal("rate_per_day", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull().unique(),
  eventDate: date("event_date").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  eventDetails: text("event_details"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  validUntil: date("valid_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  ratePerDay: decimal("rate_per_day", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const damageReports = pgTable("damage_reports", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  itemId: integer("item_id").notNull(),
  damageType: varchar("damage_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  repairCost: decimal("repair_cost", { precision: 10, scale: 2 }),
  isReplaced: varchar("is_replaced", { length: 10 }).notNull().default("no"),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  quoteId: integer("quote_id"), // Reference to parent quotation
  invoiceNumber: varchar("invoice_number", { length: 50 }).unique().notNull(),
  invoiceType: varchar("invoice_type", { length: 20 }).notNull(), // quotation, proforma, gst_invoice, final_invoice
  dispatchDate: date("dispatch_date").notNull(), // Changed from eventDate
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  eventDetails: text("event_details"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18.00"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default("0.00"),
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  packingAmount: decimal("packing_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  transportAmount: decimal("transport_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  mistAmount: decimal("mist_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  breakageAmount: decimal("breakage_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  returnDate: date("return_date"),
  sampleType: varchar("sample_type", { length: 20 }).default("none"), // none, free_1day, paid
  status: varchar("status", { length: 20 }).default("draft"), // draft, sent, paid, overdue
  dueDate: date("due_date"),
  terms: text("terms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  ratePerDay: decimal("rate_per_day", { precision: 10, scale: 2 }).notNull(),
  days: integer("days").notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const inventoryReturns = pgTable("inventory_returns", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantityShipped: integer("quantity_shipped").notNull(),
  quantityReturned: integer("quantity_returned").notNull(),
  conditionStatus: varchar("condition_status", { length: 20 }).notNull(), // perfect, damaged, missing, needs_cleaning
  damageNotes: text("damage_notes"),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }).default("0.00"),
  checkedBy: varchar("checked_by", { length: 100 }),
  returnDate: timestamp("return_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidOn: date("paid_on").notNull(),
  method: varchar("method", { length: 20 }).notNull().default("bank"),
  kind: varchar("kind", { length: 20 }).notNull().default("invoice"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("operating_expenses", {
  id: serial("id").primaryKey(),
  spentOn: date("spent_on").notNull(),
  costGroup: varchar("cost_group", { length: 20 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cashPositions = pgTable("cash_positions", {
  id: serial("id").primaryKey(),
  asOf: date("as_of").notNull().unique(),
  bankAmount: decimal("bank_amount", { precision: 12, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financeSettings = pgTable("finance_settings", {
  id: serial("id").primaryKey(),
  annualBudgetNet: decimal("annual_budget_net", { precision: 14, scale: 2 }).notNull().default("7000000.00"),
  samirName: varchar("samir_name", { length: 80 }).notNull().default("Samir Chhabria"),
  karanName: varchar("karan_name", { length: 80 }).notNull().default("Karan Khiani"),
  samirShare: decimal("samir_share", { precision: 6, scale: 4 }).notNull().default("0.7400"),
  karanShare: decimal("karan_share", { precision: 6, scale: 4 }).notNull().default("0.2600"),
});

export const capitalEntries = pgTable("capital_entries", {
  id: serial("id").primaryKey(),
  partner: varchar("partner", { length: 20 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  occurredOn: date("occurred_on").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffUsers = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  eventDate: varchar("event_date", { length: 20 }),
  covers: varchar("covers", { length: 50 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  outStock: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true,
  createdAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertDamageReportSchema = createInsertSchema(damageReports).omit({
  id: true,
  reportedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryReturnSchema = createInsertSchema(inventoryReturns).omit({
  id: true,
  returnDate: true,
  createdAt: true,
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertCashPositionSchema = createInsertSchema(cashPositions).omit({
  id: true,
  createdAt: true,
});

export const insertFinanceSettingsSchema = createInsertSchema(financeSettings).omit({
  id: true,
});

export const insertCapitalEntrySchema = createInsertSchema(capitalEntries).omit({
  id: true,
  createdAt: true,
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;

export type DamageReport = typeof damageReports.$inferSelect;
export type InsertDamageReport = z.infer<typeof insertDamageReportSchema>;

// Extended types for API responses
export type OrderWithCustomer = Order & {
  customer: Customer;
  items: (OrderItem & { item: InventoryItem })[];
};

export type QuoteWithCustomer = Quote & {
  customer: Customer;
  items: (QuoteItem & { item: InventoryItem })[];
};

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type InventoryReturn = typeof inventoryReturns.$inferSelect;
export type InsertInventoryReturn = z.infer<typeof insertInventoryReturnSchema>;

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type CashPosition = typeof cashPositions.$inferSelect;
export type InsertCashPosition = z.infer<typeof insertCashPositionSchema>;
export type FinanceSettings = typeof financeSettings.$inferSelect;
export type InsertFinanceSettings = z.infer<typeof insertFinanceSettingsSchema>;
export type CapitalEntry = typeof capitalEntries.$inferSelect;
export type InsertCapitalEntry = z.infer<typeof insertCapitalEntrySchema>;

export type InvoiceWithCustomer = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { item: InventoryItem })[];
};

export type DashboardMetrics = {
  activeOrders: number;
  itemsOut: number;
  monthlyRevenue: string;
  overdueItems: number;
  pendingQuotes: number;
  damageReports: number;
};
