-- Add Accounting pre-VAT verification, unlimited tax/receipt documents, and accounting close fields to jobs
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "accounting_verified_before_vat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "accounting_tax_documents" JSONB,
  ADD COLUMN IF NOT EXISTS "accounting_closed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "accounting_closed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "accounting_verification_note" TEXT;
