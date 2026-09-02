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
  type Customer, 
  type InsertCustomer,
  type InventoryItem,
  type InsertInventoryItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithCustomer,
  type DashboardMetrics,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InvoiceWithCustomer,
  type InventoryReturn,
  type InsertInventoryReturn,
  type Enquiry,
  type InsertEnquiry,
  type Payment,
  type InsertPayment,
  type Expense,
  type InsertExpense,
  type CashPosition,
  type InsertCashPosition,
  type FinanceSettings,
  type InsertFinanceSettings,
  type CapitalEntry,
  type InsertCapitalEntry,
} from "@shared/schema";
import { isInvoicePaymentKind, lateReturnCharge, toteCharge } from "@shared/hire";
import { db } from "./db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Inventory Items
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  bootstrapOps(): Promise<{ itemsAdded: number; itemsUpdated: number; clientsAdded: number; items: number; clients: number }>;

  // Orders
  getOrders(): Promise<OrderWithCustomer[]>;
  getOrder(id: number): Promise<OrderWithCustomer | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithCustomer>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;

  // Order Items
  getOrderItems(orderId: number): Promise<(OrderItem & { item: InventoryItem })[]>;
  addOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, orderItem: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: number): Promise<boolean>;

  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;

  // Inventory Management
  updateInventoryStock(itemId: number, quantityChange: number): Promise<InventoryItem | undefined>;

  // Invoice Management
  getInvoices(type?: string): Promise<InvoiceWithCustomer[]>;
  getInvoice(id: number): Promise<InvoiceWithCustomer | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithCustomer>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  convertQuoteToInvoice(quoteId: number, invoiceType: string): Promise<InvoiceWithCustomer>;
  processReturnsAndCreateFinalInvoice(invoiceId: number, returns: any[]): Promise<InvoiceWithCustomer>;

  // Inventory Returns
  getInventoryReturns(orderId?: number): Promise<(InventoryReturn & { item: InventoryItem })[]>;
  createInventoryReturn(returnData: InsertInventoryReturn): Promise<InventoryReturn>;
  updateInventoryReturn(id: number, returnData: Partial<InsertInventoryReturn>): Promise<InventoryReturn | undefined>;

  getAvailability(start: string, end: string): Promise<{ itemId: number; name: string; totalStock: number; reserved: number; available: number }[]>;
  getEnquiries(): Promise<Enquiry[]>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiryStatus(id: number, status: string): Promise<Enquiry | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database storage doesn't need initialization maps
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values({
      ...customer,
      company: customer.company || null,
      notes: customer.notes || null
    }).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updatedCustomer || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Inventory methods
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values({
      ...item,
      sku: item.sku || null,
      itemCode: item.itemCode || null,
      description: item.description || null,
      subcategory: item.subcategory || null,
      outStock: item.totalStock - item.availableStock,
      replacementCost: item.replacementCost || null,
      status: item.status || "in_stock",
      location: item.location || null,
      supplier: item.supplier || null,
      purchaseDate: item.purchaseDate || null,
      warrantyExpiry: item.warrantyExpiry || null,
      notes: item.notes || null
    }).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updatedItem] = await db.update(inventoryItems).set(item).where(eq(inventoryItems.id, id)).returning();
    return updatedItem || undefined;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async bootstrapOps() {
    const catalogue = JSON.parse(readFileSync(join(process.cwd(), "server/data/catalogue.json"), "utf8")) as InsertInventoryItem[];
    const liveClients = JSON.parse(readFileSync(join(process.cwd(), "server/data/live-clients.json"), "utf8")) as InsertCustomer[];
    let itemsAdded = 0;
    let itemsUpdated = 0;
    for (const row of catalogue) {
      const [hit] = row.sku
        ? await db.select().from(inventoryItems).where(eq(inventoryItems.sku, row.sku))
        : [];
      if (hit) {
        await db
          .update(inventoryItems)
          .set({
            name: row.name,
            category: row.category,
            itemCode: row.itemCode || row.sku,
            ratePerDay: row.ratePerDay,
            replacementCost: row.replacementCost,
            description: row.description,
            location: row.location || "Gupta Mills",
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, hit.id));
        itemsUpdated += 1;
        continue;
      }
      await this.createInventoryItem(row);
      itemsAdded += 1;
    }
    const existing = await this.getCustomers();
    const seen = new Set(existing.map((c) => `${(c.company || c.name).toLowerCase()}|${c.email.toLowerCase()}`));
    let clientsAdded = 0;
    for (const client of liveClients) {
      const nameKey = (client.company || client.name).toLowerCase();
      const key = `${nameKey}|${client.email.toLowerCase()}`;
      if ([...existing].some((c) => (c.company || c.name).toLowerCase() === nameKey) || seen.has(key)) continue;
      await this.createCustomer(client);
      seen.add(key);
      clientsAdded += 1;
    }
    return {
      itemsAdded,
      itemsUpdated,
      clientsAdded,
      items: (await this.getInventoryItems()).length,
      clients: (await this.getCustomers()).length,
    };
  }

  // Order methods
  async getOrders(): Promise<OrderWithCustomer[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        orderNumber: orders.orderNumber,
        eventDate: orders.eventDate,
        startDate: orders.startDate,
        endDate: orders.endDate,
        eventDetails: orders.eventDetails,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          company: customers.company,
          gstNumber: customers.gstNumber,
          notes: customers.notes,
        }
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(sql`${orders.createdAt} desc`);

    const ordersWithItems = await Promise.all(
      ordersWithCustomers.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return {
          ...order,
          items
        };
      })
    );

    return ordersWithItems;
  }

  async getOrder(id: number): Promise<OrderWithCustomer | undefined> {
    const [orderWithCustomer] = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        orderNumber: orders.orderNumber,
        eventDate: orders.eventDate,
        startDate: orders.startDate,
        endDate: orders.endDate,
        eventDetails: orders.eventDetails,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          company: customers.company,
          gstNumber: customers.gstNumber,
          notes: customers.notes,
        }
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));

    if (!orderWithCustomer) return undefined;

    const items = await this.getOrderItems(id);
    return {
      ...orderWithCustomer,
      items
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithCustomer> {
    const availability = await this.getAvailability(order.startDate, order.endDate);
    for (const item of items) {
      const slot = availability.find((row) => row.itemId === item.itemId);
      if (!slot || slot.available < item.quantity) {
        throw new Error(
          `Those dates are already booked for ${slot?.name || "an item"}. Free: ${slot?.available ?? 0}, requested: ${item.quantity}.`,
        );
      }
    }
    // Generate order number
    const orderCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const orderNumber = `ORD-${String(orderCount[0].count + 1).padStart(3, '0')}`;
    
    const [newOrder] = await db.insert(orders).values({
      customerId: order.customerId,
      orderNumber,
      eventDate: order.eventDate,
      startDate: order.startDate,
      endDate: order.endDate,
      eventDetails: order.eventDetails || null,
      status: order.status || "pending",
      totalAmount: order.totalAmount,
    }).returning();
    
    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });
      await this.updateInventoryStock(item.itemId, -item.quantity);
    }

    const result = await this.getOrder(newOrder.id);
    if (!result) throw new Error("Failed to retrieve created order");
    return result;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set(order).where(eq(orders.id, id)).returning();
    return updatedOrder || undefined;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updatedOrder || undefined;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const items = await this.getOrderItems(id);
    for (const item of items) {
      await this.updateInventoryStock(item.itemId, item.quantity);
    }
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    const result = await db.delete(orders).where(eq(orders.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Order item methods
  async getOrderItems(orderId: number): Promise<(OrderItem & { item: InventoryItem })[]> {
    const result = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        itemId: orderItems.itemId,
        quantity: orderItems.quantity,
        ratePerDay: orderItems.ratePerDay,
        totalAmount: orderItems.totalAmount,
        item: {
          id: inventoryItems.id,
          name: inventoryItems.name,
          description: inventoryItems.description,
          category: inventoryItems.category,
          subcategory: inventoryItems.subcategory,
          totalStock: inventoryItems.totalStock,
          availableStock: inventoryItems.availableStock,
          outStock: inventoryItems.outStock,
          ratePerDay: inventoryItems.ratePerDay,
          maintenanceStatus: inventoryItems.maintenanceStatus,
          replacementCost: inventoryItems.replacementCost,
          status: inventoryItems.status,
          location: inventoryItems.location,
          supplier: inventoryItems.supplier,
          purchaseDate: inventoryItems.purchaseDate,
          warrantyExpiry: inventoryItems.warrantyExpiry,
          notes: inventoryItems.notes,
          sku: inventoryItems.sku,
          itemCode: inventoryItems.itemCode,
          createdAt: inventoryItems.createdAt,
          updatedAt: inventoryItems.updatedAt,
        }
      })
      .from(orderItems)
      .innerJoin(inventoryItems, eq(orderItems.itemId, inventoryItems.id))
      .where(eq(orderItems.orderId, orderId));

    return result;
  }

  async addOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
    return newOrderItem;
  }

  async updateOrderItem(id: number, orderItem: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    const [updatedOrderItem] = await db.update(orderItems).set(orderItem).where(eq(orderItems.id, id)).returning();
    return updatedOrderItem || undefined;
  }

  async deleteOrderItem(id: number): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [activeOrdersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'active'));

    const [totalItemsOut] = await db
      .select({ total: sql<number>`sum(${inventoryItems.totalStock} - ${inventoryItems.availableStock})` })
      .from(inventoryItems);

    const [monthlyRevenueResult] = await db
      .select({ revenue: sql<string>`sum(${orders.totalAmount})` })
      .from(orders)
      .where(sql`${orders.createdAt} >= date_trunc('month', current_date)`);

    const [overdueItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.endDate} < current_date AND ${orders.status} not in ('returned', 'cancelled')`);

    // Get pending quotes count from invoices table
    const [pendingQuotesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.invoiceType, 'quotation'));
    const pendingQuotes = pendingQuotesResult.count || 0;

    // Get damage reports count from inventory returns
    const [damageReportsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryReturns)
      .where(eq(inventoryReturns.conditionStatus, 'damaged'));
    const damageReportsCount = damageReportsResult.count || 0;

    return {
      activeOrders: Number(activeOrdersResult.count || 0),
      itemsOut: Number(totalItemsOut.total || 0),
      monthlyRevenue: monthlyRevenueResult.revenue || "0.00",
      overdueItems: Number(overdueItemsResult.count || 0),
      pendingQuotes: Number(pendingQuotes || 0),
      damageReports: Number(damageReportsCount || 0),
    };
  }

  async updateInventoryStock(itemId: number, quantityChange: number): Promise<InventoryItem | undefined> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({
          availableStock: sql`${inventoryItems.availableStock} + ${quantityChange}`,
        outStock: sql`GREATEST(${inventoryItems.outStock} - ${quantityChange}, 0)`,
      })
      .where(eq(inventoryItems.id, itemId))
      .returning();
    
    return updatedItem || undefined;
  }

  // Invoice Management
  async getInvoices(type?: string): Promise<InvoiceWithCustomer[]> {
    try {
      const baseQuery = db
        .select({
          invoice: invoices,
          customer: customers,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id));

      const query = type 
        ? baseQuery.where(eq(invoices.invoiceType, type))
        : baseQuery;

      const results = await query.execute();
      
      const invoicesWithItems = await Promise.all(
        results.map(async ({ invoice, customer }) => {
          const items = await db
            .select({
              invoiceItem: invoiceItems,
              item: inventoryItems,
            })
            .from(invoiceItems)
            .leftJoin(inventoryItems, eq(invoiceItems.itemId, inventoryItems.id))
            .where(eq(invoiceItems.invoiceId, invoice.id));

          return {
            ...invoice,
            customer: customer!,
            items: items.map(({ invoiceItem, item }) => ({
              ...invoiceItem,
              item: item!,
            })),
          };
        })
      );

      return invoicesWithItems;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async getInvoice(id: number): Promise<InvoiceWithCustomer | undefined> {
    try {
      const result = await db
        .select({
          invoice: invoices,
          customer: customers,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(eq(invoices.id, id))
        .limit(1)
        .execute();

      if (result.length === 0) return undefined;

      const { invoice, customer } = result[0];

      const items = await db
        .select({
          invoiceItem: invoiceItems,
          item: inventoryItems,
        })
        .from(invoiceItems)
        .leftJoin(inventoryItems, eq(invoiceItems.itemId, inventoryItems.id))
        .where(eq(invoiceItems.invoiceId, invoice.id))
        .execute();

      return {
        ...invoice,
        customer: customer!,
        items: items.map(({ invoiceItem, item }) => ({
          ...invoiceItem,
          item: item!,
        })),
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return undefined;
    }
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithCustomer> {
    try {
      const typePrefix = {
        'quotation': 'QUO',
        'proforma': 'PRO',
        'gst_invoice': 'GST',
        'final_invoice': 'FIN'
      }[invoice.invoiceType] || 'INV';
      
      const count = await db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.invoiceType, invoice.invoiceType))
        .execute();
      
      const requestedNumber = (invoice as InsertInvoice & { invoiceNumber?: string }).invoiceNumber;
      const invoiceNumber =
        requestedNumber && requestedNumber.trim()
          ? requestedNumber.trim()
          : `${typePrefix}-${String(count[0].count + 1).padStart(4, "0")}`;

      const payload = { ...(invoice as Record<string, unknown>) };
      delete payload.invoiceNumber;
      const [createdInvoice] = await db
        .insert(invoices)
        .values({
          ...(payload as InsertInvoice),
          invoiceNumber,
        })
        .returning();

      const invoiceItemsWithId = items.map(item => ({
        ...item,
        invoiceId: createdInvoice.id,
      }));

      await db.insert(invoiceItems).values(invoiceItemsWithId).execute();

      const completeInvoice = await this.getInvoice(createdInvoice.id);
      return completeInvoice!;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    try {
      const [updated] = await db
        .update(invoices)
        .set({ ...invoice, updatedAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return undefined;
    }
  }

  async deleteInvoice(id: number): Promise<boolean> {
    try {
      await db.delete(payments).where(eq(payments.invoiceId, id)).execute();
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).execute();
      await db.delete(invoices).where(eq(invoices.id, id)).execute();
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
  }

  async convertQuoteToInvoice(quoteId: number, invoiceType: string): Promise<InvoiceWithCustomer> {
    try {
      // Get the original invoice (quote)
      const quote = await this.getInvoice(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      const invoiceData: InsertInvoice = {
        customerId: quote.customerId,
        quoteId: quoteId,

        invoiceType: invoiceType as any,
        dispatchDate: quote.dispatchDate,
        startDate: quote.startDate,
        endDate: quote.endDate,
        eventDetails: quote.eventDetails,
        subtotal: quote.subtotal,
        gstRate: quote.gstRate,
        gstAmount: quote.gstAmount,
        totalAmount: quote.totalAmount,
        depositAmount: quote.depositAmount || "0.00",
        rentAmount: quote.rentAmount,
        packingAmount: quote.packingAmount,
        transportAmount: quote.transportAmount,
        mistAmount: quote.mistAmount,
        discountAmount: quote.discountAmount,
        breakageAmount: quote.breakageAmount,
        returnDate: quote.returnDate,
        sampleType: quote.sampleType || "none",
        status: invoiceType === 'quotation' ? 'draft' : 'sent',
        terms: quote.terms,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const invoiceItemsData: InsertInvoiceItem[] = quote.items?.map((item: any) => {
        const startDate = new Date(quote.startDate);
        const endDate = new Date(quote.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          invoiceId: 0, // Will be set after invoice creation
          itemId: item.itemId,
          quantity: item.quantity,
          ratePerDay: item.ratePerDay,
          days: days,
          lineTotal: item.lineTotal || item.totalAmount,
        };
      }) || [];

      const createdInvoice = await this.createInvoice(invoiceData, invoiceItemsData);
      
      // Update original quote status if converting from quotation
      if (quote.invoiceType === 'quotation') {
        await this.updateInvoice(quoteId, { status: 'converted' });
      }

      return createdInvoice;
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      throw error;
    }
  }

  private generateInvoiceNumber(invoiceType: string): string {
    const prefixes = {
      quotation: 'QUO',
      proforma: 'PRO', 
      gst_invoice: 'GST',
      final_invoice: 'FIN'
    };
    
    const prefix = (prefixes as any)[invoiceType] || 'INV';
    const timestamp = Date.now();
    const counter = Math.floor(Math.random() * 1000);
    
    return `${prefix}-${String(counter).padStart(4, '0')}`;
  }

  async processReturnsAndCreateFinalInvoice(invoiceId: number, returns: any[]): Promise<InvoiceWithCustomer> {
    const gstInvoice = await this.getInvoice(invoiceId);
    if (!gstInvoice) throw new Error("GST Invoice not found");

    let breakage = 0;
    for (const returnItem of returns) {
      const penalty = parseFloat(returnItem.penaltyAmount || "0") || 0;
      if (returnItem.conditionStatus === "damaged" || returnItem.conditionStatus === "missing") {
        breakage += penalty;
      }
      await this.createInventoryReturn({
        orderId: gstInvoice.orderId || undefined,
        invoiceId: gstInvoice.id,
        itemId: returnItem.itemId,
        quantityShipped: returnItem.quantityShipped || returnItem.quantityReturned || 0,
        quantityReturned: returnItem.quantityReturned,
        conditionStatus: returnItem.conditionStatus,
        damageNotes: returnItem.damageNotes,
        penaltyAmount: String(penalty),
        checkedBy: returnItem.checkedBy || "Floor",
      });
      const restored = Number(returnItem.quantityReturned || 0);
      if (restored > 0) await this.updateInventoryStock(returnItem.itemId, restored);
      const shipped = Number(returnItem.quantityShipped || 0);
      const missing = Math.max(0, shipped - restored);
      if (returnItem.conditionStatus === "missing" && missing > 0) {
        const item = await this.getInventoryItem(returnItem.itemId);
        if (item) {
          await db
            .update(inventoryItems)
            .set({ totalStock: Math.max(0, item.totalStock - missing), updatedAt: new Date() })
            .where(eq(inventoryItems.id, item.id));
        }
      }
    }

    const rent = parseFloat(gstInvoice.rentAmount || "0") || parseFloat(gstInvoice.subtotal || "0");
    const returnedOn = String(returns[0]?.actualReturnDate || new Date().toISOString().slice(0, 10));
    const lateDays = Number(returns[0]?.lateDays);
    const late =
      Number.isFinite(lateDays) && lateDays > 0
        ? { extraDays: lateDays, extra: rent * 0.25 + rent * Math.max(0, lateDays - 1) }
        : lateReturnCharge(rent, gstInvoice.endDate, returnedOn);
    const totes = toteCharge(Number(returns[0]?.toteLost || 0));
    const packing = parseFloat(gstInvoice.packingAmount || "0") || 0;
    const transport = parseFloat(gstInvoice.transportAmount || "0") || 0;
    const mist = (parseFloat(gstInvoice.mistAmount || "0") || 0) + late.extra + totes;
    const discount = parseFloat(gstInvoice.discountAmount || "0") || 0;
    const breakageTotal = (parseFloat(gstInvoice.breakageAmount || "0") || 0) + breakage;
    const net = rent + packing + transport + mist - discount + breakageTotal;
    const gst = Math.round(net * 0.18 * 100) / 100;
    await this.updateInvoice(invoiceId, {
      mistAmount: String(mist),
      breakageAmount: String(breakageTotal),
      subtotal: String(net),
      gstAmount: String(gst),
      totalAmount: String(net + gst),
      returnDate: returnedOn,
      notes: [gstInvoice.notes, late.extraDays ? `Late ${late.extraDays}d` : "", totes ? `Tote ${totes}` : ""]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 500),
    });
    if (gstInvoice.orderId) await this.updateOrderStatus(gstInvoice.orderId, "returned");
    await this.syncInvoicePaidStatus(invoiceId);
    const updated = await this.getInvoice(invoiceId);
    return updated!;
  }

  async getInventoryReturns(orderId?: number): Promise<(InventoryReturn & { item: InventoryItem })[]> {
    try {
      const baseQuery = db
        .select({
          inventoryReturn: inventoryReturns,
          item: inventoryItems,
        })
        .from(inventoryReturns)
        .leftJoin(inventoryItems, eq(inventoryReturns.itemId, inventoryItems.id));

      const query = orderId 
        ? baseQuery.where(eq(inventoryReturns.orderId, orderId))
        : baseQuery;

      const results = await query.execute();
      
      return results.map(({ inventoryReturn, item }) => ({
        ...inventoryReturn,
        item: item!,
      }));
    } catch (error) {
      console.error('Error fetching inventory returns:', error);
      return [];
    }
  }

  async createInventoryReturn(returnData: InsertInventoryReturn): Promise<InventoryReturn> {
    try {
      const [created] = await db
        .insert(inventoryReturns)
        .values(returnData)
        .returning();

      await this.updateInventoryStock(returnData.itemId, returnData.quantityReturned);

      return created;
    } catch (error) {
      console.error('Error creating inventory return:', error);
      throw error;
    }
  }

  async updateInventoryReturn(id: number, returnData: Partial<InsertInventoryReturn>): Promise<InventoryReturn | undefined> {
    try {
      const [updated] = await db
        .update(inventoryReturns)
        .set(returnData)
        .where(eq(inventoryReturns.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating inventory return:', error);
      return undefined;
    }
  }

  async getAvailability(start: string, end: string) {
    const items = await this.getInventoryItems();
    const reservedRows = await db
      .select({
        itemId: orderItems.itemId,
        qty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          sql`${orders.status} not in ('returned', 'cancelled')`,
          lte(orders.startDate, end),
          gte(orders.endDate, start),
        ),
      )
      .groupBy(orderItems.itemId);

    const reservedMap = new Map(reservedRows.map((row) => [row.itemId, Number(row.qty)]));
    return items.map((item) => {
      const reserved = reservedMap.get(item.id) || 0;
      return {
        itemId: item.id,
        name: item.name,
        totalStock: item.totalStock,
        reserved,
        available: Math.max(0, item.totalStock - reserved),
      };
    });
  }

  async getEnquiries(): Promise<Enquiry[]> {
    return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
  }

  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    const [created] = await db.insert(enquiries).values(enquiry).returning();
    return created;
  }

  async updateEnquiryStatus(id: number, status: string): Promise<Enquiry | undefined> {
    const [updated] = await db
      .update(enquiries)
      .set({ status })
      .where(eq(enquiries.id, id))
      .returning();
    return updated;
  }

  async getPayments(invoiceId?: number): Promise<(Payment & { invoiceNumber: string; customerName: string })[]> {
    const rows = await db
      .select({
        payment: payments,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(invoiceId ? eq(payments.invoiceId, invoiceId) : sql`true`)
      .orderBy(desc(payments.paidOn));
    return rows.map((r) => ({ ...r.payment, invoiceNumber: r.invoiceNumber, customerName: r.customerName }));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [row] = await db.insert(payments).values({ ...data, kind: data.kind || "invoice" }).returning();
    await this.syncInvoicePaidStatus(row.invoiceId);
    return row;
  }

  async syncInvoicePaidStatus(invoiceId: number): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice || invoice.status === "void" || invoice.status === "converted") return;
    const rows = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    const toward = rows
      .filter((p) => isInvoicePaymentKind(p.kind))
      .reduce((s, p) => s + parseFloat(p.amount), 0);
    const total = parseFloat(invoice.totalAmount);
    let status = invoice.status || "sent";
    if (toward >= total - 1) status = "paid";
    else if (toward >= 1) status = "partial";
    else if (status === "paid" || status === "partial") status = "sent";
    if (status !== invoice.status) await this.updateInvoice(invoiceId, { status });
  }

  async voidInvoice(id: number): Promise<Invoice | undefined> {
    return this.updateInvoice(id, { status: "void" });
  }

  async createBillFromOrder(orderId: number): Promise<InvoiceWithCustomer> {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    const existing = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
    const live = existing.find((i) => i.invoiceType === "gst_invoice" && i.status !== "void");
    if (live) throw new Error(`GST ${live.invoiceNumber} already exists for this order`);
    const rent = parseFloat(order.totalAmount);
    const packing = Math.round(rent * 0.03 * 100) / 100;
    const net = rent + packing;
    const gst = Math.round(net * 0.18 * 100) / 100;
    const start = new Date(order.startDate);
    const end = new Date(order.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return this.createInvoice(
      {
        customerId: order.customerId,
        orderId: order.id,
        invoiceType: "gst_invoice",
        dispatchDate: order.startDate,
        startDate: order.startDate,
        endDate: order.endDate,
        returnDate: order.endDate,
        eventDetails: order.eventDetails || order.orderNumber,
        subtotal: String(net),
        gstRate: "18.00",
        gstAmount: String(gst),
        totalAmount: String(net + gst),
        rentAmount: String(rent),
        packingAmount: String(packing),
        status: "sent",
      } as InsertInvoice,
      order.items.map((item) => ({
        invoiceId: 0,
        itemId: item.itemId,
        quantity: item.quantity,
        ratePerDay: item.ratePerDay,
        days,
        lineTotal: item.totalAmount,
      })),
    );
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.spentOn));
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const [row] = await db.insert(expenses).values(data).returning();
    return row;
  }

  async getCashPositions(): Promise<CashPosition[]> {
    return db.select().from(cashPositions).orderBy(desc(cashPositions.asOf));
  }

  async upsertCashPosition(data: InsertCashPosition): Promise<CashPosition> {
    const existing = await db.select().from(cashPositions).where(eq(cashPositions.asOf, data.asOf));
    if (existing[0]) {
      const [row] = await db
        .update(cashPositions)
        .set({ bankAmount: data.bankAmount, cashAmount: data.cashAmount, notes: data.notes })
        .where(eq(cashPositions.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await db.insert(cashPositions).values(data).returning();
    return row;
  }

  async getFinanceSettings(): Promise<FinanceSettings> {
    const rows = await db.select().from(financeSettings).limit(1);
    if (rows[0]) return rows[0];
    const [created] = await db.insert(financeSettings).values({}).returning();
    return created;
  }

  async upsertFinanceSettings(data: Partial<InsertFinanceSettings>): Promise<FinanceSettings> {
    const current = await this.getFinanceSettings();
    const [row] = await db
      .update(financeSettings)
      .set({
        annualBudgetNet: data.annualBudgetNet ?? current.annualBudgetNet,
        samirName: data.samirName ?? current.samirName,
        karanName: data.karanName ?? current.karanName,
        samirShare: data.samirShare ?? current.samirShare,
        karanShare: data.karanShare ?? current.karanShare,
      })
      .where(eq(financeSettings.id, current.id))
      .returning();
    return row;
  }

  async getCapitalEntries(): Promise<CapitalEntry[]> {
    return db.select().from(capitalEntries).orderBy(desc(capitalEntries.occurredOn));
  }

  async createCapitalEntry(data: InsertCapitalEntry): Promise<CapitalEntry> {
    const [row] = await db.insert(capitalEntries).values(data).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();