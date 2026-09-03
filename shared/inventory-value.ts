/** Purchase vs hire vs breakage for a piece of crockery. */

export const BREAKAGE_MARKUP = 1.25;
export const BREAKAGE_GST_RATE = 0.18;

export function round2(n: number) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function breakageFromPurchase(purchaseExGst: number) {
  return round2(purchaseExGst * BREAKAGE_MARKUP);
}

export function purchaseFromBreakage(breakageExGst: number) {
  if (breakageExGst <= 0) return 0;
  return round2(breakageExGst / BREAKAGE_MARKUP);
}

export function purchaseGstAmount(purchaseExGst: number, gstPct: number) {
  return round2(purchaseExGst * (gstPct / 100));
}

export function breakageGstAmount(breakageExGst: number) {
  return round2(breakageExGst * BREAKAGE_GST_RATE);
}

/** What is still tied up in remaining pieces after rent has paid down the pile. */
export function remainingStockValue(stockAtCost: number, rentRecovered: number) {
  return round2(Math.max(0, stockAtCost - rentRecovered));
}
