import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSwitchFinance } from "./finance";
import { insertCustomerSchema, insertEnquirySchema, insertExpenseSchema, insertInventoryItemSchema, insertOrderSchema, insertOrderItemSchema, insertPaymentSchema, insertCashPositionSchema, insertCapitalEntrySchema, insertFinanceSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/enquiries", async (req, res) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(req.body || {}).map(([key, value]) => [key, value === "" ? undefined : value]),
      );
      const parsed = insertEnquirySchema.parse(cleaned);
      const enquiry = await storage.createEnquiry(parsed);
      res.status(201).json(enquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid enquiry", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save enquiry" });
    }
  });

  app.get("/api/enquiries", async (_req, res) => {
    try {
      res.json(await storage.getEnquiries());
    } catch {
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  app.patch("/api/enquiries/:id", async (req, res) => {
    try {
      const updated = await storage.updateEnquiryStatus(parseInt(req.params.id), String(req.body?.status || "contacted"));
      if (!updated) return res.status(404).json({ message: "Enquiry not found" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update enquiry" });
    }
  });

  app.post("/api/ops/bootstrap", async (_req, res) => {
    try {
      res.json(await storage.bootstrapOps());
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load catalogue and clients" });
    }
  });

  app.get("/api/inventory/availability", async (req, res) => {
    try {
      const start = String(req.query.start || "");
      const end = String(req.query.end || "");
      if (!start || !end) {
        return res.status(400).json({ message: "start and end dates are required" });
      }
      res.json(await storage.getAvailability(start, end));
    } catch {
      res.status(500).json({ message: "Failed to check availability" });
    }
  });
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

  const createOrderItemSchema = insertOrderItemSchema.omit({ orderId: true });
  
  const createOrderSchema = z.object({
    order: insertOrderSchema,
    items: z.array(createOrderItemSchema)
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { order: orderData, items: itemsData } = createOrderSchema.parse(req.body);

      for (const item of itemsData) {
        const inventoryItem = await storage.getInventoryItem(item.itemId);
        if (!inventoryItem) {
          return res.status(400).json({ message: `Inventory item ${item.itemId} not found` });
        }
      }

      const order = await storage.createOrder(orderData, itemsData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("already booked")) {
        return res.status(400).json({ message: error.message });
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

  app.post("/api/orders/:id/bill", async (req, res) => {
    try {
      const invoice = await storage.createBillFromOrder(parseInt(req.params.id));
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to raise GST bill" });
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

  app.post("/api/invoices/:id/void", async (req, res) => {
    try {
      const invoice = await storage.voidInvoice(parseInt(req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch {
      res.status(500).json({ message: "Failed to void invoice" });
    }
  });

  app.post("/api/invoices/:id/void", async (req, res) => {
    try {
      const invoice = await storage.voidInvoice(parseInt(req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch {
      res.status(500).json({ message: "Failed to void invoice" });
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
      const extra = {
        lateDays: req.body.lateDays,
        toteLost: req.body.toteLost,
        actualReturnDate: req.body.actualReturnDate,
      };
      const returns = (req.body.returns || []).map((row: Record<string, unknown>, i: number) =>
        i === 0 ? { ...row, ...extra } : row,
      );
      res.json(await storage.processReturnsAndCreateFinalInvoice(invoiceId, returns));
    } catch (error) {
      console.error("Return processing error:", error);
      res.status(500).json({ message: "Failed to process returns" });
    }
  });

  app.get("/api/finance", async (_req, res) => {
    try {
      res.json(await getSwitchFinance());
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load finance" });
    }
  });

  app.get("/api/payments", async (req, res) => {
    try {
      const invoiceId = req.query.invoiceId ? parseInt(String(req.query.invoiceId)) : undefined;
      res.json(await storage.getPayments(invoiceId));
    } catch {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const parsed = insertPaymentSchema.parse(req.body);
      res.status(201).json(await storage.createPayment(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payment", errors: error.errors });
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  app.get("/api/expenses", async (_req, res) => {
    try {
      res.json(await storage.getExpenses());
    } catch {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const parsed = insertExpenseSchema.parse(req.body);
      res.status(201).json(await storage.createExpense(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid expense", errors: error.errors });
      res.status(500).json({ message: "Failed to record expense" });
    }
  });

  app.get("/api/cash-positions", async (_req, res) => {
    try {
      res.json(await storage.getCashPositions());
    } catch {
      res.status(500).json({ message: "Failed to fetch cash positions" });
    }
  });

  app.post("/api/cash-positions", async (req, res) => {
    try {
      const parsed = insertCashPositionSchema.parse(req.body);
      res.status(201).json(await storage.upsertCashPosition(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid cash position", errors: error.errors });
      res.status(500).json({ message: "Failed to save cash position" });
    }
  });

  app.get("/api/finance-settings", async (_req, res) => {
    try {
      res.json(await storage.getFinanceSettings());
    } catch {
      res.status(500).json({ message: "Failed to fetch finance settings" });
    }
  });

  app.post("/api/finance-settings", async (req, res) => {
    try {
      const parsed = insertFinanceSettingsSchema.partial().parse(req.body);
      res.json(await storage.upsertFinanceSettings(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid settings", errors: error.errors });
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  app.get("/api/capital-entries", async (_req, res) => {
    try {
      res.json(await storage.getCapitalEntries());
    } catch {
      res.status(500).json({ message: "Failed to fetch capital entries" });
    }
  });

  app.post("/api/capital-entries", async (req, res) => {
    try {
      const parsed = insertCapitalEntrySchema.parse(req.body);
      res.status(201).json(await storage.createCapitalEntry(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid capital entry", errors: error.errors });
      res.status(500).json({ message: "Failed to record capital" });
    }
  });

  app.post("/api/rental-bills", async (req, res) => {
    try {
      const itemsCatalog = await storage.getInventoryItems();
      const hireItem = itemsCatalog[0];
      if (!hireItem) return res.status(400).json({ message: "Add at least one inventory item first" });
      const rent = Number(req.body.rentAmount || 0);
      const packing = Number(req.body.packingAmount ?? Math.round(rent * 0.03 * 100) / 100);
      const transport = Number(req.body.transportAmount || 0);
      const mist = Number(req.body.mistAmount || 0);
      const discount = Number(req.body.discountAmount || 0);
      const breakage = Number(req.body.breakageAmount || 0);
      const deposit = Number(req.body.depositAmount || 0);
      const net = rent + packing + transport + mist - discount + breakage;
      const gst = Math.round(net * 0.18 * 100) / 100;
      const dispatchDate = req.body.dispatchDate || req.body.startDate;
      const endDate = req.body.endDate || req.body.startDate;
      const invoice = await storage.createInvoice(
        {
          customerId: Number(req.body.customerId),
          orderId: req.body.orderId ? Number(req.body.orderId) : undefined,
          invoiceType: "gst_invoice",
          dispatchDate,
          startDate: req.body.startDate,
          endDate,
          returnDate: req.body.returnDate || endDate,
          eventDetails: req.body.eventDetails || "Crockery hire",
          subtotal: String(net),
          gstRate: "18.00",
          gstAmount: String(gst),
          totalAmount: String(net + gst),
          depositAmount: String(deposit),
          rentAmount: String(rent),
          packingAmount: String(packing),
          transportAmount: String(transport),
          mistAmount: String(mist),
          discountAmount: String(discount),
          breakageAmount: String(breakage),
          status: "sent",
          notes: req.body.notes,
          invoiceNumber: req.body.invoiceNumber || undefined,
        } as any,
        [
          {
            itemId: hireItem.id,
            quantity: 1,
            ratePerDay: String(rent),
            days: 1,
            lineTotal: String(net),
          },
        ],
      );
      res.status(201).json(invoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create rental bill" });
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
