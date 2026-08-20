-- +goose Up
ALTER TABLE community_submissions ADD COLUMN media_asset_id BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_submissions_media_asset
    ON community_submissions (media_asset_id);

-- +goose Down
DROP INDEX IF EXISTS idx_community_submissions_media_asset;

ALTER TABLE community_submissions DROP COLUMN media_asset_id;
