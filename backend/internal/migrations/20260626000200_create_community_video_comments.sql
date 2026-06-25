-- +goose Up
CREATE TABLE IF NOT EXISTS community_video_comments (
    id VARCHAR(96) PRIMARY KEY,
    video_id VARCHAR(96) NOT NULL,
    body VARCHAR(500) NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_community_video_comments_video_status_created
    ON community_video_comments (video_id, status, created_at);

INSERT INTO community_video_comments (id, video_id, body, author_name, status, created_at, updated_at) VALUES
('comment-aoi-alpha-1', 'video-aoi-alpha', '后端社区模块接上以后，页面里的信息密度终于不只是 mock 了。', 'Frontend Memo', 'visible', '2026-06-03 10:05:00', '2026-06-03 10:05:00'),
('comment-aoi-alpha-2', 'video-aoi-alpha', '黑白几何底色加一点青粉状态色，确实更接近 kirakira 那种清爽锋利感。', 'Design Note', 'visible', '2026-06-03 10:07:00', '2026-06-03 10:07:00'),
('comment-aoi-alpha-3', 'video-aoi-alpha', '下一步可以把登录态、举报和审核流接起来，公开评论先保持轻量。', 'Aoi Backend', 'visible', '2026-06-03 10:09:00', '2026-06-03 10:09:00'),
('comment-go-api-1', 'video-go-api', 'route contract 生成 OpenAPI 后，前端接口字段终于有稳定来源。', 'Aoi Viewer', 'visible', '2026-05-28 10:05:00', '2026-05-28 10:05:00'),
('comment-mobile-grid-1', 'video-mobile-grid', '移动端评论区要保留足够触控间距，这个版本已经舒服很多。', 'Rin721', 'visible', '2026-05-30 10:05:00', '2026-05-30 10:05:00');

UPDATE community_videos
SET comment_count = (
    SELECT COUNT(*)
    FROM community_video_comments
    WHERE community_video_comments.video_id = community_videos.id
      AND community_video_comments.status = 'visible'
      AND community_video_comments.deleted_at IS NULL
);

-- +goose Down
DROP TABLE IF EXISTS community_video_comments;
