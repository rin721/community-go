-- +goose Up
CREATE TABLE IF NOT EXISTS community_dynamics (
    id VARCHAR(96) PRIMARY KEY,
    client_id VARCHAR(96) NOT NULL DEFAULT '',
    creator_id VARCHAR(96) NOT NULL DEFAULT '',
    video_id VARCHAR(96) NOT NULL DEFAULT '',
    author_name VARCHAR(120) NOT NULL,
    body VARCHAR(500) NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'text',
    status VARCHAR(32) NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_dynamics_status_created
    ON community_dynamics (status, created_at);
CREATE INDEX idx_community_dynamics_creator_created
    ON community_dynamics (creator_id, created_at);
CREATE INDEX idx_community_dynamics_client_created
    ON community_dynamics (client_id, created_at);
CREATE INDEX idx_community_dynamics_video_created
    ON community_dynamics (video_id, created_at);

-- +goose Down
DROP TABLE IF EXISTS community_dynamics;
