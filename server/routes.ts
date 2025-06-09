import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInventoryItemSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if email already exists
      const existingCustomer = await storage.getCustomerByEmail(customerData.email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      
      const customer = await storage.updateCustomer(id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      
      const item = await storage.updateInventoryItem(id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteInventoryItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  const createOrderSchema = z.object({
    order: insertOrderSchema,
    items: z.array(insertOrderItemSchema)
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { order: orderData, items: itemsData } = createOrderSchema.parse(req.body);
      
      // Validate that all items exist and have sufficient stock
      for (const item of itemsData) {
        const inventoryItem = await storage.getInventoryItem(item.itemId);
        if (!inventoryItem) {
          return res.status(400).json({ message: `Inventory item ${item.itemId} not found` });
        }
        if (inventoryItem.availableStock < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.availableStock}, Requested: ${item.quantity}` 
          });
        }
      }
      
      const order = await storage.createOrder(orderData, itemsData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orderData = insertOrderSchema.partial().parse(req.body);
      
      const order = await storage.updateOrder(id, orderData);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.string() }).parse(req.body);
      
      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrder(id);
      if (!deleted) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const type = req.query.type as string;
      const invoices = await storage.getInvoices(type);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { invoice, items } = req.body;
      
      const createdInvoice = await storage.createInvoice(invoice, items);
      res.status(201).json(createdInvoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.post("/api/invoices/:id/convert", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { invoiceType } = req.body;
      
      const convertedInvoice = await storage.convertQuoteToInvoice(quoteId, invoiceType);
      res.json(convertedInvoice);
    } catch (error) {
      console.error("Invoice conversion error:", error);
      res.status(500).json({ message: "Failed to convert invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoiceData = req.body;
      
      const invoice = await storage.updateInvoice(id, invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Inventory Returns routes
  app.get("/api/inventory-returns", async (req, res) => {
    try {
      const orderId = req.query.orderId ? parseInt(req.query.orderId as string) : undefined;
      const returns = await storage.getInventoryReturns(orderId);
      res.json(returns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory returns" });
    }
  });

  app.post("/api/inventory-returns", async (req, res) => {
    try {
      const returnData = req.body;
      const inventoryReturn = await storage.createInventoryReturn(returnData);
      res.status(201).json(inventoryReturn);
    } catch (error) {
      console.error("Return creation error:", error);
      res.status(500).json({ message: "Failed to create inventory return" });
    }
  });

  app.put("/api/inventory-returns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const returnData = req.body;
      
      const inventoryReturn = await storage.updateInventoryReturn(id, returnData);
      if (!inventoryReturn) {
        return res.status(404).json({ message: "Inventory return not found" });
      }
      
      res.json(inventoryReturn);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory return" });
    }
  });

  // Return Challan Processing
  app.post("/api/invoices/:id/process-returns", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { returns } = req.body;
      
      // Process each return and create final settlement invoice
      const finalInvoice = await storage.processReturnsAndCreateFinalInvoice(invoiceId, returns);
      res.json(finalInvoice);
    } catch (error) {
      console.error("Return processing error:", error);
      res.status(500).json({ message: "Failed to process returns" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
