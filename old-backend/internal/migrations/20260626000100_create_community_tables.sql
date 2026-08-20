-- +goose Up
CREATE TABLE IF NOT EXISTS community_creators (
    id VARCHAR(96) PRIMARY KEY,
    handle VARCHAR(96) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    avatar_url VARCHAR(512) NULL,
    bio VARCHAR(640) NULL,
    follower_count BIGINT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS community_videos (
    id VARCHAR(96) PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(240) NOT NULL,
    description VARCHAR(720) NULL,
    thumbnail_url VARCHAR(512) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    comment_count BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    source_url VARCHAR(512) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    uploader_id VARCHAR(96) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_videos_published_at ON community_videos (published_at);
CREATE INDEX idx_community_videos_uploader_id ON community_videos (uploader_id);

CREATE TABLE IF NOT EXISTS community_video_categories (
    video_id VARCHAR(96) NOT NULL,
    category_slug VARCHAR(96) NOT NULL,
    PRIMARY KEY (video_id, category_slug)
);

CREATE TABLE IF NOT EXISTS community_video_tags (
    video_id VARCHAR(96) NOT NULL,
    tag VARCHAR(96) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (video_id, tag)
);

CREATE TABLE IF NOT EXISTS community_video_sources (
    id VARCHAR(96) PRIMARY KEY,
    video_id VARCHAR(96) NOT NULL,
    src VARCHAR(512) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    label VARCHAR(120) NOT NULL,
    mime_type VARCHAR(120) NULL,
    quality_label VARCHAR(64) NULL,
    bitrate_kbps INTEGER NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_community_video_sources_video_id ON community_video_sources (video_id);

CREATE TABLE IF NOT EXISTS community_video_danmaku (
    id VARCHAR(96) PRIMARY KEY,
    video_id VARCHAR(96) NOT NULL,
    body VARCHAR(280) NOT NULL,
    time_seconds INTEGER NOT NULL,
    mode VARCHAR(24) NOT NULL,
    color VARCHAR(32) NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_community_video_danmaku_video_id ON community_video_danmaku (video_id);

-- +goose Down
DROP TABLE IF EXISTS community_video_danmaku;
DROP TABLE IF EXISTS community_video_sources;
DROP TABLE IF EXISTS community_video_tags;
DROP TABLE IF EXISTS community_video_categories;
DROP TABLE IF EXISTS community_videos;
DROP TABLE IF EXISTS community_creators;
