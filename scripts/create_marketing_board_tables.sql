-- Migration: Marketing Board Tables
CREATE TABLE IF NOT EXISTS "marketing_announcements" (
    "id" TEXT NOT NULL,
    "announcement_type" VARCHAR(50) NOT NULL,
    "product_group" VARCHAR(50) NOT NULL,
    "campaign_name" VARCHAR(255) NOT NULL,
    "short_description" TEXT NOT NULL,
    "campaign_details" TEXT NOT NULL,
    "terms_conditions" TEXT,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6),
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'ALL',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'Normal',
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "version" INT NOT NULL DEFAULT 1,
    "cover_image_url" TEXT,
    "contact_person" TEXT,
    "publish_mode" VARCHAR(20) NOT NULL DEFAULT 'NOW',
    "published_at" TIMESTAMPTZ(6),
    "display_order" INT NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketing_announcement_branches" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "branch_id" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_announcement_branches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_mkt_announcement_branch" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcements"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "marketing_announcement_assets" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT,
    "asset_type" VARCHAR(50) NOT NULL DEFAULT 'document',
    "document_type" VARCHAR(100) NOT NULL DEFAULT 'Others',
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(100),
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(20) NOT NULL DEFAULT 'V1',
    "effective_date" TIMESTAMPTZ(6),
    "expiry_date" TIMESTAMPTZ(6),
    "download_count" INT NOT NULL DEFAULT 0,
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'ALL',
    "specific_branch_ids" TEXT,
    "product_group" VARCHAR(50),
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_announcement_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_mkt_announcement_asset" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcements"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "marketing_announcement_acknowledgments" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" VARCHAR(20),
    "user_name" VARCHAR(255),
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_version" INT,
    CONSTRAINT "marketing_announcement_acknowledgments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_mkt_announcement_ack" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcements"("id") ON DELETE CASCADE,
    CONSTRAINT "uq_mkt_ack_user_announcement" UNIQUE ("announcement_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "marketing_announcement_audit_logs" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "version" INT NOT NULL DEFAULT 1,
    "action" VARCHAR(50) NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "performed_by" TEXT NOT NULL,
    "performed_by_name" VARCHAR(255),
    "notes" TEXT,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_announcement_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_mkt_announcement_audit" FOREIGN KEY ("announcement_id") REFERENCES "marketing_announcements"("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_mkt_announcements_status" ON "marketing_announcements"("status");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcements_product_group" ON "marketing_announcements"("product_group");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcements_dates" ON "marketing_announcements"("start_at", "end_at");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcements_priority" ON "marketing_announcements"("priority");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_branches_ann_id" ON "marketing_announcement_branches"("announcement_id");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_branches_branch_id" ON "marketing_announcement_branches"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_assets_ann_id" ON "marketing_announcement_assets"("announcement_id");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_assets_doc_type" ON "marketing_announcement_assets"("document_type");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_assets_product_group" ON "marketing_announcement_assets"("product_group");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_ack_ann_user" ON "marketing_announcement_acknowledgments"("announcement_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_mkt_announcement_audit_ann_id" ON "marketing_announcement_audit_logs"("announcement_id");
