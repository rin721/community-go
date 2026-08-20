-- +goose Up
CREATE TABLE IF NOT EXISTS community_accounts (
    id BIGINT PRIMARY KEY,
    handle VARCHAR(96) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'registered',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_community_accounts_role_status_created
    ON community_accounts (role, status, created_at);

CREATE TABLE IF NOT EXISTS community_sessions (
    id BIGINT PRIMARY KEY,
    account_id BIGINT NOT NULL,
    access_token_hash VARCHAR(128) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
    product_code VARCHAR(64) NOT NULL DEFAULT '',
    client_type VARCHAR(64) NOT NULL DEFAULT '',
    ip_address VARCHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(512) NOT NULL DEFAULT '',
    access_expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_community_sessions_account_active
    ON community_sessions (account_id, revoked_at, access_expires_at);

ALTER TABLE community_reports ADD COLUMN review_note VARCHAR(720) NOT NULL DEFAULT '';
ALTER TABLE community_reports ADD COLUMN reviewer_id VARCHAR(96) NOT NULL DEFAULT '';
ALTER TABLE community_reports ADD COLUMN reviewed_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_community_reports_reviewer_reviewed
    ON community_reports (reviewer_id, reviewed_at);

INSERT OR IGNORE INTO community_accounts (
    id,
    handle,
    email,
    password_hash,
    display_name,
    role,
    status,
    last_login_at,
    created_at,
    updated_at
)
SELECT
    u.id,
    u.username,
    u.email,
    u.password_hash,
    CASE WHEN u.display_name = '' THEN u.username ELSE u.display_name END,
    'registered',
    CASE WHEN u.status = 'disabled' THEN 'disabled' ELSE 'active' END,
    u.last_login_at,
    u.created_at,
    CURRENT_TIMESTAMP
FROM iam_users u
WHERE u.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM iam_memberships m
    JOIN iam_organizations o ON o.id = m.org_id
    WHERE m.user_id = u.id
      AND m.deleted_at IS NULL
      AND o.deleted_at IS NULL
      AND o.code LIKE 'community-%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM iam_memberships m
    JOIN iam_organizations o ON o.id = m.org_id
    WHERE m.user_id = u.id
      AND m.deleted_at IS NULL
      AND o.deleted_at IS NULL
      AND o.code NOT LIKE 'community-%'
  );

UPDATE iam_sessions
SET revoked_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE revoked_at IS NULL
  AND user_id IN (
    SELECT u.id
    FROM iam_users u
    WHERE u.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM iam_memberships m
        JOIN iam_organizations o ON o.id = m.org_id
        WHERE m.user_id = u.id
          AND m.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND o.code LIKE 'community-%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM iam_memberships m
        JOIN iam_organizations o ON o.id = m.org_id
        WHERE m.user_id = u.id
          AND m.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND o.code NOT LIKE 'community-%'
      )
  );

UPDATE iam_users
SET status = 'disabled',
    updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND id IN (
    SELECT account_id
    FROM (
      SELECT u.id AS account_id
      FROM iam_users u
      WHERE u.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM iam_memberships m
          JOIN iam_organizations o ON o.id = m.org_id
          WHERE m.user_id = u.id
            AND m.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND o.code LIKE 'community-%'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM iam_memberships m
          JOIN iam_organizations o ON o.id = m.org_id
          WHERE m.user_id = u.id
            AND m.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND o.code NOT LIKE 'community-%'
        )
    )
  );

UPDATE iam_memberships
SET deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND org_id IN (
    SELECT id
    FROM iam_organizations
    WHERE deleted_at IS NULL
      AND code LIKE 'community-%'
  );

UPDATE iam_organizations
SET deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND code LIKE 'community-%';

-- +goose Down
UPDATE iam_organizations
SET deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE code LIKE 'community-%';

UPDATE iam_memberships
SET deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE org_id IN (
    SELECT id
    FROM iam_organizations
    WHERE code LIKE 'community-%'
);

DROP INDEX IF EXISTS idx_community_reports_reviewer_reviewed;

ALTER TABLE community_reports DROP COLUMN reviewed_at;
ALTER TABLE community_reports DROP COLUMN reviewer_id;
ALTER TABLE community_reports DROP COLUMN review_note;

DROP TABLE IF EXISTS community_sessions;
DROP TABLE IF EXISTS community_accounts;
