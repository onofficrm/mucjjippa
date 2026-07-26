-- Stage 11: admin center (SUPER_ADMIN, notices, error logs, audit IP)

-- SUPER_ADMIN role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- audit log: IP / user agent + action index
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
  ON "audit_logs"("action", "created_at" DESC);

-- notice enums
DO $$ BEGIN
  CREATE TYPE "NoticeLevel" AS ENUM ('NORMAL', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SystemErrorLevel" AS ENUM ('WARN', 'ERROR', 'FATAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "notices" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "content" TEXT NOT NULL,
  "level" "NoticeLevel" NOT NULL DEFAULT 'NORMAL',
  "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "push_enabled" BOOLEAN NOT NULL DEFAULT false,
  "push_queued_at" TIMESTAMP(3),
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notices_status_starts_at_idx" ON "notices"("status", "starts_at");
CREATE INDEX IF NOT EXISTS "notices_status_priority_idx" ON "notices"("status", "priority" DESC);

CREATE TABLE IF NOT EXISTS "system_error_logs" (
  "id" TEXT NOT NULL,
  "level" "SystemErrorLevel" NOT NULL DEFAULT 'ERROR',
  "code" VARCHAR(64) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "scope" VARCHAR(64),
  "user_id" TEXT,
  "request_id" VARCHAR(64),
  "context" JSONB,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "system_error_logs_created_at_idx"
  ON "system_error_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "system_error_logs_level_created_at_idx"
  ON "system_error_logs"("level", "created_at" DESC);
