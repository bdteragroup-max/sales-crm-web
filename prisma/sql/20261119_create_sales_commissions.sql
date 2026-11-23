CREATE TABLE IF NOT EXISTS "sales_commission_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "request_no" VARCHAR(40) NOT NULL UNIQUE,
  "job_id" TEXT NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "job_number" VARCHAR(60) NOT NULL,
  "company_code" VARCHAR(20) NOT NULL DEFAULT 'TG',
  "customer_name" TEXT NOT NULL,
  "product_sold" TEXT,
  "job_type" VARCHAR(60),
  "salesperson_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "salesperson_name" VARCHAR(200) NOT NULL,
  "requested_by_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requested_by_name" VARCHAR(200) NOT NULL,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "tax_invoice_numbers" TEXT,
  "tax_invoice_date" TIMESTAMPTZ(6),
  "receipt_numbers" TEXT,
  "job_closed_status" VARCHAR(60) NOT NULL DEFAULT 'ยังไม่ปิด Job',
  "is_job_closed" BOOLEAN NOT NULL DEFAULT FALSE,
  "sales_amount_ex_vat" DOUBLE PRECISION NOT NULL,
  "paid_amount_recorded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_payment_100_pct" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_accounting_done" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_goods_return" BOOLEAN NOT NULL DEFAULT FALSE,
  "crm_fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "crm_snapshot" JSONB,

  "cost_amount" DOUBLE PRECISION,
  "source_profit_pct" DOUBLE PRECISION,
  "confirmed_profit_pct" DOUBLE PRECISION,
  "profit_confirmed_by_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "profit_confirmed_by_name" VARCHAR(200),
  "profit_confirmed_at" TIMESTAMPTZ(6),
  "profit_edit_reason" TEXT,

  "commission_rate_pct" DOUBLE PRECISION,
  "commission_amount" DOUBLE PRECISION,

  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING_PROFIT_REVIEW',
  "approved_by_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "approved_by_name" VARCHAR(200),
  "approved_at" TIMESTAMPTZ(6),
  "rejected_reason" TEXT,

  "payout_date" TIMESTAMPTZ(6),
  "payout_amount" DOUBLE PRECISION,
  "payout_ref_no" VARCHAR(120),
  "payout_note" TEXT,
  "payout_recorded_by_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "payout_recorded_by_name" VARCHAR(200),
  "payout_recorded_at" TIMESTAMPTZ(6),

  "remarks" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_sales_comm_job_id" ON "sales_commission_requests"("job_id");
CREATE INDEX IF NOT EXISTS "idx_sales_comm_salesperson_id" ON "sales_commission_requests"("salesperson_id");
CREATE INDEX IF NOT EXISTS "idx_sales_comm_status" ON "sales_commission_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_sales_comm_requested_at" ON "sales_commission_requests"("requested_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_commission_per_job"
  ON "sales_commission_requests"("job_id")
  WHERE "status" <> 'REJECTED';

CREATE TABLE IF NOT EXISTS "sales_commission_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "request_id" TEXT NOT NULL REFERENCES "sales_commission_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "action" VARCHAR(50) NOT NULL,
  "from_status" VARCHAR(40),
  "to_status" VARCHAR(40),
  "actor_id" TEXT NOT NULL,
  "actor_name" VARCHAR(200) NOT NULL,
  "previous_profit_pct" DOUBLE PRECISION,
  "new_profit_pct" DOUBLE PRECISION,
  "previous_cost" DOUBLE PRECISION,
  "new_cost" DOUBLE PRECISION,
  "previous_commission_rate" DOUBLE PRECISION,
  "new_commission_rate" DOUBLE PRECISION,
  "previous_commission_amount" DOUBLE PRECISION,
  "new_commission_amount" DOUBLE PRECISION,
  "reason" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_sales_comm_log_request_id" ON "sales_commission_logs"("request_id");

CREATE TABLE IF NOT EXISTS "commission_running_numbers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "year_be" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "commission_running_numbers_year_be_month_key" UNIQUE ("year_be", "month")
);
