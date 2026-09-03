import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { capitalEntries, cashPositions, expenses } from "@shared/schema";
import { eq } from "drizzle-orm";

export type WorkbookFile = {
  source: string;
  sheets: { id: string; excelName: string; label: string; group: string | null; grid: (string | number | null)[][] }[];
  expenses: {
    sheet: string;
    month: string;
    spentOn: string;
    costGroup: string;
    category: string;
    description: string;
    vendor: string;
    amount: number;
  }[];
  cash: { asOf: string; bankAmount: number; cashAmount: number; notes: string }[];
  capitalDraws: { partner: string; kind: string; amount: number; occurredOn: string; notes: string }[];
  capexVendors: { vendor: string; amount: number; paid: number }[];
  partners: Record<string, number>;
};

export function readWorkbook(): WorkbookFile {
  return JSON.parse(readFileSync(join(process.cwd(), "server/data/workbook.json"), "utf8"));
}

export async function importWorkbookBooks() {
  const book = readWorkbook();
  await db.delete(expenses);
  for (const line of book.expenses) {
    if (!line.amount) continue;
    await db.insert(expenses).values({
      spentOn: line.spentOn,
      costGroup: line.costGroup,
      category: line.category,
      description: `${line.description} · ${line.sheet}`,
      amount: String(line.amount),
      vendor: line.vendor || null,
    });
  }
  for (const row of book.cash) {
    const [hit] = await db.select().from(cashPositions).where(eq(cashPositions.asOf, row.asOf));
    if (hit) {
      await db
        .update(cashPositions)
        .set({
          bankAmount: String(row.bankAmount),
          cashAmount: String(row.cashAmount),
          notes: row.notes,
        })
        .where(eq(cashPositions.id, hit.id));
    } else {
      await db.insert(cashPositions).values({
        asOf: row.asOf,
        bankAmount: String(row.bankAmount),
        cashAmount: String(row.cashAmount),
        notes: row.notes,
      });
    }
  }
  const existingDraws = await db.select().from(capitalEntries);
  for (const draw of book.capitalDraws) {
    const already = existingDraws.some(
      (r) =>
        r.kind === "draw" &&
        r.partner === draw.partner &&
        String(r.occurredOn).slice(0, 10) === draw.occurredOn &&
        Math.abs(Number(r.amount) - draw.amount) < 0.5,
    );
    if (already) continue;
    await db.insert(capitalEntries).values({
      partner: draw.partner,
      kind: draw.kind,
      amount: String(draw.amount),
      occurredOn: draw.occurredOn,
      notes: draw.notes,
    });
  }
  return {
    expenses: book.expenses.length,
    cash: book.cash.length,
    draws: book.capitalDraws.length,
    sheets: book.sheets.length,
  };
}

if (process.argv[1]?.includes("import-workbook")) {
  importWorkbookBooks()
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
