import { TOTE_BOX_CHARGE } from "@shared/hire";

export const billing = {
  gstin: "27AFHFS2025K1ZV",
  hsn: "997323",
  packingRate: 0.03,
  gstRate: 0.18,
  toteBoxCharge: TOTE_BOX_CHARGE,
  bank: {
    name: "ICICI, Colaba Branch",
    accountName: "Switch Rental Services LLP",
    accountNo: "104305003604",
    ifsc: "ICIC0001043",
  },
  terms: [
    "All pricing is for individual pieces & per day rental only.",
    "Goods will be checked on collection by customer to ensure count and condition, and re-checked on return from customer for damages / loss / breakages.",
    "In the event of goods damages / loss / breakages the same will be charged to customer as per the breakage price listed on Proforma invoice.",
    "Customer must sign delivery chalan on accepting the goods; this will ensure that the product is accepted in proper condition and count.",
    "All goods must be returned by the customer following day between 11am to 2pm max. If goods are returned post this time, there will be 25% added rental charge till 6pm and post that 100% extra rental charge per day.",
    "All goods & products will be packed in tote boxes with no extra rent for the box. If the event box is damaged or lost, there will be a charge of INR 1,850 per box.",
    "All products / goods are owned by Switch Rental Services LLP and only for rental purposes, not sale.",
    "Delivery if needed will be at an extra charge, based on distance.",
    "On return all products / goods are required to be rinsed clean before returning.",
    "GST of 18% will be charged for all service on the rental & Breakage billing.",
  ],
};

export function invoiceNet(rent: number, packing = 0, transport = 0, mist = 0, discount = 0, breakage = 0) {
  return rent + packing + transport + mist - discount + breakage;
}

export function packingOnRent(rent: number) {
  return Math.round(rent * billing.packingRate * 100) / 100;
}
