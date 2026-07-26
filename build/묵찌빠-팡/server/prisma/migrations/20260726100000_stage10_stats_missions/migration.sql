-- Stage 10: user extended stats + missions
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "current_loss_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_loss_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rock_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paper_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scissors_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_participations" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_qualifier_passes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_bracket_entries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_seconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_thirds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tournament_fourths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "spectate_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "purchase_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "users_wins_idx" ON "users"("wins");
CREATE INDEX IF NOT EXISTS "users_current_streak_idx" ON "users"("current_streak");
CREATE INDEX IF NOT EXISTS "users_max_streak_idx" ON "users"("max_streak");

DO $$ BEGIN
  CREATE TYPE "MissionPeriod" AS ENUM ('DAILY', 'WEEKLY', 'ONCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MissionMetric" AS ENUM (
    'MATCH_PLAY', 'MATCH_WIN', 'STREAK_REACH',
    'TOURNAMENT_JOIN', 'TOURNAMENT_WIN',
    'ROCK_USE', 'PAPER_USE', 'SCISSORS_USE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "missions" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(255),
  "period" "MissionPeriod" NOT NULL DEFAULT 'DAILY',
  "metric" "MissionMetric" NOT NULL,
  "goal" INTEGER NOT NULL DEFAULT 1,
  "reward_points" INTEGER NOT NULL DEFAULT 0,
  "reward_tickets" INTEGER NOT NULL DEFAULT 0,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "missions_code_key" ON "missions"("code");
CREATE INDEX IF NOT EXISTS "missions_status_period_sort_order_idx" ON "missions"("status", "period", "sort_order");

CREATE TABLE IF NOT EXISTS "user_missions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "mission_id" TEXT NOT NULL,
  "period_key" VARCHAR(32) NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3),
  "claimed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_missions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_missions_user_id_mission_id_period_key_key"
  ON "user_missions"("user_id", "mission_id", "period_key");
CREATE INDEX IF NOT EXISTS "user_missions_user_id_period_key_idx"
  ON "user_missions"("user_id", "period_key");

DO $$ BEGIN
  ALTER TABLE "user_missions"
    ADD CONSTRAINT "user_missions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_missions"
    ADD CONSTRAINT "user_missions_mission_id_fkey"
    FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
