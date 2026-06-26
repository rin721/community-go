package service

import (
	"context"
	"sort"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
	authtypes "github.com/open-console/console-platform/types/auth"
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
	if len(payload.Categories[1].Children[0].Children) != 1 || payload.Categories[1].Children[0].Children[0].Slug != "motion" {
		t.Fatalf("expected design child to keep motion grandchild, got %#v", payload.Categories[1].Children[0])
	}
	if len(payload.Latest.Items) != 2 {
		t.Fatalf("expected latest videos, got %#v", payload.Latest.Items)
	}
	if len(payload.Dynamics.Items) != 2 {
		t.Fatalf("expected latest dynamics, got %#v", payload.Dynamics.Items)
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
		Body:       "  这条评论来自社区讨论区。  ",
	})
	if err != nil {
		t.Fatalf("CreateVideoComment() error = %v", err)
	}
	if comment.ID != "comment-unit-comment" || comment.VideoID != "video-aoi-alpha" {
		t.Fatalf("unexpected created comment: %#v", comment)
	}
	if comment.AuthorName != "Aoi Viewer" || comment.Body != "这条评论来自社区讨论区。" {
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

func TestServiceCreateVideoDanmakuPersistsAndNormalizesInput(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{
		NewID: func() string { return "unit-danmaku" },
		Now:   fixedNow,
	})

	item, err := svc.CreateVideoDanmaku(context.Background(), "aoi-alpha", model.CreateVideoDanmakuRequest{
		AuthorName:  "  Aoi Viewer  ",
		Body:        "  Smooth danmaku  ",
		TimeSeconds: 999,
		Mode:        "invalid",
		Color:       "pink",
	})
	if err != nil {
		t.Fatalf("CreateVideoDanmaku() error = %v", err)
	}
	if item.ID != "danmaku-unit-danmaku" || item.VideoID != "video-aoi-alpha" {
		t.Fatalf("unexpected created danmaku: %#v", item)
	}
	if item.AuthorName != "Aoi Viewer" || item.Body != "Smooth danmaku" {
		t.Fatalf("expected normalized author and body, got %#v", item)
	}
	if item.TimeSeconds != 299 || item.Mode != model.DanmakuModeScroll || item.Color != "#ffffff" {
		t.Fatalf("expected normalized time, mode and color, got %#v", item)
	}

	payload, err := svc.GetVideoDanmaku(context.Background(), "aoi-alpha")
	if err != nil {
		t.Fatalf("GetVideoDanmaku() error = %v", err)
	}
	if payload.VideoID != "video-aoi-alpha" || payload.TotalCount != 2 {
		t.Fatalf("unexpected danmaku payload: %#v", payload)
	}
	if payload.Items[1].ID != item.ID {
		t.Fatalf("expected created danmaku in persisted list, got %#v", payload.Items)
	}
}

func TestServiceCreateVideoDanmakuRejectsEmptyInput(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateVideoDanmaku(context.Background(), "aoi-alpha", model.CreateVideoDanmakuRequest{AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreatorFollowStatePersistsAndUpdatesFeed(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{Now: fixedNow})
	req := model.CreatorFollowRequest{ClientID: "browser-client-1"}

	state, err := svc.FollowCreator(context.Background(), "rin721", req)
	if err != nil {
		t.Fatalf("FollowCreator() error = %v", err)
	}
	if !state.Following || state.FollowerCount != 43 || state.FollowedAt == nil {
		t.Fatalf("unexpected follow state: %#v", state)
	}

	feed, err := svc.FollowingFeed(context.Background(), req)
	if err != nil {
		t.Fatalf("FollowingFeed() error = %v", err)
	}
	if feed.FollowingCount != 1 || len(feed.Creators) != 1 || feed.Creators[0].Handle != "rin721" {
		t.Fatalf("expected client following feed, got %#v", feed)
	}
	if len(feed.Latest.Items) != 1 || feed.Latest.Items[0].Uploader.ID != "user-rin" {
		t.Fatalf("expected followed creator latest videos, got %#v", feed.Latest.Items)
	}
	if len(feed.Dynamics.Items) != 1 || feed.Dynamics.Items[0].Author == nil || feed.Dynamics.Items[0].Author.ID != "user-rin" {
		t.Fatalf("expected followed creator dynamics, got %#v", feed.Dynamics.Items)
	}

	state, err = svc.UnfollowCreator(context.Background(), "rin721", req)
	if err != nil {
		t.Fatalf("UnfollowCreator() error = %v", err)
	}
	if state.Following || state.FollowerCount != 42 || state.FollowedAt != nil {
		t.Fatalf("expected unfollowed state, got %#v", state)
	}
}

func TestServiceCreatorFollowRejectsMissingClientID(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.FollowCreator(context.Background(), "rin721", model.CreatorFollowRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCommunityDynamicsListsAndCreatesTimelineItems(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{
		NewID: func() string { return "unit-dynamic" },
		Now:   fixedNow,
	})

	created, err := svc.CreateCommunityDynamic(context.Background(), model.CreateCommunityDynamicRequest{
		AuthorName: "  Aoi Viewer  ",
		Body:       "  The timeline feels easy to read.  ",
		ClientID:   " browser-client-1 ",
		VideoID:    "aoi-alpha",
	})
	if err != nil {
		t.Fatalf("CreateCommunityDynamic() error = %v", err)
	}
	if created.ID != "dynamic-unit-dynamic" || created.VideoID != "video-aoi-alpha" {
		t.Fatalf("unexpected created dynamic: %#v", created)
	}
	if created.Kind != model.CommunityDynamicKindVideoUpdate || created.Video == nil {
		t.Fatalf("expected video dynamic with decorated video, got %#v", created)
	}
	if created.AuthorName != "Aoi Viewer" || created.Body != "The timeline feels easy to read." {
		t.Fatalf("expected normalized dynamic, got %#v", created)
	}

	payload, err := svc.ListCommunityDynamics(context.Background(), model.CommunityDynamicFilter{ClientID: " browser-client-1 ", Limit: 10})
	if err != nil {
		t.Fatalf("ListCommunityDynamics() error = %v", err)
	}
	if payload.ClientID == nil || *payload.ClientID != "browser-client-1" {
		t.Fatalf("expected normalized client id, got %#v", payload.ClientID)
	}
	if len(payload.Items.Items) != 3 || payload.Items.Items[0].ID != created.ID {
		t.Fatalf("expected created dynamic first, got %#v", payload.Items.Items)
	}
}

func TestServiceCommunityDynamicRejectsInvalidInput(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateCommunityDynamic(context.Background(), model.CreateCommunityDynamicRequest{AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
	if _, err := svc.CreateCommunityDynamic(context.Background(), model.CreateCommunityDynamicRequest{ClientID: "browser-client-1", AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for empty body, got %v", err)
	}
}

func TestServiceCreateCommunitySubmissionPersistsPendingReviewMetadata(t *testing.T) {
	repo := newFakeRepository()
	ids := []string{"unit-submission", "unit-submission-notification"}
	nextID := 0
	svc := New(repo, Config{
		NewID: func() string {
			id := ids[nextID]
			nextID++
			return id
		},
		Now: fixedNow,
	})

	item, err := svc.CreateCommunitySubmission(context.Background(), model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "  Aoi Creator  ",
		CategorySlug:  "design",
		ClientID:      " browser-client-1 ",
		Description:   "  Metadata only submission  ",
		SourceName:    "  alpha-preview.mp4  ",
		SourceSize:    1024 * 1024,
		SourceType:    "video/mp4",
		Tags:          []string{" Aoi ", "#Design", "aoi"},
		Title:         "  Alpha preview upload  ",
		Visibility:    model.CommunitySubmissionVisibilityUnlisted,
	})
	if err != nil {
		t.Fatalf("CreateCommunitySubmission() error = %v", err)
	}
	if item.ID != "submission-unit-submission" || item.Status != model.CommunitySubmissionStatusPendingReview {
		t.Fatalf("expected pending submission id/status, got %#v", item)
	}
	if item.ClientID != "browser-client-1" || item.AuthorName != "Aoi Creator" || item.Title != "Alpha preview upload" {
		t.Fatalf("expected normalized submitter and title, got %#v", item)
	}
	if item.Category == nil || item.Category.Slug != "design" || item.CategorySlug != "design" {
		t.Fatalf("expected decorated category, got %#v", item)
	}
	if len(item.Tags) != 2 || item.Tags[0] != "Aoi" || item.Tags[1] != "Design" {
		t.Fatalf("expected normalized unique tags, got %#v", item.Tags)
	}
	if item.SourceName != "alpha-preview.mp4" || item.SourceSize != 1024*1024 || item.SourceType != "video/mp4" {
		t.Fatalf("expected source metadata only, got %#v", item)
	}
	if len(repo.submissions) != 1 || repo.submissions[0].TagsJSON == "" {
		t.Fatalf("expected persisted submission with tag json, got %#v", repo.submissions)
	}
	if len(repo.notifications) != 1 || repo.notifications[0].Kind != model.CommunityNotificationKindSubmission {
		t.Fatalf("expected submission notification, got %#v", repo.notifications)
	}

	payload, err := svc.ListCommunitySubmissions(context.Background(), model.CommunitySubmissionFilter{ClientID: " browser-client-1 "})
	if err != nil {
		t.Fatalf("ListCommunitySubmissions() error = %v", err)
	}
	if payload.ClientID == nil || *payload.ClientID != "browser-client-1" || len(payload.Items.Items) != 1 {
		t.Fatalf("expected client submission payload, got %#v", payload)
	}
}

func TestServiceCommunitySubmissionRejectsInvalidInput(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	valid := model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "design",
		ClientID:      "browser-client-1",
		SourceName:    "alpha-preview.mp4",
		SourceSize:    1024,
		Title:         "Alpha preview upload",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	}
	for name, mutate := range map[string]func(*model.CreateCommunitySubmissionRequest){
		"missing client": func(req *model.CreateCommunitySubmissionRequest) { req.ClientID = "" },
		"short title":    func(req *model.CreateCommunitySubmissionRequest) { req.Title = "abc" },
		"bad category":   func(req *model.CreateCommunitySubmissionRequest) { req.CategorySlug = "missing" },
		"bad visibility": func(req *model.CreateCommunitySubmissionRequest) { req.Visibility = "friends" },
		"missing source": func(req *model.CreateCommunitySubmissionRequest) { req.SourceName = "" },
		"zero size":      func(req *model.CreateCommunitySubmissionRequest) { req.SourceSize = 0 },
	} {
		req := valid
		mutate(&req)
		if _, err := svc.CreateCommunitySubmission(context.Background(), req); err != ErrInvalidInput {
			t.Fatalf("%s: expected ErrInvalidInput, got %v", name, err)
		}
	}
}

func TestServiceCommunityAccountSubmissionUsesPrincipalIdentity(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{
		NewID: func() string { return "account-submission" },
		Now:   fixedNow,
	})
	principal := authtypes.Principal{
		UserID:   42,
		Username: "Rin Creator",
		Email:    "rin@example.com",
	}

	item, err := svc.CreateCommunityAccountSubmission(context.Background(), principal, model.CreateCommunityAccountSubmissionRequest{
		AllowComments: true,
		CategorySlug:  "design",
		SourceName:    "account-preview.mp4",
		SourceSize:    2048,
		SourceType:    "video/mp4",
		Title:         "Account preview upload",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	})
	if err != nil {
		t.Fatalf("CreateCommunityAccountSubmission() error = %v", err)
	}
	if item.ClientID != "account:42" || item.AuthorName != "Rin Creator" {
		t.Fatalf("expected account identity, got %#v", item)
	}

	payload, err := svc.ListCommunityAccountSubmissions(context.Background(), principal, 12)
	if err != nil {
		t.Fatalf("ListCommunityAccountSubmissions() error = %v", err)
	}
	if !payload.Authenticated || payload.ClientID == nil || *payload.ClientID != "account:42" || len(payload.Items.Items) != 1 {
		t.Fatalf("expected authenticated account submissions, got %#v", payload)
	}
}

func TestServiceVideoInteractionPersistsAndUpdatesLikeCount(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{Now: fixedNow})
	req := model.VideoInteractionRequest{ClientID: "browser-client-1"}

	state, err := svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindLike, req)
	if err != nil {
		t.Fatalf("SetVideoInteraction() error = %v", err)
	}
	if !state.Liked || state.LikeCount != 21 {
		t.Fatalf("expected active like and incremented count, got %#v", state)
	}

	state, err = svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindLike, req)
	if err != nil {
		t.Fatalf("SetVideoInteraction() idempotent error = %v", err)
	}
	if !state.Liked || state.LikeCount != 21 {
		t.Fatalf("expected idempotent like count, got %#v", state)
	}

	state, err = svc.UnsetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindLike, req)
	if err != nil {
		t.Fatalf("UnsetVideoInteraction() error = %v", err)
	}
	if state.Liked || state.LikeCount != 20 {
		t.Fatalf("expected inactive like and restored count, got %#v", state)
	}
}

func TestServiceVideoLibraryCollectsFavoriteAndWatchLater(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{Now: fixedNow})
	req := model.VideoInteractionRequest{ClientID: "browser-client-1"}

	if _, err := svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindFavorite, req); err != nil {
		t.Fatalf("SetVideoInteraction(favorite) error = %v", err)
	}
	if _, err := svc.SetVideoInteraction(context.Background(), "go-api-ready", model.VideoInteractionKindWatchLater, req); err != nil {
		t.Fatalf("SetVideoInteraction(watch_later) error = %v", err)
	}

	payload, err := svc.VideoLibrary(context.Background(), req)
	if err != nil {
		t.Fatalf("VideoLibrary() error = %v", err)
	}
	if payload.ClientID == nil || *payload.ClientID != req.ClientID {
		t.Fatalf("expected normalized client id, got %#v", payload.ClientID)
	}
	if payload.FavoriteCount != 1 || payload.Favorites.Items[0].ID != "video-aoi-alpha" {
		t.Fatalf("expected favorite video from backend relations, got %#v", payload.Favorites.Items)
	}
	if payload.WatchLaterCount != 1 || payload.WatchLater.Items[0].ID != "video-go-api" {
		t.Fatalf("expected watch later video from backend relations, got %#v", payload.WatchLater.Items)
	}
}

func TestServiceVideoHistoryPersistsListsAndClearsProgress(t *testing.T) {
	repo := newFakeRepository()
	now := fixedNow()
	svc := New(repo, Config{Now: func() time.Time { return now }})
	req := model.VideoHistoryRequest{ClientID: " browser-client-1 ", ProgressSeconds: 999}

	item, err := svc.RecordVideoHistory(context.Background(), "aoi-alpha", req)
	if err != nil {
		t.Fatalf("RecordVideoHistory() error = %v", err)
	}
	if item.Video.ID != "video-aoi-alpha" || item.ProgressSeconds != 300 || !item.LastViewedAt.Equal(now) {
		t.Fatalf("expected normalized first history item, got %#v", item)
	}

	now = now.Add(time.Minute)
	if _, err := svc.RecordVideoHistory(context.Background(), "go-api-ready", model.VideoHistoryRequest{
		ClientID:        "browser-client-1",
		ProgressSeconds: 20,
	}); err != nil {
		t.Fatalf("RecordVideoHistory(second) error = %v", err)
	}

	payload, err := svc.VideoHistory(context.Background(), model.VideoHistoryFilter{ClientID: " browser-client-1 ", Limit: 10})
	if err != nil {
		t.Fatalf("VideoHistory() error = %v", err)
	}
	if payload.ClientID == nil || *payload.ClientID != "browser-client-1" || payload.HistoryCount != 2 {
		t.Fatalf("expected normalized history payload, got %#v", payload)
	}
	if payload.Items.Items[0].Video.ID != "video-go-api" || payload.Items.Items[1].Video.ID != "video-aoi-alpha" {
		t.Fatalf("expected latest viewed video first, got %#v", payload.Items.Items)
	}

	cleared, err := svc.ClearVideoHistory(context.Background(), model.VideoHistoryClearRequest{ClientID: "browser-client-1"})
	if err != nil {
		t.Fatalf("ClearVideoHistory() error = %v", err)
	}
	if cleared.HistoryCount != 0 || len(cleared.Items.Items) != 0 {
		t.Fatalf("expected empty history after clear, got %#v", cleared)
	}
}

func TestServiceVideoInteractionRejectsMissingClientID(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindFavorite, model.VideoInteractionRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceVideoHistoryRejectsMissingClientID(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.RecordVideoHistory(context.Background(), "aoi-alpha", model.VideoHistoryRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateVideoReportPersistsPendingReceipt(t *testing.T) {
	repo := newFakeRepository()
	svc := New(repo, Config{
		NewID: func() string { return "unit-report" },
		Now:   fixedNow,
	})

	receipt, err := svc.CreateVideoReport(context.Background(), "aoi-alpha", model.CreateVideoReportRequest{
		ClientID: " browser-client-1 ",
		Reason:   model.CommunityReportReasonMisleading,
		Detail:   "  标题和内容不一致  ",
	})
	if err != nil {
		t.Fatalf("CreateVideoReport() error = %v", err)
	}
	if receipt.ID != "report-unit-report" || receipt.VideoID != "video-aoi-alpha" || receipt.TargetKind != model.CommunityReportTargetVideo {
		t.Fatalf("unexpected report receipt: %#v", receipt)
	}
	if receipt.ClientID != "browser-client-1" || receipt.Reason != model.CommunityReportReasonMisleading || receipt.Status != model.CommunityReportStatusPending {
		t.Fatalf("expected normalized pending receipt, got %#v", receipt)
	}
	if len(repo.reports) != 1 || repo.reports[0].Detail != "标题和内容不一致" {
		t.Fatalf("expected persisted normalized report, got %#v", repo.reports)
	}
}

func TestServiceCreateVideoReportRejectsInvalidInput(t *testing.T) {
	svc := New(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateVideoReport(context.Background(), "aoi-alpha", model.CreateVideoReportRequest{Reason: model.CommunityReportReasonSpam}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for missing client id, got %v", err)
	}
	if _, err := svc.CreateVideoReport(context.Background(), "aoi-alpha", model.CreateVideoReportRequest{ClientID: "browser-client-1", Reason: "unknown"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for invalid reason, got %v", err)
	}
}

func TestServiceCommunityNotificationsTrackAnonymousClientActions(t *testing.T) {
	repo := newFakeRepository()
	ids := []string{
		"unit-comment",
		"unit-comment-notification",
		"unit-danmaku",
		"unit-danmaku-notification",
		"unit-favorite-notification",
		"unit-report",
		"unit-report-notification",
	}
	nextID := 0
	svc := New(repo, Config{
		NewID: func() string {
			id := ids[nextID]
			nextID++
			return id
		},
		Now: fixedNow,
	})
	req := model.VideoInteractionRequest{ClientID: "browser-client-1"}

	if _, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{
		AuthorName: "Aoi Viewer",
		Body:       "A notification worthy comment",
		ClientID:   " browser-client-1 ",
	}); err != nil {
		t.Fatalf("CreateVideoComment() error = %v", err)
	}
	if _, err := svc.CreateVideoDanmaku(context.Background(), "aoi-alpha", model.CreateVideoDanmakuRequest{
		AuthorName:  "Aoi Viewer",
		Body:        "Notification danmaku",
		TimeSeconds: 3,
		Mode:        model.DanmakuModeScroll,
		Color:       "#ffffff",
		ClientID:    "browser-client-1",
	}); err != nil {
		t.Fatalf("CreateVideoDanmaku() error = %v", err)
	}
	if _, err := svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindFavorite, req); err != nil {
		t.Fatalf("SetVideoInteraction() error = %v", err)
	}
	if _, err := svc.CreateVideoReport(context.Background(), "aoi-alpha", model.CreateVideoReportRequest{
		ClientID: "browser-client-1",
		Reason:   model.CommunityReportReasonSpam,
	}); err != nil {
		t.Fatalf("CreateVideoReport() error = %v", err)
	}

	payload, err := svc.CommunityNotifications(context.Background(), model.CommunityNotificationFilter{ClientID: " browser-client-1 "})
	if err != nil {
		t.Fatalf("CommunityNotifications() error = %v", err)
	}
	if payload.ClientID == nil || *payload.ClientID != "browser-client-1" {
		t.Fatalf("expected normalized client id, got %#v", payload.ClientID)
	}
	if payload.UnreadCount != 4 || len(payload.Items.Items) != 4 {
		t.Fatalf("expected four unread notifications, got %#v", payload)
	}
	kinds := map[string]bool{}
	for _, item := range payload.Items.Items {
		kinds[item.Kind] = true
		if item.Link != "/video/aoi-alpha" {
			t.Fatalf("expected video link in notification, got %#v", item)
		}
	}
	for _, kind := range []string{
		model.CommunityNotificationKindComment,
		model.CommunityNotificationKindDanmaku,
		model.CommunityNotificationKindInteraction,
		model.CommunityNotificationKindReport,
	} {
		if !kinds[kind] {
			t.Fatalf("missing notification kind %q in %#v", kind, payload.Items.Items)
		}
	}

	updated, err := svc.MarkCommunityNotificationsRead(context.Background(), model.CommunityNotificationRequest{ClientID: "browser-client-1"})
	if err != nil {
		t.Fatalf("MarkCommunityNotificationsRead() error = %v", err)
	}
	if updated.UnreadCount != 0 {
		t.Fatalf("expected unread count 0 after mark read, got %#v", updated)
	}
	for _, item := range updated.Items.Items {
		if item.ReadAt == nil {
			t.Fatalf("expected notification read_at after mark read, got %#v", item)
		}
	}
}

type fakeRepository struct {
	categories    []model.Category
	creators      []model.Creator
	videos        []model.Video
	categorySlugs map[string][]string
	comments      map[string][]model.VideoComment
	danmaku       map[string][]model.VideoDanmakuItem
	dynamics      []model.CommunityDynamic
	follows       map[string][]model.CreatorFollow
	histories     map[string][]model.VideoHistory
	interactions  map[string][]model.VideoInteraction
	notifications []model.CommunityNotification
	reports       []model.CommunityReport
	submissions   []model.CommunitySubmission
	sources       map[string][]model.VideoSourceOption
	tags          map[string][]string
}

func newFakeRepository() *fakeRepository {
	description := "视觉与交互"
	bio := "关注设计和社区体验"
	avatar := "https://example.invalid/avatar.png"
	return &fakeRepository{
		categories: []model.Category{
			{ID: "cat-home", Slug: "home", Name: "首页", Order: 0},
			{ID: "cat-creative", Slug: "creative", Name: "创作", Order: 10},
			{ID: "cat-design", Slug: "design", Name: "设计", Description: &description, ParentSlug: strPtr("creative"), Order: 10},
			{ID: "cat-motion", Slug: "motion", Name: "动效", ParentSlug: strPtr("design"), Order: 5},
		},
		creators: []model.Creator{
			{UserSummary: model.UserSummary{ID: "user-rin", Handle: "rin721", DisplayName: "Rin721", AvatarURL: &avatar}, Bio: &bio, FollowerCount: 42, JoinedAt: fixedNow()},
			{UserSummary: model.UserSummary{ID: "user-lab", Handle: "aoi-lab", DisplayName: "Aoi Lab"}, FollowerCount: 24, JoinedAt: fixedNow()},
		},
		videos: []model.Video{
			{ID: "video-aoi-alpha", Slug: "aoi-alpha", Title: "Banyao Alpha 设计预览", Description: &description, ThumbnailURL: "gradient:aoi-alpha", DurationSeconds: 300, ViewCount: 1200, CommentCount: 12, LikeCount: 20, SourceURL: "https://example.invalid/a.mp4", PublishedAt: fixedNow(), UploaderID: "user-rin"},
			{ID: "video-go-api", Slug: "go-api-ready", Title: "Community Notes", Description: strPtr("社区动线"), ThumbnailURL: "gradient:go-api", DurationSeconds: 240, ViewCount: 800, CommentCount: 8, LikeCount: 10, SourceURL: "https://example.invalid/b.mp4", PublishedAt: fixedNow().Add(-time.Hour), UploaderID: "user-lab"},
		},
		categorySlugs: map[string][]string{
			"video-aoi-alpha": {"design"},
			"video-go-api":    {"design"},
		},
		comments: map[string][]model.VideoComment{
			"video-aoi-alpha": {
				{ID: "comment-seed", VideoID: "video-aoi-alpha", Body: "已有评论", AuthorName: "Color Note", Status: model.CommentStatusVisible, CreatedAt: fixedNow().Add(-time.Minute), UpdatedAt: fixedNow().Add(-time.Minute)},
			},
		},
		danmaku: map[string][]model.VideoDanmakuItem{
			"video-aoi-alpha": {{ID: "d1", VideoID: "video-aoi-alpha", Body: "清晰", TimeSeconds: 2, Mode: model.DanmakuModeScroll, Color: "#ffffff", AuthorName: "viewer", CreatedAt: fixedNow()}},
		},
		dynamics: []model.CommunityDynamic{
			{ID: "dynamic-rin", CreatorID: "user-rin", VideoID: "video-aoi-alpha", AuthorName: "Rin721", Body: "首页动态整理成更轻的阅读节奏。", Kind: model.CommunityDynamicKindVideoUpdate, Status: model.CommunityDynamicStatusVisible, CreatedAt: fixedNow(), UpdatedAt: fixedNow()},
			{ID: "dynamic-lab", CreatorID: "user-lab", VideoID: "video-go-api", AuthorName: "Aoi Lab", Body: "从投稿到收藏这一段路径很顺。", Kind: model.CommunityDynamicKindVideoUpdate, Status: model.CommunityDynamicStatusVisible, CreatedAt: fixedNow().Add(-time.Minute), UpdatedAt: fixedNow().Add(-time.Minute)},
		},
		follows:      map[string][]model.CreatorFollow{},
		histories:    map[string][]model.VideoHistory{},
		interactions: map[string][]model.VideoInteraction{},
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

func (r *fakeRepository) FindCreatorFollow(_ context.Context, creatorID string, clientID string) (*model.CreatorFollow, error) {
	for _, follow := range r.follows[clientID] {
		if follow.CreatorID == creatorID && follow.DeletedAt == nil {
			item := follow
			return &item, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindVideoInteraction(_ context.Context, videoID string, clientID string, kind string) (*model.VideoInteraction, error) {
	for _, interaction := range r.interactions[clientID] {
		if interaction.VideoID == videoID && interaction.Kind == kind && interaction.DeletedAt == nil {
			item := interaction
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

func (r *fakeRepository) ListCreatorFollows(_ context.Context, clientID string, limit int) ([]model.CreatorFollow, error) {
	items := make([]model.CreatorFollow, 0)
	for _, follow := range r.follows[clientID] {
		if follow.DeletedAt == nil {
			items = append(items, follow)
		}
	}
	if limit > 0 && len(items) > limit {
		return items[:limit], nil
	}
	return items, nil
}

func (r *fakeRepository) ListVideoInteractions(_ context.Context, filter model.VideoInteractionFilter) ([]model.VideoInteraction, error) {
	items := make([]model.VideoInteraction, 0)
	for _, interaction := range r.interactions[filter.ClientID] {
		if interaction.DeletedAt != nil {
			continue
		}
		if filter.Kind != "" && interaction.Kind != filter.Kind {
			continue
		}
		items = append(items, interaction)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) ListVideoHistory(_ context.Context, filter model.VideoHistoryFilter) ([]model.VideoHistory, error) {
	items := make([]model.VideoHistory, 0)
	for _, history := range r.histories[filter.ClientID] {
		if history.DeletedAt != nil {
			continue
		}
		items = append(items, history)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].LastViewedAt.Equal(items[j].LastViewedAt) {
			return items[i].VideoID < items[j].VideoID
		}
		return items[i].LastViewedAt.After(items[j].LastViewedAt)
	})
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
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

func (r *fakeRepository) CreateVideoDanmaku(_ context.Context, item model.VideoDanmakuItem) error {
	r.danmaku[item.VideoID] = append(r.danmaku[item.VideoID], item)
	return nil
}

func (r *fakeRepository) CreateCommunityReport(_ context.Context, report model.CommunityReport) error {
	r.reports = append(r.reports, report)
	return nil
}

func (r *fakeRepository) CreateCommunityNotification(_ context.Context, notification model.CommunityNotification) error {
	r.notifications = append([]model.CommunityNotification{notification}, r.notifications...)
	return nil
}

func (r *fakeRepository) CreateCommunityDynamic(_ context.Context, dynamic model.CommunityDynamic) error {
	r.dynamics = append([]model.CommunityDynamic{dynamic}, r.dynamics...)
	return nil
}

func (r *fakeRepository) CreateCommunitySubmission(_ context.Context, submission model.CommunitySubmission) error {
	r.submissions = append([]model.CommunitySubmission{submission}, r.submissions...)
	return nil
}

func (r *fakeRepository) ListCommunityNotifications(_ context.Context, filter model.CommunityNotificationFilter) ([]model.CommunityNotification, error) {
	items := make([]model.CommunityNotification, 0)
	for _, notification := range r.notifications {
		if notification.ClientID != filter.ClientID || notification.DeletedAt != nil {
			continue
		}
		items = append(items, notification)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) ListCommunityDynamics(_ context.Context, filter model.CommunityDynamicFilter) ([]model.CommunityDynamic, error) {
	allowedCreators := make(map[string]struct{}, len(filter.CreatorIDs))
	for _, creatorID := range filter.CreatorIDs {
		allowedCreators[creatorID] = struct{}{}
	}
	items := make([]model.CommunityDynamic, 0)
	for _, dynamic := range r.dynamics {
		if dynamic.DeletedAt != nil || dynamic.Status != model.CommunityDynamicStatusVisible {
			continue
		}
		if len(allowedCreators) > 0 {
			if _, ok := allowedCreators[dynamic.CreatorID]; !ok {
				continue
			}
		}
		items = append(items, dynamic)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) ListCommunitySubmissions(_ context.Context, filter model.CommunitySubmissionFilter) ([]model.CommunitySubmission, error) {
	items := make([]model.CommunitySubmission, 0)
	for _, submission := range r.submissions {
		if submission.ClientID != filter.ClientID || submission.DeletedAt != nil {
			continue
		}
		items = append(items, submission)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) MarkCommunityNotificationsRead(_ context.Context, clientID string, now time.Time) error {
	for index := range r.notifications {
		if r.notifications[index].ClientID != clientID || r.notifications[index].DeletedAt != nil || r.notifications[index].ReadAt != nil {
			continue
		}
		r.notifications[index].ReadAt = &now
		r.notifications[index].UpdatedAt = now
	}
	return nil
}

func (r *fakeRepository) FollowCreator(_ context.Context, follow model.CreatorFollow) error {
	items := r.follows[follow.ClientID]
	for index := range items {
		if items[index].CreatorID != follow.CreatorID {
			continue
		}
		wasDeleted := items[index].DeletedAt != nil
		items[index] = follow
		r.follows[follow.ClientID] = items
		if wasDeleted {
			r.bumpFollowerCount(follow.CreatorID, 1)
		}
		return nil
	}
	r.follows[follow.ClientID] = append(items, follow)
	r.bumpFollowerCount(follow.CreatorID, 1)
	return nil
}

func (r *fakeRepository) SetVideoInteraction(_ context.Context, interaction model.VideoInteraction) error {
	items := r.interactions[interaction.ClientID]
	for index := range items {
		if items[index].VideoID != interaction.VideoID || items[index].Kind != interaction.Kind {
			continue
		}
		wasDeleted := items[index].DeletedAt != nil
		items[index] = interaction
		r.interactions[interaction.ClientID] = items
		if wasDeleted && interaction.Kind == model.VideoInteractionKindLike {
			r.bumpLikeCount(interaction.VideoID, 1)
		}
		return nil
	}
	r.interactions[interaction.ClientID] = append(items, interaction)
	if interaction.Kind == model.VideoInteractionKindLike {
		r.bumpLikeCount(interaction.VideoID, 1)
	}
	return nil
}

func (r *fakeRepository) SetVideoHistory(_ context.Context, history model.VideoHistory) error {
	items := r.histories[history.ClientID]
	for index := range items {
		if items[index].VideoID != history.VideoID {
			continue
		}
		items[index] = history
		r.histories[history.ClientID] = items
		return nil
	}
	r.histories[history.ClientID] = append(items, history)
	return nil
}

func (r *fakeRepository) UnfollowCreator(_ context.Context, creatorID string, clientID string, now time.Time) error {
	items := r.follows[clientID]
	for index := range items {
		if items[index].CreatorID != creatorID || items[index].DeletedAt != nil {
			continue
		}
		items[index].DeletedAt = &now
		items[index].UpdatedAt = now
		r.follows[clientID] = items
		r.bumpFollowerCount(creatorID, -1)
		return nil
	}
	return nil
}

func (r *fakeRepository) UnsetVideoInteraction(_ context.Context, videoID string, clientID string, kind string, now time.Time) error {
	items := r.interactions[clientID]
	for index := range items {
		if items[index].VideoID != videoID || items[index].Kind != kind || items[index].DeletedAt != nil {
			continue
		}
		items[index].DeletedAt = &now
		items[index].UpdatedAt = now
		r.interactions[clientID] = items
		if kind == model.VideoInteractionKindLike {
			r.bumpLikeCount(videoID, -1)
		}
		return nil
	}
	return nil
}

func (r *fakeRepository) ClearVideoHistory(_ context.Context, clientID string, now time.Time) error {
	items := r.histories[clientID]
	for index := range items {
		if items[index].DeletedAt != nil {
			continue
		}
		items[index].DeletedAt = &now
		items[index].UpdatedAt = now
	}
	r.histories[clientID] = items
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

func (r *fakeRepository) ListVideosByIDs(_ context.Context, ids []string) ([]model.Video, error) {
	allowed := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		allowed[id] = struct{}{}
	}
	items := make([]model.Video, 0, len(ids))
	for _, video := range r.videos {
		if _, ok := allowed[video.ID]; ok {
			items = append(items, video)
		}
	}
	return items, nil
}

func (r *fakeRepository) bumpFollowerCount(creatorID string, delta int64) {
	for index := range r.creators {
		if r.creators[index].ID != creatorID {
			continue
		}
		next := r.creators[index].FollowerCount + delta
		if next < 0 {
			next = 0
		}
		r.creators[index].FollowerCount = next
		return
	}
}

func (r *fakeRepository) bumpLikeCount(videoID string, delta int64) {
	for index := range r.videos {
		if r.videos[index].ID != videoID {
			continue
		}
		next := r.videos[index].LikeCount + delta
		if next < 0 {
			next = 0
		}
		r.videos[index].LikeCount = next
		return
	}
}

func fixedNow() time.Time {
	return time.Date(2026, 6, 26, 0, 0, 0, 0, time.UTC)
}

func strPtr(value string) *string {
	return &value
}
