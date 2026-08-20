-- +goose Up
ALTER TABLE community_creators ADD COLUMN banner_url VARCHAR(512) NULL;

-- +goose Down
ALTER TABLE community_creators DROP COLUMN banner_url;
