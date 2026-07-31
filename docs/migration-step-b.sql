-- Step B: Group Approval & Member State
-- Run this once against the database before deploying Step B backend.

-- 1. Add requires_approval column to study_groups
ALTER TABLE study_groups
    ADD COLUMN IF NOT EXISTS requires_approval TINYINT(1) NOT NULL DEFAULT 0;

-- 2. Extend member status to include PENDING and REJECTED
-- (No DDL needed — column is VARCHAR(30), existing values ACTIVE/LEFT/REMOVED remain valid)

-- 3. Verify
SELECT group_id, group_name, requires_approval FROM study_groups LIMIT 5;
SELECT member_id, group_id, user_id, role, status FROM study_group_members LIMIT 10;
