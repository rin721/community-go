package service

import (
	"context"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
)

func TestServiceHomePayloadBuildsCategoryTreeAndVideos(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	payload, err := svc.GetHomePayload(context.Background())
	if err != nil {
		t.Fatalf("GetHomePayload() error = %v", err)
	}
	if payload.Announcement == nil || payload.Announcement.ID != "community-live-data" {
		t.Fatalf("expected community announcement, got %#v", payload.Announcement)
	}
	if len(payload.Categories) != 2 {
		t.Fatalf("expected two root categories, got %#v", payload.Categories)
	}
	if payload.Categories[1].Slug != "creative" || len(payload.Categories[1].Children) != 1 {
		t.Fatalf("expected creative root with design child, got %#v", payload.Categories[1])
	}
	if len(payload.Latest.Items) != 2 {
		t.Fatalf("expected latest videos, got %#v", payload.Latest.Items)
	}
	if got := payload.Latest.Items[0].Uploader.Handle; got != "rin721" {
		t.Fatalf("expected decorated uploader handle rin721, got %q", got)
	}
	if got := payload.Latest.Items[0].Categories[0].Slug; got != "design" {
		t.Fatalf("expected decorated category design, got %q", got)
	}
}

func TestServiceVideoDetailDecoratesSourcesTagsAndRelated(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	detail, err := svc.GetVideoDetail(context.Background(), "aoi-alpha")
	if err != nil {
		t.Fatalf("GetVideoDetail() error = %v", err)
	}
	if detail.ID != "video-aoi-alpha" || detail.SourceURL == "" {
		t.Fatalf("unexpected detail: %#v", detail)
	}
	if len(detail.Sources) != 1 || !detail.Sources[0].IsDefault {
		t.Fatalf("expected default source, got %#v", detail.Sources)
	}
	if len(detail.Tags) != 2 || detail.Tags[0] != "Banyao" {
		t.Fatalf("expected display tags, got %#v", detail.Tags)
	}
	if len(detail.Related) != 1 || detail.Related[0].ID == detail.ID {
		t.Fatalf("expected one different related video, got %#v", detail.Related)
	}
}

func TestServiceSearchAggregatesVideosCreatorsAndCategories(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	payload, err := svc.Search(context.Background(), "设计", 10)
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if payload.Query != "设计" {
		t.Fatalf("expected original query, got %q", payload.Query)
	}
	if len(payload.Videos.Items) == 0 {
		t.Fatalf("expected matching videos, got %#v", payload)
	}
	if len(payload.Categories.Items) != 1 || payload.Categories.Items[0].Slug != "design" {
		t.Fatalf("expected design category match, got %#v", payload.Categories.Items)
	}
	if payload.TotalCount != len(payload.Videos.Items)+len(payload.Categories.Items)+len(payload.Creators.Items) {
		t.Fatalf("unexpected total count in %#v", payload)
	}
}

func TestServiceVideoCommentsCreatesAndListsPersistedComments(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{
		NewID: func() string { return "unit-comment" },
		Now:   fixedNow,
	})

	comment, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{
		AuthorName: "  Aoi Viewer  ",
		Body:       "  这条评论来自后端社区模块。  ",
	})
	if err != nil {
		t.Fatalf("CreateVideoComment() error = %v", err)
	}
	if comment.ID != "comment-unit-comment" || comment.VideoID != "video-aoi-alpha" {
		t.Fatalf("unexpected created comment: %#v", comment)
	}
	if comment.AuthorName != "Aoi Viewer" || comment.Body != "这条评论来自后端社区模块。" {
		t.Fatalf("expected normalized comment, got %#v", comment)
	}

	payload, err := svc.GetVideoComments(context.Background(), "aoi-alpha", model.VideoCommentFilter{Sort: model.CommentSortNewest})
	if err != nil {
		t.Fatalf("GetVideoComments() error = %v", err)
	}
	if payload.VideoID != "video-aoi-alpha" || payload.TotalCount != 2 {
		t.Fatalf("unexpected comment payload: %#v", payload)
	}
	if payload.Items[0].ID != comment.ID {
		t.Fatalf("expected newest comment first, got %#v", payload.Items)
	}
}

func TestServiceCreateVideoCommentRejectsEmptyInput(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

type fakeRepository struct {
	categories    []model.Category
	creators      []model.Creator
	videos        []model.Video
	categorySlugs map[string][]string
	comments      map[string][]model.VideoComment
	danmaku       map[string][]model.VideoDanmakuItem
	sources       map[string][]model.VideoSourceOption
	tags          map[string][]string
}

func newFakeRepository() *fakeRepository {
	description := "视觉与交互"
	bio := "关注设计和后端契约"
	avatar := "https://example.invalid/avatar.png"
	return &fakeRepository{
		categories: []model.Category{
			{ID: "cat-home", Slug: "home", Name: "首页", Order: 0},
			{ID: "cat-creative", Slug: "creative", Name: "创作", Order: 10},
			{ID: "cat-design", Slug: "design", Name: "设计", Description: &description, ParentSlug: strPtr("creative"), Order: 10},
		},
		creators: []model.Creator{
			{UserSummary: model.UserSummary{ID: "user-rin", Handle: "rin721", DisplayName: "Rin721", AvatarURL: &avatar}, Bio: &bio, FollowerCount: 42, JoinedAt: fixedNow()},
			{UserSummary: model.UserSummary{ID: "user-lab", Handle: "aoi-lab", DisplayName: "Aoi Lab"}, FollowerCount: 24, JoinedAt: fixedNow()},
		},
		videos: []model.Video{
			{ID: "video-aoi-alpha", Slug: "aoi-alpha", Title: "Banyao Alpha 设计预览", Description: &description, ThumbnailURL: "gradient:aoi-alpha", DurationSeconds: 300, ViewCount: 1200, CommentCount: 12, LikeCount: 20, SourceURL: "https://example.invalid/a.mp4", PublishedAt: fixedNow(), UploaderID: "user-rin"},
			{ID: "video-go-api", Slug: "go-api-ready", Title: "Go API Ready", Description: strPtr("后端接入"), ThumbnailURL: "gradient:go-api", DurationSeconds: 240, ViewCount: 800, CommentCount: 8, LikeCount: 10, SourceURL: "https://example.invalid/b.mp4", PublishedAt: fixedNow().Add(-time.Hour), UploaderID: "user-lab"},
		},
		categorySlugs: map[string][]string{
			"video-aoi-alpha": {"design"},
			"video-go-api":    {"design"},
		},
		comments: map[string][]model.VideoComment{
			"video-aoi-alpha": {
				{ID: "comment-seed", VideoID: "video-aoi-alpha", Body: "已有评论", AuthorName: "Design Note", Status: model.CommentStatusVisible, CreatedAt: fixedNow().Add(-time.Minute), UpdatedAt: fixedNow().Add(-time.Minute)},
			},
		},
		danmaku: map[string][]model.VideoDanmakuItem{
			"video-aoi-alpha": {{ID: "d1", VideoID: "video-aoi-alpha", Body: "清晰", TimeSeconds: 2, Mode: model.DanmakuModeScroll, Color: "#ffffff", AuthorName: "viewer", CreatedAt: fixedNow()}},
		},
		sources: map[string][]model.VideoSourceOption{
			"video-aoi-alpha": {{ID: "s1", VideoID: "video-aoi-alpha", Src: "https://example.invalid/a.mp4", Kind: model.VideoSourceKindNative, Label: "主源", IsDefault: true}},
		},
		tags: map[string][]string{
			"video-aoi-alpha": {"Banyao", "设计"},
		},
	}
}

func (r *fakeRepository) FindCreatorByHandle(_ context.Context, handle string) (*model.Creator, error) {
	for _, creator := range r.creators {
		if creator.Handle == handle {
			item := creator
			return &item, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindVideoByIDOrSlug(_ context.Context, idOrSlug string) (*model.Video, error) {
	for _, video := range r.videos {
		if video.ID == idOrSlug || video.Slug == idOrSlug {
			item := video
			return &item, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) ListCategories(context.Context) ([]model.Category, error) {
	return append([]model.Category(nil), r.categories...), nil
}

func (r *fakeRepository) ListCategorySlugs(_ context.Context, videoID string) ([]string, error) {
	return append([]string(nil), r.categorySlugs[videoID]...), nil
}

func (r *fakeRepository) ListCreators(_ context.Context, limit int) ([]model.Creator, error) {
	items := append([]model.Creator(nil), r.creators...)
	if limit > 0 && len(items) > limit {
		return items[:limit], nil
	}
	return items, nil
}

func (r *fakeRepository) ListDanmaku(_ context.Context, videoID string) ([]model.VideoDanmakuItem, error) {
	return append([]model.VideoDanmakuItem(nil), r.danmaku[videoID]...), nil
}

func (r *fakeRepository) ListVideoComments(_ context.Context, videoID string, filter model.VideoCommentFilter) ([]model.VideoComment, error) {
	items := append([]model.VideoComment(nil), r.comments[videoID]...)
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) CountVideoComments(_ context.Context, videoID string) (int, error) {
	return len(r.comments[videoID]), nil
}

func (r *fakeRepository) CreateVideoComment(_ context.Context, comment model.VideoComment) error {
	r.comments[comment.VideoID] = append(r.comments[comment.VideoID], comment)
	for index := range r.videos {
		if r.videos[index].ID == comment.VideoID {
			r.videos[index].CommentCount++
			break
		}
	}
	return nil
}

func (r *fakeRepository) ListSources(_ context.Context, videoID string) ([]model.VideoSourceOption, error) {
	return append([]model.VideoSourceOption(nil), r.sources[videoID]...), nil
}

func (r *fakeRepository) ListTags(_ context.Context, videoID string) ([]string, error) {
	return append([]string(nil), r.tags[videoID]...), nil
}

func (r *fakeRepository) ListVideos(_ context.Context, filter model.VideoFilter) ([]model.Video, error) {
	items := append([]model.Video(nil), r.videos...)
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func fixedNow() time.Time {
	return time.Date(2026, 6, 26, 0, 0, 0, 0, time.UTC)
}

func strPtr(value string) *string {
	return &value
}
