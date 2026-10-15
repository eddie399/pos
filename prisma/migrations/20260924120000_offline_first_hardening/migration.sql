-- Offline-first hardening.
--
-- 1. "clientRef" is the idempotency key minted by the selling device. The server
--    upserts on it, so a queued sale can be retried (after a dead network, a
--    crashed browser, a lost response) without ever booking it twice.
-- 2. Indexes for the shop-scoped, time-ordered reads the POS, reports and cash
--    session screens perform on every load.

ALTER TABLE "sales" ADD COLUMN "clientRef" TEXT;

CREATE UNIQUE INDEX "sales_clientRef_key" ON "sales"("clientRef");

CREATE INDEX "sales_shopId_createdAt_idx" ON "sales"("shopId", "createdAt");

CREATE INDEX "expenses_shopId_createdAt_idx" ON "expenses"("shopId", "createdAt");

CREATE INDEX "stock_movements_shopId_createdAt_idx" ON "stock_movements"("shopId", "createdAt");

CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");

CREATE INDEX "daily_sessions_shopId_closedAt_idx" ON "daily_sessions"("shopId", "closedAt");

CREATE INDEX "customer_transactions_shopId_customerId_idx" ON "customer_transactions"("shopId", "customerId");
