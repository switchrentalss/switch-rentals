import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/format";
import { Link } from "wouter";

type Sheet = {
  id: string;
  excelName: string;
  label: string;
  group: string | null;
  grid: (string | number | null)[][];
};

type Workbook = {
  source: string;
  sheets: Sheet[];
  expenses: { sheet: string; amount: number; costGroup: string; category: string }[];
  capexVendors: { vendor: string; amount: number; paid: number }[];
  partners: { samirInvested: number; karanInvested: number };
};

function cellText(v: string | number | null) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    return v.toLocaleString("en-IN", {
      maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    });
  }
  return String(v);
}

export default function WorkbookPage() {
  const { data, isLoading } = useQuery<Workbook>({ queryKey: ["/api/workbook"] });
  const [tab, setTab] = useState("pnl");

  const opex = useMemo(() => {
    if (!data) return 0;
    return data.expenses.filter((e) => e.costGroup !== "capex").reduce((s, e) => s + e.amount, 0);
  }, [data]);
  const capex = useMemo(() => {
    if (!data) return 0;
    return data.expenses.filter((e) => e.costGroup === "capex").reduce((s, e) => s + e.amount, 0);
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Workbook" subtitle="Loading the Forecast P&L tabs…" />
      </div>
    );
  }

  const current = data.sheets.find((s) => s.id === tab) || data.sheets[0];

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Workbook"
        subtitle="Every tab from Forecast PnL April 2026–March 2027, with actual cash lines posted into Books."
      />
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground max-w-3xl">
          This is the mill’s Excel. P&amp;L includes some later-month forecasts. Rent, salary, utilities, CA, OPS,
          transport, petty cash, internet, AMC, client refunds, and new CCG buys are posted as costs. Opening crockery
          from the CapEx tab is posted as capex, not as profit. Refunds to Samir are a partner draw, not sales.
          Live billed hire still lives on{" "}
          <Link href="/financial" className="underline text-foreground font-medium">
            Money
          </Link>
          ; type new lines in{" "}
          <Link href="/books" className="underline text-foreground font-medium">
            Books
          </Link>
          .
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Running costs posted</CardDescription>
              <CardTitle className="tabular-nums">{formatINR(opex)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Crockery capex posted</CardDescription>
              <CardTitle className="tabular-nums">{formatINR(capex)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Partner capital in</CardDescription>
              <CardTitle className="tabular-nums">
                {formatINR((data.partners?.samirInvested || 0) + (data.partners?.karanInvested || 0))}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={current?.id} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {data.sheets.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="text-xs">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {data.sheets.map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{s.label}</CardTitle>
                  <CardDescription>Excel tab “{s.excelName.trim()}”</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <tbody>
                      {s.grid.map((row, ri) => (
                        <tr key={ri} className="border-b last:border-0">
                          {row.map((c, ci) => (
                            <td
                              key={ci}
                              className={`py-1.5 pr-3 align-top ${ci === 0 ? "font-medium whitespace-nowrap" : "tabular-nums text-right"} ${
                                typeof c === "number" && c < 0 ? "text-red-800" : ""
                              }`}
                            >
                              {cellText(c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {s.id === "capex" && data.capexVendors?.length ? (
                    <div className="mt-4 text-sm space-y-1">
                      <p className="font-medium">Opening CCG vendors (paid)</p>
                      {data.capexVendors.map((v) => (
                        <p key={v.vendor}>
                          {v.vendor} · {formatINR(v.amount)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
