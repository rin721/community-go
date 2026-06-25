-- +goose Up
CREATE TABLE iam_notification_outbox (
    id BIGINT PRIMARY KEY,
    kind VARCHAR(64) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    url TEXT NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP NOT NULL,
    last_error TEXT NOT NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_iam_notification_outbox_kind ON iam_notification_outbox (kind);
CREATE INDEX idx_iam_notification_outbox_status ON iam_notification_outbox (status);
CREATE INDEX idx_iam_notification_outbox_next_attempt_at ON iam_notification_outbox (next_attempt_at);
CREATE INDEX idx_iam_notification_outbox_resource ON iam_notification_outbox (resource_type, resource_id);

-- +goose Down
DROP INDEX IF EXISTS idx_iam_notification_outbox_resource;
DROP INDEX IF EXISTS idx_iam_notification_outbox_next_attempt_at;
DROP INDEX IF EXISTS idx_iam_notification_outbox_status;
DROP INDEX IF EXISTS idx_iam_notification_outbox_kind;
DROP TABLE IF EXISTS iam_notification_outbox;
