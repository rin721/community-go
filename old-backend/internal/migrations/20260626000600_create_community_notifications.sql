-- +goose Up
CREATE TABLE IF NOT EXISTS community_notifications (
    id VARCHAR(96) PRIMARY KEY,
    client_id VARCHAR(96) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    target_kind VARCHAR(32) NOT NULL,
    target_id VARCHAR(96) NOT NULL,
    video_id VARCHAR(96) NOT NULL DEFAULT '',
    creator_id VARCHAR(96) NOT NULL DEFAULT '',
    link VARCHAR(512) NOT NULL DEFAULT '',
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_notifications_client_read_created
    ON community_notifications (client_id, read_at, created_at);
CREATE INDEX idx_community_notifications_client_kind_created
    ON community_notifications (client_id, kind, created_at);
CREATE INDEX idx_community_notifications_target_created
    ON community_notifications (target_kind, target_id, created_at);

-- +goose Down
DROP TABLE IF EXISTS community_notifications;
