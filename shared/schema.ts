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
  notes: text("notes"),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  totalStock: integer("total_stock").notNull(),
  availableStock: integer("available_stock").notNull(),
  ratePerDay: decimal("rate_per_day", { precision: 10, scale: 2 }).notNull(),
  maintenanceStatus: varchar("maintenance_status", { length: 50 }).notNull().default("available"),
  replacementCost: decimal("replacement_cost", { precision: 10, scale: 2 }),
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

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
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

export type DashboardMetrics = {
  activeOrders: number;
  itemsOut: number;
  monthlyRevenue: string;
  overdueItems: number;
  pendingQuotes: number;
  damageReports: number;
};
