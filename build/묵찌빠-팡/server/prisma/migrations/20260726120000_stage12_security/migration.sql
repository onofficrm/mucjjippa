-- Stage 12: security & fraud detection (2FA prep, fraud signals)

-- 관리자 2단계 인증 준비
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "two_factor_secret" VARCHAR(64);

-- fraud signal enums
DO $$ BEGIN
  CREATE TYPE "FraudSignalType" AS ENUM (
    'RAPID_CHOICE', 'REPEATED_DISCONNECT', 'SAME_OPPONENT_REMATCH',
    'MULTI_ACCOUNT_SAME_IP', 'ABNORMAL_WINRATE', 'ABNORMAL_POINT_GAIN',
    'REPEATED_REWARD', 'REPLAY_ATTEMPT', 'PERMISSION_DENIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FraudSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FraudSignalStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "fraud_signals" (
  "id" TEXT NOT NULL,
  "type" "FraudSignalType" NOT NULL,
  "severity" "FraudSeverity" NOT NULL DEFAULT 'WARN',
  "status" "FraudSignalStatus" NOT NULL DEFAULT 'OPEN',
  "user_id" TEXT,
  "dedupe_key" VARCHAR(160),
  "hit_count" INTEGER NOT NULL DEFAULT 1,
  "message" VARCHAR(500) NOT NULL,
  "context" JSONB,
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fraud_signals_dedupe_key_key" ON "fraud_signals"("dedupe_key");
CREATE INDEX IF NOT EXISTS "fraud_signals_status_severity_created_at_idx"
  ON "fraud_signals"("status", "severity", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "fraud_signals_user_id_created_at_idx"
  ON "fraud_signals"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "fraud_signals_type_created_at_idx"
  ON "fraud_signals"("type", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "fraud_signals"
    ADD CONSTRAINT "fraud_signals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
