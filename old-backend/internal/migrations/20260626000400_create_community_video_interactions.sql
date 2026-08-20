-- +goose Up
CREATE TABLE IF NOT EXISTS community_video_interactions (
    client_id VARCHAR(96) NOT NULL,
    video_id VARCHAR(96) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    interacted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (client_id, video_id, kind)
);

CREATE INDEX idx_community_video_interactions_client_kind ON community_video_interactions (client_id, kind, interacted_at);
CREATE INDEX idx_community_video_interactions_video_kind ON community_video_interactions (video_id, kind);

-- +goose Down
DROP TABLE IF EXISTS community_video_interactions;
