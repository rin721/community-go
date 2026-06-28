-- +goose Up
CREATE TABLE IF NOT EXISTS community_video_comments (
    id VARCHAR(96) PRIMARY KEY,
    video_id VARCHAR(96) NOT NULL,
    body VARCHAR(500) NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_video_comments_video_status_created
    ON community_video_comments (video_id, status, created_at);

-- +goose Down
DROP TABLE IF EXISTS community_video_comments;
