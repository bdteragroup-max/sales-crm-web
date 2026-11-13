import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function loadDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env');
  const envFile = fs.readFileSync(envPath, 'utf-8');
  const match = envFile.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (!match) throw new Error('DATABASE_URL not found in environment or .env');
  return match[1];
}

async function main() {
  const pool = new Pool({ connectionString: loadDbUrl() });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "stock_categories" (
        "id" TEXT NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(150) NOT NULL,
        "description" TEXT,
        "owner_department" VARCHAR(50) NOT NULL DEFAULT 'MARKETING',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "stock_items" (
        "id" TEXT NOT NULL,
        "category_id" TEXT NOT NULL,
        "sku" VARCHAR(60),
        "name" VARCHAR(200) NOT NULL,
        "unit" VARCHAR(40) NOT NULL DEFAULT 'ชิ้น',
        "current_stock" INTEGER NOT NULL DEFAULT 0,
        "min_stock" INTEGER,
        "unit_price" DECIMAL(12,2),
        "pr_info" VARCHAR(200),
        "note" TEXT,
        "image_url" TEXT,
        "excel_col_name" VARCHAR(200),
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by_id" TEXT,
        "created_by_name" VARCHAR(150),
        "updated_by_id" TEXT,
        "updated_by_name" VARCHAR(150),
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "stock_transactions" (
        "id" TEXT NOT NULL,
        "batch_code" VARCHAR(50),
        "item_id" TEXT NOT NULL,
        "tx_type" VARCHAR(30) NOT NULL,
        "qty_change" INTEGER NOT NULL,
        "stock_before" INTEGER NOT NULL,
        "stock_after" INTEGER NOT NULL,
        "tx_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "requester_name" VARCHAR(200),
        "requester_user_id" TEXT,
        "branch" VARCHAR(80),
        "purpose" VARCHAR(255),
        "note" TEXT,
        "unit_price" DECIMAL(12,2),
        "status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        "reversed_tx_id" TEXT,
        "created_by_id" TEXT,
        "created_by_name" VARCHAR(150),
        "created_by_role" VARCHAR(100),
        "cancelled_by_id" TEXT,
        "cancelled_by_name" VARCHAR(150),
        "cancelled_at" TIMESTAMPTZ(6),
        "cancel_reason" TEXT,
        "source_ref" VARCHAR(120),
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "stock_categories_code_key" ON "stock_categories"("code");
      CREATE INDEX IF NOT EXISTS "idx_stock_categories_active" ON "stock_categories"("is_active");

      CREATE UNIQUE INDEX IF NOT EXISTS "stock_items_sku_key" ON "stock_items"("sku");
      CREATE INDEX IF NOT EXISTS "idx_stock_items_category_id" ON "stock_items"("category_id");
      CREATE INDEX IF NOT EXISTS "idx_stock_items_active" ON "stock_items"("is_active");

      CREATE INDEX IF NOT EXISTS "idx_stock_tx_item_date" ON "stock_transactions"("item_id", "tx_date" DESC);
      CREATE INDEX IF NOT EXISTS "idx_stock_tx_date" ON "stock_transactions"("tx_date" DESC);
      CREATE INDEX IF NOT EXISTS "idx_stock_tx_type" ON "stock_transactions"("tx_type");
      CREATE INDEX IF NOT EXISTS "idx_stock_tx_batch" ON "stock_transactions"("batch_code");
      CREATE INDEX IF NOT EXISTS "idx_stock_tx_requester_uid" ON "stock_transactions"("requester_user_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_tx_item_source_ref" ON "stock_transactions"("item_id", "source_ref");

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_category_id_fkey'
        ) THEN
          ALTER TABLE "stock_items"
          ADD CONSTRAINT "stock_items_category_id_fkey"
          FOREIGN KEY ("category_id") REFERENCES "stock_categories"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'stock_transactions_item_id_fkey'
        ) THEN
          ALTER TABLE "stock_transactions"
          ADD CONSTRAINT "stock_transactions_item_id_fkey"
          FOREIGN KEY ("item_id") REFERENCES "stock_items"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_items_non_negative'
        ) THEN
          ALTER TABLE "stock_items"
          ADD CONSTRAINT "chk_stock_items_non_negative"
          CHECK ("current_stock" >= 0);
        END IF;
      END $$;

      ALTER TABLE "stock_categories" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "stock_transactions" ENABLE ROW LEVEL SECURITY;
    `);

    console.log('Verified and ensured stock_categories, stock_items, and stock_transactions tables, indexes, constraints, and RLS.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Schema setup error:', err);
  process.exit(1);
});

