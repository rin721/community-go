-- +goose Up
CREATE TABLE IF NOT EXISTS community_submissions (
    id VARCHAR(96) PRIMARY KEY,
    client_id VARCHAR(96) NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(720) NOT NULL DEFAULT '',
    category_slug VARCHAR(96) NOT NULL,
    tags_json TEXT NOT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'public',
    source_name VARCHAR(260) NOT NULL,
    source_size BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(120) NOT NULL DEFAULT '',
    allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
    sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_community_submissions_client_created
    ON community_submissions (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_submissions_status_created
    ON community_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_submissions_category_created
    ON community_submissions (category_slug, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS community_submissions;
