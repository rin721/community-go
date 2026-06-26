-- +goose Up
CREATE TABLE IF NOT EXISTS community_video_history (
    client_id VARCHAR(96) NOT NULL,
    video_id VARCHAR(96) NOT NULL,
    progress_seconds INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (client_id, video_id)
);

CREATE INDEX idx_community_video_history_client_viewed ON community_video_history (client_id, last_viewed_at DESC);
CREATE INDEX idx_community_video_history_video_viewed ON community_video_history (video_id, last_viewed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS community_video_history;
