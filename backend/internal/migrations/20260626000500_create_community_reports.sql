-- +goose Up
CREATE TABLE IF NOT EXISTS community_reports (
    id VARCHAR(96) PRIMARY KEY,
    target_kind VARCHAR(32) NOT NULL,
    target_id VARCHAR(96) NOT NULL,
    video_id VARCHAR(96) NOT NULL,
    client_id VARCHAR(96) NOT NULL,
    reason VARCHAR(32) NOT NULL,
    detail VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_reports_target_status_created
    ON community_reports (target_kind, target_id, status, created_at);
CREATE INDEX idx_community_reports_client_status_created
    ON community_reports (client_id, status, created_at);
CREATE INDEX idx_community_reports_video_status_created
    ON community_reports (video_id, status, created_at);

-- +goose Down
DROP TABLE IF EXISTS community_reports;
