ALTER TABLE payment_orders
ADD COLUMN target_tier VARCHAR(20) NULL,
ADD COLUMN duration_months INT NULL,
ADD COLUMN payment_provider VARCHAR(30) NULL,
ADD COLUMN payment_url TEXT NULL,
ADD COLUMN vnp_txn_ref VARCHAR(100) NULL,
ADD COLUMN vnp_transaction_no VARCHAR(100) NULL,
ADD COLUMN vnp_response_code VARCHAR(20) NULL,
ADD COLUMN vnp_transaction_status VARCHAR(20) NULL,
ADD COLUMN vnp_bank_code VARCHAR(50) NULL,
ADD COLUMN vnp_pay_date VARCHAR(30) NULL,
ADD COLUMN provider_paid_at DATETIME NULL,
ADD COLUMN review_reason VARCHAR(100) NULL,
ADD COLUMN review_required_at DATETIME NULL,
ADD COLUMN expired_at DATETIME NULL;

UPDATE payment_orders
SET plan_code = 'PREMIUM_1_MONTH'
WHERE plan_code = 'PREMIUM';

UPDATE payment_orders
SET plan_code = 'ULTRA_1_MONTH'
WHERE plan_code = 'ULTRA';

UPDATE payment_orders
SET target_tier = 'PREMIUM',
    duration_months = 1
WHERE plan_code = 'PREMIUM_1_MONTH';

UPDATE payment_orders
SET target_tier = 'ULTRA',
    duration_months = 1
WHERE plan_code = 'ULTRA_1_MONTH';

UPDATE payment_orders
SET payment_provider = 'MOCK'
WHERE payment_provider IS NULL;

UPDATE payment_orders
SET payment_method = 'MOCK'
WHERE payment_method IS NULL;

UPDATE payment_orders
SET currency = 'VND'
WHERE currency IS NULL;

CREATE UNIQUE INDEX uk_payment_orders_vnp_txn_ref
ON payment_orders(vnp_txn_ref);

CREATE INDEX idx_payment_orders_user_status_expired
ON payment_orders(user_id, status, expired_at);
