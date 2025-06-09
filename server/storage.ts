import { 
  customers, 
  inventoryItems, 
  orders, 
  orderItems,
  invoices,
  invoiceItems,
  inventoryReturns,
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
  type InsertInventoryReturn
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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
      description: item.description || null
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
      .innerJoin(customers, eq(orders.customerId, customers.id));

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
    
    // Insert order items
    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });
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
    // Delete order items first
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
          totalStock: inventoryItems.totalStock,
          availableStock: inventoryItems.availableStock,
          ratePerDay: inventoryItems.ratePerDay,
          maintenanceStatus: inventoryItems.maintenanceStatus,
          replacementCost: inventoryItems.replacementCost,
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
      .where(sql`${orders.endDate} < current_date AND ${orders.status} = 'active'`);

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
      activeOrders: activeOrdersResult.count || 0,
      itemsOut: totalItemsOut.total || 0,
      monthlyRevenue: monthlyRevenueResult.revenue || "0.00",
      overdueItems: overdueItemsResult.count || 0,
      pendingQuotes,
      damageReports: damageReportsCount,
    };
  }

  async updateInventoryStock(itemId: number, quantityChange: number): Promise<InventoryItem | undefined> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({
        availableStock: sql`${inventoryItems.availableStock} + ${quantityChange}`
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
      
      const invoiceNumber = `${typePrefix}-${String(count[0].count + 1).padStart(4, '0')}`;

      const [createdInvoice] = await db
        .insert(invoices)
        .values({
          ...invoice,
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
    try {
      // Get the original GST invoice
      const gstInvoice = await this.getInvoice(invoiceId);
      if (!gstInvoice) {
        throw new Error("GST Invoice not found");
      }

      // Calculate penalty amounts for damaged/missing items
      let totalPenaltyAmount = 0;
      const penaltyItems: any[] = [];

      for (const returnItem of returns) {
        if (returnItem.conditionStatus === 'damaged' || returnItem.conditionStatus === 'missing') {
          const penaltyAmount = parseFloat(returnItem.penaltyAmount || '0');
          totalPenaltyAmount += penaltyAmount;
          
          if (penaltyAmount > 0) {
            penaltyItems.push({
              itemId: returnItem.itemId,
              quantity: returnItem.quantityDamaged || returnItem.quantityMissing || 1,
              ratePerDay: penaltyAmount.toFixed(2),
              days: 1,
              lineTotal: penaltyAmount.toFixed(2)
            });
          }
        }
        
        // Create inventory return record
        await this.createInventoryReturn({
          orderId: gstInvoice.orderId || 0,
          itemId: returnItem.itemId,
          quantityShipped: returnItem.quantityShipped,
          quantityReturned: returnItem.quantityReturned,
          conditionStatus: returnItem.conditionStatus,
          damageNotes: returnItem.damageNotes,
          penaltyAmount: returnItem.penaltyAmount || '0',
          checkedBy: returnItem.checkedBy || 'System',
          // returnDate field removed as it doesn't exist in schema
        });
      }

      // Create final invoice with penalty charges
      const finalInvoiceData: InsertInvoice = {
        customerId: gstInvoice.customerId,
        quoteId: gstInvoice.quoteId,
        invoiceType: 'final_invoice',
        dispatchDate: gstInvoice.dispatchDate,
        startDate: gstInvoice.startDate,
        endDate: gstInvoice.endDate,
        eventDetails: `${gstInvoice.eventDetails} - Final Settlement with Return Processing`,
        subtotal: totalPenaltyAmount.toFixed(2),
        gstRate: '18',
        gstAmount: (totalPenaltyAmount * 0.18).toFixed(2),
        totalAmount: (totalPenaltyAmount * 1.18).toFixed(2),
        status: 'sent',
        terms: 'Final settlement invoice. Penalties applied for damaged/missing items as per rental agreement.',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const finalInvoiceItems = penaltyItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        ratePerDay: item.ratePerDay,
        days: item.days,
        lineTotal: item.lineTotal,
        invoiceId: 0 // Will be set by createInvoice
      }));

      const finalInvoice = await this.createInvoice(finalInvoiceData, finalInvoiceItems);

      // Update GST invoice status to completed
      await this.updateInvoice(invoiceId, { status: 'completed' });

      return finalInvoice;
    } catch (error) {
      console.error('Error processing returns and creating final invoice:', error);
      throw error;
    }
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
}

export const storage = new DatabaseStorage();