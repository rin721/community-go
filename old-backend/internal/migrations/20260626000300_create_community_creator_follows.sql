-- +goose Up
CREATE TABLE IF NOT EXISTS community_creator_follows (
    client_id VARCHAR(96) NOT NULL,
    creator_id VARCHAR(96) NOT NULL,
    followed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (client_id, creator_id)
);

CREATE INDEX idx_community_creator_follows_client ON community_creator_follows (client_id, deleted_at, followed_at);
CREATE INDEX idx_community_creator_follows_creator ON community_creator_follows (creator_id, deleted_at);

-- +goose Down
DROP TABLE IF EXISTS community_creator_follows;
