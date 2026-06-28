-- +goose Up
ALTER TABLE community_video_jobs ADD COLUMN attempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_video_jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE community_video_jobs ADD COLUMN locked_by VARCHAR(96) NOT NULL DEFAULT '';
ALTER TABLE community_video_jobs ADD COLUMN locked_at TIMESTAMP NULL;
ALTER TABLE community_video_jobs ADD COLUMN heartbeat_at TIMESTAMP NULL;
ALTER TABLE community_video_jobs ADD COLUMN next_run_at TIMESTAMP NULL;
ALTER TABLE community_video_jobs ADD COLUMN request_payload VARCHAR(4096) NOT NULL DEFAULT '';
ALTER TABLE community_video_jobs ADD COLUMN provider_job_id VARCHAR(160) NOT NULL DEFAULT '';
ALTER TABLE community_video_jobs ADD COLUMN callback_received_at TIMESTAMP NULL;
ALTER TABLE community_video_jobs ADD COLUMN failure_code VARCHAR(96) NOT NULL DEFAULT '';
ALTER TABLE community_video_jobs ADD COLUMN cancel_requested_at TIMESTAMP NULL;

CREATE INDEX idx_community_video_jobs_next_run ON community_video_jobs (status, next_run_at);
CREATE INDEX idx_community_video_jobs_lock ON community_video_jobs (status, locked_at);
CREATE INDEX idx_community_video_jobs_provider_job ON community_video_jobs (provider_job_id);

-- +goose Down
DROP INDEX idx_community_video_jobs_provider_job;
DROP INDEX idx_community_video_jobs_lock;
DROP INDEX idx_community_video_jobs_next_run;
ALTER TABLE community_video_jobs DROP COLUMN cancel_requested_at;
ALTER TABLE community_video_jobs DROP COLUMN failure_code;
ALTER TABLE community_video_jobs DROP COLUMN callback_received_at;
ALTER TABLE community_video_jobs DROP COLUMN provider_job_id;
ALTER TABLE community_video_jobs DROP COLUMN request_payload;
ALTER TABLE community_video_jobs DROP COLUMN next_run_at;
ALTER TABLE community_video_jobs DROP COLUMN heartbeat_at;
ALTER TABLE community_video_jobs DROP COLUMN locked_at;
ALTER TABLE community_video_jobs DROP COLUMN locked_by;
ALTER TABLE community_video_jobs DROP COLUMN max_attempts;
ALTER TABLE community_video_jobs DROP COLUMN attempt;
