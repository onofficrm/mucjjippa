-- Stage 8: Tournament status machine, rewards, qualifier, bracket fields

-- 1) New enums
DO $$ BEGIN
  CREATE TYPE "TournamentTier" AS ENUM ('BEGINNER', 'REGULAR', 'MEGA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "QualifierRoundStatus" AS ENUM ('PENDING', 'CHOOSING', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Migrate TournamentStatus via rename + recreate
ALTER TYPE "TournamentStatus" RENAME TO "TournamentStatus_old";

CREATE TYPE "TournamentStatus" AS ENUM (
  'DRAFT',
  'REGISTRATION',
  'READY',
  'QUALIFIER',
  'BRACKET',
  'SEMIFINAL',
  'FINAL',
  'COMPLETED',
  'CANCELLED',
  'POSTPONED'
);

ALTER TABLE "tournaments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TournamentStatus"
  USING (
    CASE "status"::text
      WHEN 'STARTING_SOON' THEN 'READY'
      WHEN 'IN_PROGRESS' THEN 'BRACKET'
      WHEN 'FINISHED' THEN 'COMPLETED'
      WHEN 'DEFERRED' THEN 'POSTPONED'
      ELSE "status"::text
    END
  )::"TournamentStatus";

ALTER TABLE "tournaments" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"TournamentStatus";
DROP TYPE "TournamentStatus_old";

-- 3) Tournament columns
ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "tier" "TournamentTier" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "bracket_target" INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS "refund_on_postpone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "current_round_label" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_transition_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "tournaments_status_next_transition_at_idx"
  ON "tournaments"("status", "next_transition_at");

-- Cap MEGA / oversize: mark as coming-soon by setting max and tier in app layer.
UPDATE "tournaments" SET "tier" = 'BEGINNER', "bracket_target" = 16
WHERE "max_participants" <= 32;
UPDATE "tournaments" SET "tier" = 'REGULAR', "bracket_target" = LEAST(64, "max_participants")
WHERE "max_participants" > 32 AND "max_participants" <= 128;
UPDATE "tournaments" SET "tier" = 'MEGA', "bracket_target" = 128
WHERE "max_participants" > 128;

-- 4) Reward table
CREATE TABLE IF NOT EXISTS "tournament_rewards" (
  "id" TEXT NOT NULL,
  "tournament_id" TEXT NOT NULL,
  "rank_from" INTEGER NOT NULL,
  "rank_to" INTEGER NOT NULL,
  "point_reward" INTEGER NOT NULL,
  "label" VARCHAR(64),
  CONSTRAINT "tournament_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_rewards_tournament_id_rank_from_rank_to_key"
  ON "tournament_rewards"("tournament_id", "rank_from", "rank_to");
CREATE INDEX IF NOT EXISTS "tournament_rewards_tournament_id_idx"
  ON "tournament_rewards"("tournament_id");

ALTER TABLE "tournament_rewards"
  DROP CONSTRAINT IF EXISTS "tournament_rewards_tournament_id_fkey";
ALTER TABLE "tournament_rewards"
  ADD CONSTRAINT "tournament_rewards_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Qualifier rounds / choices
CREATE TABLE IF NOT EXISTS "tournament_qualifier_rounds" (
  "id" TEXT NOT NULL,
  "tournament_id" TEXT NOT NULL,
  "round_number" INTEGER NOT NULL,
  "status" "QualifierRoundStatus" NOT NULL DEFAULT 'PENDING',
  "ends_at" TIMESTAMP(3),
  "alive_before" INTEGER NOT NULL DEFAULT 0,
  "alive_after" INTEGER,
  "minority_choice" "RpsChoice",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "tournament_qualifier_rounds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_qualifier_rounds_tournament_id_round_number_key"
  ON "tournament_qualifier_rounds"("tournament_id", "round_number");
CREATE INDEX IF NOT EXISTS "tournament_qualifier_rounds_tournament_id_status_idx"
  ON "tournament_qualifier_rounds"("tournament_id", "status");

ALTER TABLE "tournament_qualifier_rounds"
  DROP CONSTRAINT IF EXISTS "tournament_qualifier_rounds_tournament_id_fkey";
ALTER TABLE "tournament_qualifier_rounds"
  ADD CONSTRAINT "tournament_qualifier_rounds_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "tournament_qualifier_choices" (
  "id" TEXT NOT NULL,
  "round_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "choice" "RpsChoice",
  "auto_filled" BOOLEAN NOT NULL DEFAULT false,
  "submitted_at" TIMESTAMP(3),
  CONSTRAINT "tournament_qualifier_choices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_qualifier_choices_round_id_user_id_key"
  ON "tournament_qualifier_choices"("round_id", "user_id");
CREATE INDEX IF NOT EXISTS "tournament_qualifier_choices_user_id_idx"
  ON "tournament_qualifier_choices"("user_id");

ALTER TABLE "tournament_qualifier_choices"
  DROP CONSTRAINT IF EXISTS "tournament_qualifier_choices_round_id_fkey";
ALTER TABLE "tournament_qualifier_choices"
  ADD CONSTRAINT "tournament_qualifier_choices_round_id_fkey"
  FOREIGN KEY ("round_id") REFERENCES "tournament_qualifier_rounds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Bracket match fields
ALTER TABLE "tournament_matches"
  ADD COLUMN IF NOT EXISTS "round_label" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "wins_required" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "player1_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "player2_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_third_place" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
