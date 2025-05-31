export type OrderStatus = "pending" | "active" | "returned" | "overdue";
export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface OrderFormData {
  customerId: number;
  eventDate: string;
  startDate: string;
  endDate: string;
  eventDetails: string;
  items: {
    itemId: number;
    quantity: number;
    ratePerDay: string;
    totalAmount: string;
  }[];
  totalAmount: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  notes?: string;
}

export interface InventoryFormData {
  name: string;
  description?: string;
  category: string;
  totalStock: number;
  availableStock: number;
  ratePerDay: string;
}
