-- +goose Up
ALTER TABLE community_video_comments ADD COLUMN client_id VARCHAR(96) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_community_video_comments_client_created
    ON community_video_comments (client_id, created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_community_video_comments_client_created;

ALTER TABLE community_video_comments DROP COLUMN client_id;
