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

export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private inventoryItems: Map<number, InventoryItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private currentCustomerId: number;
  private currentInventoryId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;

  constructor() {
    this.customers = new Map();
    this.inventoryItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.currentCustomerId = 1;
    this.currentInventoryId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample customers
    const sampleCustomers = [
      { name: "Arjun Sharma", email: "arjun.sharma@gmail.com", phone: "+91 98765 43210", address: "12/A, Linking Road, Bandra West, Mumbai 400050", company: "Sharma Events & Weddings" },
      { name: "Priya Patel", email: "priya.patel@outlook.com", phone: "+91 97654 32109", address: "304, Hiranandani Gardens, Powai, Mumbai 400076", company: "Patel Catering Services" },
      { name: "Rajesh Gupta", email: "rajesh.gupta@yahoo.com", phone: "+91 96543 21098", address: "45, Carter Road, Bandra West, Mumbai 400050", company: null },
    ];

    sampleCustomers.forEach(customer => {
      const id = this.currentCustomerId++;
      this.customers.set(id, { id, ...customer, notes: null });
    });

    // Sample inventory items
    const sampleItems = [
      { name: "Dinner Plates (White)", description: "10.5 inch ceramic plates", category: "Plates", totalStock: 50, availableStock: 15, ratePerDay: "25.00" },
      { name: "Wine Glasses", description: "Crystal wine glasses", category: "Glassware", totalStock: 24, availableStock: 2, ratePerDay: "15.00" },
      { name: "Table Linens", description: "White cotton tablecloths", category: "Linens", totalStock: 30, availableStock: 18, ratePerDay: "80.00" },
      { name: "Salad Plates", description: "8 inch ceramic plates", category: "Plates", totalStock: 40, availableStock: 25, ratePerDay: "20.00" },
      { name: "Champagne Flutes", description: "Crystal champagne glasses", category: "Glassware", totalStock: 36, availableStock: 12, ratePerDay: "12.00" },
    ];

    sampleItems.forEach(item => {
      const id = this.currentInventoryId++;
      this.inventoryItems.set(id, { id, ...item });
    });

    // Sample orders
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const sampleOrders = [
      { 
        customerId: 1, 
        orderNumber: "ORD-001",
        eventDate: nextWeek.toISOString().split('T')[0], 
        startDate: new Date(nextWeek.getTime() - 86400000).toISOString().split('T')[0],
        endDate: new Date(nextWeek.getTime() + 86400000).toISOString().split('T')[0],
        eventDetails: "Wedding reception for 100 guests",
        status: "active",
        totalAmount: "4500.00",
        createdAt: new Date()
      },
      { 
        customerId: 2, 
        orderNumber: "ORD-002",
        eventDate: tomorrow.toISOString().split('T')[0], 
        startDate: today.toISOString().split('T')[0],
        endDate: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
        eventDetails: "Corporate lunch event",
        status: "pending",
        totalAmount: "2750.00",
        createdAt: new Date()
      },
    ];

    sampleOrders.forEach(order => {
      const id = this.currentOrderId++;
      this.orders.set(id, { id, ...order });
    });
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentCustomerId++;
    const newCustomer: Customer = { id, ...customer };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...customer };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.currentInventoryId++;
    const newItem: InventoryItem = { id, ...item };
    this.inventoryItems.set(id, newItem);
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const existing = this.inventoryItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...item };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.inventoryItems.delete(id);
  }

  async getOrders(): Promise<OrderWithCustomer[]> {
    const orders = Array.from(this.orders.values());
    const ordersWithCustomers: OrderWithCustomer[] = [];

    for (const order of orders) {
      const customer = this.customers.get(order.customerId);
      if (customer) {
        const items = await this.getOrderItems(order.id);
        ordersWithCustomers.push({
          ...order,
          customer,
          items
        });
      }
    }

    return ordersWithCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrder(id: number): Promise<OrderWithCustomer | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const customer = this.customers.get(order.customerId);
    if (!customer) return undefined;

    const items = await this.getOrderItems(order.id);
    return {
      ...order,
      customer,
      items
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithCustomer> {
    const id = this.currentOrderId++;
    const orderNumber = `ORD-${String(id).padStart(3, '0')}`;
    
    const newOrder: Order = {
      id,
      orderNumber,
      createdAt: new Date(),
      ...order
    };
    
    this.orders.set(id, newOrder);

    // Create order items
    for (const item of items) {
      const orderItemId = this.currentOrderItemId++;
      this.orderItems.set(orderItemId, {
        id: orderItemId,
        orderId: id,
        ...item
      });

      // Update inventory stock
      await this.updateInventoryStock(item.itemId, -item.quantity);
    }

    const customer = this.customers.get(order.customerId)!;
    const orderItemsWithItems = await this.getOrderItems(id);

    return {
      ...newOrder,
      customer,
      items: orderItemsWithItems
    };
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...order };
    this.orders.set(id, updated);
    return updated;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, status };
    this.orders.set(id, updated);
    
    // If returning items, update inventory
    if (status === "returned") {
      const items = Array.from(this.orderItems.values()).filter(item => item.orderId === id);
      for (const item of items) {
        await this.updateInventoryStock(item.itemId, item.quantity);
      }
    }
    
    return updated;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const order = this.orders.get(id);
    if (!order) return false;

    // Delete order items and restore inventory
    const items = Array.from(this.orderItems.values()).filter(item => item.orderId === id);
    for (const item of items) {
      if (order.status !== "returned") {
        await this.updateInventoryStock(item.itemId, item.quantity);
      }
      this.orderItems.delete(item.id);
    }

    return this.orders.delete(id);
  }

  async getOrderItems(orderId: number): Promise<(OrderItem & { item: InventoryItem })[]> {
    const items = Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
    const itemsWithInventory: (OrderItem & { item: InventoryItem })[] = [];

    for (const orderItem of items) {
      const inventoryItem = this.inventoryItems.get(orderItem.itemId);
      if (inventoryItem) {
        itemsWithInventory.push({
          ...orderItem,
          item: inventoryItem
        });
      }
    }

    return itemsWithInventory;
  }

  async addOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.currentOrderItemId++;
    const newOrderItem: OrderItem = { id, ...orderItem };
    this.orderItems.set(id, newOrderItem);
    
    // Update inventory stock
    await this.updateInventoryStock(orderItem.itemId, -orderItem.quantity);
    
    return newOrderItem;
  }

  async updateOrderItem(id: number, orderItem: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    const existing = this.orderItems.get(id);
    if (!existing) return undefined;
    
    // If quantity changed, update inventory
    if (orderItem.quantity !== undefined && orderItem.quantity !== existing.quantity) {
      const quantityDiff = existing.quantity - orderItem.quantity;
      await this.updateInventoryStock(existing.itemId, quantityDiff);
    }
    
    const updated = { ...existing, ...orderItem };
    this.orderItems.set(id, updated);
    return updated;
  }

  async deleteOrderItem(id: number): Promise<boolean> {
    const orderItem = this.orderItems.get(id);
    if (!orderItem) return false;
    
    // Restore inventory stock
    await this.updateInventoryStock(orderItem.itemId, orderItem.quantity);
    
    return this.orderItems.delete(id);
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const orders = Array.from(this.orders.values());
    const items = Array.from(this.inventoryItems.values());
    
    const activeOrders = orders.filter(order => order.status === "active").length;
    const itemsOut = items.reduce((sum, item) => sum + (item.totalStock - item.availableStock), 0);
    
    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = orders
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    
    // Check for overdue items
    const today = new Date().toISOString().split('T')[0];
    const overdueOrders = orders.filter(order => order.status === "active" && order.endDate < today);
    const overdueItems = overdueOrders.reduce((sum, order) => {
      const orderItems = Array.from(this.orderItems.values()).filter(item => item.orderId === order.id);
      return sum + orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    return {
      activeOrders,
      itemsOut,
      monthlyRevenue: `₹${monthlyRevenue.toFixed(2)}`,
      overdueItems
    };
  }

  async updateInventoryStock(itemId: number, quantityChange: number): Promise<InventoryItem | undefined> {
    const item = this.inventoryItems.get(itemId);
    if (!item) return undefined;
    
    const newAvailableStock = item.availableStock + quantityChange;
    if (newAvailableStock < 0 || newAvailableStock > item.totalStock) {
      throw new Error("Invalid stock update: would result in negative or excess stock");
    }
    
    const updated = { ...item, availableStock: newAvailableStock };
    this.inventoryItems.set(itemId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
