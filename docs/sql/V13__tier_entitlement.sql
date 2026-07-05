-- Add tier_expires_at column to users table
ALTER TABLE users ADD COLUMN tier_expires_at DATETIME NULL;

-- Create ai_usage_reservations table
CREATE TABLE ai_usage_reservations (
    reservation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL,
    user_id INT NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    reserved_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    confirmed_at DATETIME NULL,
    released_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_ai_reservation_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Add indexes
CREATE INDEX idx_ai_reservation_user_status ON ai_usage_reservations(user_id, status);
CREATE INDEX idx_ai_reservation_expires_at ON ai_usage_reservations(expires_at);
CREATE UNIQUE INDEX uk_ai_reservation_request_id ON ai_usage_reservations(request_id);

-- Backfill tier_expires_at for existing PREMIUM users (set to 30 days from now)
UPDATE users
SET tier_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE tier = 'PREMIUM' AND tier_expires_at IS NULL;
