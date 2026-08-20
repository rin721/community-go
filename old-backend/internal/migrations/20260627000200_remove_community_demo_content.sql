-- +goose Up
-- Community demo content is no longer seeded by earlier migrations. This
-- historical cleanup migration is kept as a no-op to preserve the version chain.
SELECT 1;

-- +goose Down
SELECT 1;
