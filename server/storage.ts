import { 
  customers, 
  inventoryItems, 
  orders, 
  orderItems,
  type Customer, 
  type InsertCustomer,
  type InventoryItem,
  type InsertInventoryItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithCustomer,
  type DashboardMetrics
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
    const [newOrder] = await db.insert(orders).values({
      customerId: order.customerId,
      orderNumber: order.orderNumber,
      eventDate: order.eventDate,
      startDate: order.startDate,
      endDate: order.endDate,
      eventDetails: order.eventDetails || null,
      status: order.status || "pending",
      totalAmount: order.totalAmount,
      createdAt: order.createdAt || new Date()
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

    return {
      activeOrders: activeOrdersResult.count || 0,
      itemsOut: totalItemsOut.total || 0,
      monthlyRevenue: monthlyRevenueResult.revenue || "0.00",
      overdueItems: overdueItemsResult.count || 0,
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
}

export const storage = new DatabaseStorage();