-- Add sourceModule column to SupportTicket
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT DEFAULT 'general';

-- Create ExternalApiKey table
CREATE TABLE IF NOT EXISTS "ExternalApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "hashedKey" TEXT NOT NULL,
  "scope" TEXT[] DEFAULT ARRAY['ticket:create']::TEXT[],
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  "lastUsedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),

  CONSTRAINT "ExternalApiKey_pkey" PRIMARY KEY ("id")
);

-- Create unique index on hashedKey
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalApiKey_hashedKey_key" ON "ExternalApiKey"("hashedKey");

-- Create index on hashedKey for fast lookups
CREATE INDEX IF NOT EXISTS "ExternalApiKey_hashedKey_idx" ON "ExternalApiKey"("hashedKey");
