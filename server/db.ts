import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export async function ensureInventoryValueColumns() {
  await pool.query(`
    ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS purchase_cost numeric(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS purchase_gst_rate numeric(5, 2) NOT NULL DEFAULT 18.00;
    UPDATE inventory_items
      SET purchase_cost = round(replacement_cost::numeric / 1.25, 2)
      WHERE (purchase_cost IS NULL OR purchase_cost = 0)
        AND replacement_cost IS NOT NULL
        AND replacement_cost::numeric > 0;
  `);
}