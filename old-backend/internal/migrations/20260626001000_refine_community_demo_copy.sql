-- +goose Up
-- Community demo copy was removed from production migrations. This migration
-- version is retained as a no-op so historical migration ordering stays stable.
SELECT 1;

-- +goose Down
SELECT 1;
