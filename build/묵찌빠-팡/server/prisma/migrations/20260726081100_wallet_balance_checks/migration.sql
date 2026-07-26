-- 포인트·티켓 잔액 음수 방지 (앱 로직 + DB 이중 방어)
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_point_balance_non_negative"
  CHECK ("point_balance" >= 0);

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_ticket_balance_non_negative"
  CHECK ("ticket_balance" >= 0);

-- 인벤토리 수량 음수 방지
ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_quantity_non_negative"
  CHECK ("quantity" >= 0);

-- 원장 잔액 스냅샷도 음수 금지
ALTER TABLE "wallet_transactions"
  ADD CONSTRAINT "wallet_transactions_balance_after_non_negative"
  CHECK ("balance_after" >= 0);
