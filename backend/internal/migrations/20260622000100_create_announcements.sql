-- +goose Up
CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    summary VARCHAR(320) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_announcements_status ON announcements (status);
CREATE INDEX idx_announcements_created_at ON announcements (created_at);

-- +goose Down
DROP TABLE IF EXISTS announcements;
