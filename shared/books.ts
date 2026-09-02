export const COST_GROUPS = [
  { id: "fixed", label: "Fixed (rent, salary, utilities)" },
  { id: "ops", label: "Operations (packing supplies, delivery)" },
  { id: "admin", label: "Admin (CA, BMC, marketing)" },
  { id: "nonctrl", label: "Other (AMC, bank, interest)" },
  { id: "capex", label: "Capex (new crockery / assets)" },
] as const;

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
  fixed: ["Rent with TDS", "Salary", "Electricity & water", "Insurance", "Petty cash", "Internet"],
  ops: ["OPS supply", "Transport"],
  admin: ["CA, Fire, BMC, GST filing", "CCG breakage (unpaid)", "Business development", "Client refunds"],
  nonctrl: ["Bank charges", "CAM / society", "AMC", "Interest on capex"],
  capex: ["New CCG purchase"],
};

export { PAYMENT_KINDS } from "./hire";

export const PAYMENT_METHODS = [
  { id: "bank", label: "Company bank / NEFT" },
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "tds", label: "TDS withheld by client" },
] as const;

export const CAPITAL_KINDS = [
  { id: "contribution", label: "Capital in (partner puts money)" },
  { id: "draw", label: "Draw / distribution" },
] as const;

export const PARTNERS = [
  { id: "samir", label: "Samir Chhabria" },
  { id: "karan", label: "Karan Khiani" },
] as const;
