-- +goose Up
CREATE TABLE IF NOT EXISTS community_video_jobs (
    id VARCHAR(96) PRIMARY KEY,
    submission_id VARCHAR(96) NOT NULL,
    media_asset_id BIGINT NOT NULL DEFAULT 0,
    video_id VARCHAR(96) NOT NULL DEFAULT '',
    provider VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    input_storage_key VARCHAR(512) NOT NULL DEFAULT '',
    output_storage_key VARCHAR(512) NOT NULL DEFAULT '',
    output_public_url VARCHAR(512) NOT NULL DEFAULT '',
    error_message TEXT NOT NULL,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_video_jobs_submission ON community_video_jobs (submission_id);
CREATE INDEX idx_community_video_jobs_media_asset ON community_video_jobs (media_asset_id);
CREATE INDEX idx_community_video_jobs_video ON community_video_jobs (video_id);
CREATE INDEX idx_community_video_jobs_status ON community_video_jobs (status);
CREATE INDEX idx_community_video_jobs_created ON community_video_jobs (created_at);
CREATE INDEX idx_community_video_jobs_deleted ON community_video_jobs (deleted_at);

CREATE TABLE IF NOT EXISTS community_video_renditions (
    id VARCHAR(96) PRIMARY KEY,
    job_id VARCHAR(96) NOT NULL,
    video_id VARCHAR(96) NOT NULL,
    quality_label VARCHAR(64) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bitrate_kbps INTEGER NOT NULL DEFAULT 0,
    playlist_url VARCHAR(512) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_community_video_renditions_job ON community_video_renditions (job_id);
CREATE INDEX idx_community_video_renditions_video ON community_video_renditions (video_id);

-- +goose Down
DROP TABLE IF EXISTS community_video_renditions;
DROP TABLE IF EXISTS community_video_jobs;
