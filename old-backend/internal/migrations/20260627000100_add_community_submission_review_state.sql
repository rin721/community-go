-- +goose Up
ALTER TABLE community_submissions ADD COLUMN review_note VARCHAR(720) NOT NULL DEFAULT '';
ALTER TABLE community_submissions ADD COLUMN reviewer_id VARCHAR(96) NOT NULL DEFAULT '';
ALTER TABLE community_submissions ADD COLUMN reviewed_at TIMESTAMP NULL;
ALTER TABLE community_submissions ADD COLUMN published_video_id VARCHAR(96) NOT NULL DEFAULT '';
ALTER TABLE community_submissions ADD COLUMN published_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_community_submissions_reviewer_reviewed
    ON community_submissions (reviewer_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_submissions_published_video
    ON community_submissions (published_video_id);

-- +goose Down
DROP INDEX IF EXISTS idx_community_submissions_published_video;
DROP INDEX IF EXISTS idx_community_submissions_reviewer_reviewed;

ALTER TABLE community_submissions DROP COLUMN published_at;
ALTER TABLE community_submissions DROP COLUMN published_video_id;
ALTER TABLE community_submissions DROP COLUMN reviewed_at;
ALTER TABLE community_submissions DROP COLUMN reviewer_id;
ALTER TABLE community_submissions DROP COLUMN review_note;
