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
    "Goods will be checked on collection by customer to ensure count and condition, and re-checked on return for damages / loss / breakages.",
    "Damages / loss / breakages will be charged as per the breakage price listed on the proforma invoice.",
    "Customer must sign the delivery chalan on accepting the goods.",
    "All goods must be returned the following day between 11am and 2pm. After that: 25% extra hire till 6pm, then 100% extra hire per day.",
    "Goods are packed in tote boxes at no extra rent. Lost or damaged tote: INR 1,850 per box.",
    "Products are owned by Switch Rental Services LLP and are for rental only, not sale.",
    "Delivery if needed is an extra charge, based on distance.",
    "Rinse all products clean before return.",
    "GST of 18% is charged on rental and breakage billing.",
  ],
};

export function invoiceNet(rent: number, packing = 0, transport = 0, mist = 0, discount = 0, breakage = 0) {
  return rent + packing + transport + mist - discount + breakage;
}

export function packingOnRent(rent: number) {
  return Math.round(rent * billing.packingRate * 100) / 100;
}
