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
  admin: [
    "CA, Fire, BMC, GST filing",
    "CCG breakage (unpaid)",
    "Business development",
    "Client refunds",
    "Food & beverages",
  ],
  nonctrl: ["Bank charges", "CAM / society", "AMC", "Interest on capex"],
  capex: ["New CCG purchase", "Opening CCG stock", "Mill setup", "Refund to Samir"],
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

/** Excel Forecast P&L tabs → live mill books. */
export const WORKBOOK_CENTERS = [
  {
    id: "rent",
    label: "Mill rent",
    excel: "Rent",
    group: "fixed",
    category: "Rent with TDS",
    livesOn: "Money → Running costs · Books → Operating expense",
    meaning:
      "Gupta Mills rent, TDS, GST on rent, and the TDS filing fee. This is a fixed cost. It reduces profit every month it is paid.",
  },
  {
    id: "salary",
    label: "Salary",
    excel: "Salary",
    group: "fixed",
    category: "Salary",
    livesOn: "Money → Running costs · Books → Operating expense",
    meaning: "Floor and partner salaries, advances, bonus. Paid from the mill, not from hire invoices.",
  },
  {
    id: "utilities",
    label: "Electricity & water",
    excel: "Eletricity & Water",
    group: "fixed",
    category: "Electricity & water",
    livesOn: "Money → Running costs",
    meaning: "BEST / water bills for the mill.",
  },
  {
    id: "petty",
    label: "Petty cash",
    excel: "Petty cash",
    group: "fixed",
    category: "Petty cash",
    livesOn: "Money → Running costs",
    meaning: "Staff water, pooja, dog food, small transport, ChatGPT, stationery — the cash box, not the ICICI account.",
  },
  {
    id: "internet",
    label: "Internet & Google",
    excel: "internet",
    group: "fixed",
    category: "Internet",
    livesOn: "Money → Running costs",
    meaning: "Jio / mill internet and the company Gmail Workspace bill.",
  },
  {
    id: "ops-supply",
    label: "OPS supply",
    excel: "OPS Supply",
    group: "ops",
    category: "OPS supply",
    livesOn: "Money → Running costs",
    meaning: "Packing wrap, dishwasher liquid, pest control, mill repairs, daily manpower.",
  },
  {
    id: "transport",
    label: "Transport",
    excel: "Transport",
    group: "ops",
    category: "Transport",
    livesOn: "Money → Running costs",
    meaning: "Van for purchases or client delivery. Not packing on the hire bill.",
  },
  {
    id: "ca-bmc",
    label: "CA, GST, Fire, BMC",
    excel: "CA, Client refund, Fire, BMC",
    group: "admin",
    category: "CA, Fire, BMC, GST filing",
    livesOn: "Money → Running costs",
    meaning: "Accountant, yearly books, GST filing, chanda. Compliance, not hire.",
  },
  {
    id: "bd-fnb",
    label: "Business development",
    excel: "Business Dev F&B",
    group: "admin",
    category: "Business development",
    livesOn: "Money → Running costs",
    meaning: "Client lunches, T-shirts, social media, shoots.",
  },
  {
    id: "refund-clients",
    label: "Client refunds",
    excel: "Refund to clients",
    group: "admin",
    category: "Client refunds",
    livesOn: "Money → Running costs · Books → Deposit if it is a security refund",
    meaning:
      "Cash back to a client after an event. If it is a security deposit, use Books → Deposit refund instead — that is not an expense.",
  },
  {
    id: "amc",
    label: "AMC",
    excel: "AMC",
    group: "nonctrl",
    category: "AMC",
    livesOn: "Money → Running costs",
    meaning: "Annual maintenance: AC, dishwasher, RO. Empty in the spreadsheet until a contract is paid.",
  },
  {
    id: "new-ccg",
    label: "New crockery (this year)",
    excel: "New purchase CCG",
    group: "capex",
    category: "New CCG purchase",
    livesOn: "Money → Partner money vs crockery · Stock value",
    meaning:
      "Amazon, Harbour, Nestasia, Nirman and the rest. This is stock, not profit. It sits in capex and in remaining stock value.",
  },
  {
    id: "capex",
    label: "Opening crockery",
    excel: "CapEx",
    group: "capex",
    category: "Opening CCG stock",
    livesOn: "Money → Partner money vs crockery · Stock value",
    meaning:
      "Crockery already bought (Harbour, Thanor, Nirman, Manekia, Neeti). Partner capital funded it. Civil / legal mill fit-out stays on the CapEx sheet as history, not this year’s profit.",
  },
] as const;
