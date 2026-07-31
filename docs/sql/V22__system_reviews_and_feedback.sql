-- V22__system_reviews_and_feedback.sql
-- Create system_reviews and system_review_replies tables

CREATE TABLE IF NOT EXISTS `system_reviews` (
    `review_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `rating` INT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `content` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'NEW',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY `uq_system_reviews_user` (`user_id`),
    CONSTRAINT `fk_system_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_review_replies` (
    `reply_id` INT AUTO_INCREMENT PRIMARY KEY,
    `review_id` INT NOT NULL,
    `sender_id` INT NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT `fk_replies_system_review` FOREIGN KEY (`review_id`) REFERENCES `system_reviews` (`review_id`),
    CONSTRAINT `fk_replies_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
