import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type Line = {
  id: number;
  sku: string;
  name: string;
  qty: number;
  purchaseCost: number;
  purchaseGstRate: number;
  gstPaidOnBuy: number;
  breakagePrice: number;
  stockAtCost: number;
  breakageValue: number;
  rentRecovered: number;
  breakageRecovered: number;
  remainingValue: number;
  ratePerDay: number;
};

type InventoryValue = {
  story: {
    pieces: number;
    stockAtCost: number;
    gstPaidOnBuy: number;
    breakageValue: number;
    breakageGst: number;
    rentRecovered: number;
    breakageRecovered: number;
    remainingValue: number;
  };
  breakageGstRate: number;
  lines: Line[];
};

export default function StockValue() {
  const { data, isLoading } = useQuery<InventoryValue>({ queryKey: ["/api/inventory-value"] });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Stock value" subtitle="Working out what the crockery is still worth…" />
      </div>
    );
  }

  const s = data.story;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Stock value"
        subtitle="Buy cost, GST paid on purchase, hire recovered, and what is still tied up in pieces on hand."
      />

      <div className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Example: a plate bought for ₹100, hired at ₹10 a day for five days, then broken. Hire has already
          returned ₹50 of the ₹100. Breakage billed to the client is about 125% of buy (₹125), and GST on that
          breakage is always 18% — even if the plate was bought with 5% GST. Remaining value of a SKU is{" "}
          <span className="text-foreground font-medium">pieces on hand × buy cost − hire recovered on GST bills</span>
          . Once hire has paid the pile back, remaining is ₹0 even if plates are still on the shelf. Set buy cost
          and purchase GST on each piece in{" "}
          <Link href="/inventory" className="underline text-foreground font-medium">
            Catalogue
          </Link>
          . If buy cost is blank, it is taken as breakage ÷ 1.25.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pieces on hand</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{s.pieces.toLocaleString("en-IN")}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">From catalogue total stock</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock at buy cost</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{formatINR(s.stockAtCost)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Ex-GST. What you paid the supplier.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>GST paid on buys</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{formatINR(s.gstPaidOnBuy)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">5% or 18% as set on each SKU. Memo only.</CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription>Remaining stock value</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{formatINR(s.remainingValue)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Buy cost of stock minus hire already recovered.</CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Breakage list of stock</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatINR(s.breakageValue)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Usually 125% of buy. GST at {Math.round(data.breakageGstRate * 100)}% would be{" "}
              {formatINR(s.breakageGst)} if the whole pile were billed as breakage.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Hire recovered</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatINR(s.rentRecovered)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Line totals on GST / final invoices, by SKU.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Breakage collected</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatINR(s.breakageRecovered)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Penalties from returns. Extra to hire — not mixed into remaining value.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>By piece</CardTitle>
              <CardDescription>Buy GST is 5% or 18%. Breakage GST billed to clients is always 18%.</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="outline" size="sm">
                Edit buy cost in catalogue
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium text-right">Qty</th>
                  <th className="py-2 pr-3 font-medium text-right">Buy</th>
                  <th className="py-2 pr-3 font-medium text-right">Buy GST</th>
                  <th className="py-2 pr-3 font-medium text-right">GST on buys</th>
                  <th className="py-2 pr-3 font-medium text-right">Breakage</th>
                  <th className="py-2 pr-3 font-medium text-right">Stock at cost</th>
                  <th className="py-2 pr-3 font-medium text-right">Hire recovered</th>
                  <th className="py-2 pr-3 font-medium text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-primary whitespace-nowrap">{row.sku}</td>
                    <td className="py-2.5 pr-3">{row.name}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.qty}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(row.purchaseCost)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.purchaseGstRate}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(row.gstPaidOnBuy)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(row.breakagePrice)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(row.stockAtCost)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(row.rentRecovered)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{formatINR(row.remainingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
