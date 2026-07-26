INSERT INTO "inventory" (
  "id", "user_id", "item_type", "item_id", "quantity", "equipped", "acquired_at"
)
SELECT
  'inv_avatar_' || md5(u."id" || u."avatar_id"),
  u."id",
  'AVATAR'::"InventoryItemType",
  u."avatar_id",
  1,
  true,
  NOW()
FROM "users" u
WHERE u."avatar_id" IS NOT NULL
ON CONFLICT ("user_id", "item_type", "item_id")
DO UPDATE SET "equipped" = true;

INSERT INTO "inventory" (
  "id", "user_id", "item_type", "item_id", "quantity", "equipped", "acquired_at"
)
SELECT
  'inv_title_' || md5(u."id" || u."title_id"),
  u."id",
  'TITLE'::"InventoryItemType",
  u."title_id",
  1,
  true,
  NOW()
FROM "users" u
WHERE u."title_id" IS NOT NULL
ON CONFLICT ("user_id", "item_type", "item_id")
DO UPDATE SET "equipped" = true;
