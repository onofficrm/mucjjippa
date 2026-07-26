-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('POINT', 'TICKET');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUST', 'REFUND');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('CASUAL', 'RANKED', 'PRACTICE', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('QUEUED', 'READY', 'PLAYING', 'COMPLETED', 'CANCELLED', 'ABORTED');

-- CreateEnum
CREATE TYPE "MatchRoundStatus" AS ENUM ('PENDING', 'LOCKED', 'COMPLETED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "RpsChoice" AS ENUM ('ROCK', 'PAPER', 'SCISSORS');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('DAILY', 'WEEKLY', 'HOURLY', 'SPECIAL');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'STARTING_SOON', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "TournamentParticipantStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'PLAYING', 'ELIMINATED', 'WINNER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentMatchStatus" AS ENUM ('PENDING', 'READY', 'PLAYING', 'COMPLETED', 'BYE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('BASIC', 'RARE', 'LEGENDARY', 'EVENT');

-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('AVATAR', 'TITLE', 'SHOP_ITEM', 'COUPON', 'BOOSTER');

-- CreateEnum
CREATE TYPE "ShopItemCategory" AS ENUM ('COSMETIC', 'TICKET', 'BOOSTER', 'COUPON');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH', 'TOURNAMENT', 'REWARD', 'NOTICE', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "login_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" TEXT NOT NULL,
    "nickname" VARCHAR(32) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "avatar_id" TEXT,
    "title_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "language" VARCHAR(8) NOT NULL DEFAULT 'ko',
    "bgm_volume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "effect_volume" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "vibration" BOOLEAN NOT NULL DEFAULT true,
    "tournament_notification" BOOLEAN NOT NULL DEFAULT true,
    "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
    "auto_choice" BOOLEAN NOT NULL DEFAULT false,
    "watch_auto_next" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "point_balance" INTEGER NOT NULL DEFAULT 0,
    "ticket_balance" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_key" VARCHAR(128) NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "transaction_type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(64),
    "reference_id" VARCHAR(64),
    "description" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "mode" "MatchMode" NOT NULL DEFAULT 'CASUAL',
    "status" "MatchStatus" NOT NULL DEFAULT 'QUEUED',
    "entry_point" INTEGER NOT NULL DEFAULT 0,
    "reward_point" INTEGER NOT NULL DEFAULT 0,
    "player1_id" TEXT,
    "player2_id" TEXT,
    "winner_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_rounds" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "player1_choice" "RpsChoice",
    "player2_choice" "RpsChoice",
    "winner_id" TEXT,
    "status" "MatchRoundStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "match_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "TournamentType" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "min_participants" INTEGER NOT NULL DEFAULT 8,
    "max_participants" INTEGER NOT NULL DEFAULT 64,
    "entry_ticket" INTEGER NOT NULL DEFAULT 1,
    "qualifier_rule" VARCHAR(255),
    "total_prize" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "registration_ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "TournamentParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "seed" INTEGER,
    "final_rank" INTEGER,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminated_at" TIMESTAMP(3),

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "bracket_position" INTEGER NOT NULL,
    "player1_id" TEXT,
    "player2_id" TEXT,
    "winner_id" TEXT,
    "match_id" TEXT,
    "status" "TournamentMatchStatus" NOT NULL DEFAULT 'PENDING',
    "next_match_id" TEXT,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatars" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "type" "AvatarType" NOT NULL DEFAULT 'BASIC',
    "price" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255),
    "unlock_condition" VARCHAR(255),
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "category" "ShopItemCategory" NOT NULL,
    "price_points" INTEGER NOT NULL DEFAULT 0,
    "price_tickets" INTEGER NOT NULL DEFAULT 0,
    "quantity_grant" INTEGER NOT NULL DEFAULT 1,
    "icon" VARCHAR(32),
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_type" "InventoryItemType" NOT NULL,
    "item_id" VARCHAR(64) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(64) NOT NULL,
    "target_id" VARCHAR(64) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_transaction_key_key" ON "wallet_transactions"("transaction_key");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_type_reference_id_idx" ON "wallet_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_asset_type_transaction_type_idx" ON "wallet_transactions"("asset_type", "transaction_type");

-- CreateIndex
CREATE INDEX "matches_status_created_at_idx" ON "matches"("status", "created_at");

-- CreateIndex
CREATE INDEX "matches_player1_id_created_at_idx" ON "matches"("player1_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "matches_player2_id_created_at_idx" ON "matches"("player2_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "matches_mode_status_idx" ON "matches"("mode", "status");

-- CreateIndex
CREATE INDEX "match_rounds_match_id_status_idx" ON "match_rounds"("match_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_rounds_match_id_round_number_key" ON "match_rounds"("match_id", "round_number");

-- CreateIndex
CREATE INDEX "tournaments_status_starts_at_idx" ON "tournaments"("status", "starts_at");

-- CreateIndex
CREATE INDEX "tournaments_type_status_idx" ON "tournaments"("type", "status");

-- CreateIndex
CREATE INDEX "tournament_participants_tournament_id_status_idx" ON "tournament_participants"("tournament_id", "status");

-- CreateIndex
CREATE INDEX "tournament_participants_user_id_joined_at_idx" ON "tournament_participants"("user_id", "joined_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_match_id_key" ON "tournament_matches"("match_id");

-- CreateIndex
CREATE INDEX "tournament_matches_tournament_id_status_idx" ON "tournament_matches"("tournament_id", "status");

-- CreateIndex
CREATE INDEX "tournament_matches_next_match_id_idx" ON "tournament_matches"("next_match_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_tournament_id_round_bracket_position_key" ON "tournament_matches"("tournament_id", "round", "bracket_position");

-- CreateIndex
CREATE INDEX "avatars_status_type_idx" ON "avatars"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "titles_name_key" ON "titles"("name");

-- CreateIndex
CREATE INDEX "titles_status_idx" ON "titles"("status");

-- CreateIndex
CREATE INDEX "shop_items_status_category_idx" ON "shop_items"("status", "category");

-- CreateIndex
CREATE INDEX "inventory_user_id_equipped_idx" ON "inventory"("user_id", "equipped");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_user_id_item_type_item_id_key" ON "inventory"("user_id", "item_type", "item_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_admin_user_id_created_at_idx" ON "audit_logs"("admin_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "avatars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "tournament_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
