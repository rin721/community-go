package service

import (
	"context"
	"errors"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
	authtypes "github.com/open-console/console-platform/types/auth"
)

func newTestService(repo *fakeRepository, cfg Config) Service {
	if cfg.CategoryProvider == nil {
		cfg.CategoryProvider = repo
	}
	return New(repo, cfg)
}

func TestServiceHomePayloadBuildsCategoryTreeAndVideos(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	payload, err := svc.GetHomePayload(context.Background())
	if err != nil {
		t.Fatalf("GetHomePayload() error = %v", err)
	}
	if payload.Announcement != nil {
		t.Fatalf("expected no announcement without provider, got %#v", payload.Announcement)
	}
	if len(payload.Categories) != 1 {
		t.Fatalf("expected one root category, got %#v", payload.Categories)
	}
	if payload.Categories[0].Slug != "unit-root" || len(payload.Categories[0].Children) != 1 {
		t.Fatalf("expected unit root with one child, got %#v", payload.Categories[0])
	}
	if len(payload.Categories[0].Children[0].Children) != 1 || payload.Categories[0].Children[0].Children[0].Slug != "unit-leaf" {
		t.Fatalf("expected unit child to keep unit leaf, got %#v", payload.Categories[0].Children[0])
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
	if got := payload.Latest.Items[0].Categories[0].Slug; got != "unit-child" {
		t.Fatalf("expected decorated unit category, got %q", got)
	}
}

func TestServiceHomePayloadUsesAnnouncementProvider(t *testing.T) {
	announcement := &model.Announcement{
		ID:       "1001",
		Title:    "真实公告",
		Body:     "来自公告模块的发布内容",
		Severity: "info",
		StartsAt: fixedNow(),
	}
	provider := &fakeHomeAnnouncementProvider{announcement: announcement}
	svc := newTestService(newFakeRepository(), Config{HomeAnnouncementProvider: provider, Now: fixedNow})

	payload, err := svc.GetHomePayload(context.Background())
	if err != nil {
		t.Fatalf("GetHomePayload() error = %v", err)
	}
	if provider.calls != 1 {
		t.Fatalf("expected announcement provider call count 1, got %d", provider.calls)
	}
	if payload.Announcement == nil || payload.Announcement.ID != "1001" || payload.Announcement.Body != "来自公告模块的发布内容" {
		t.Fatalf("expected announcement from provider, got %#v", payload.Announcement)
	}
}

func TestServiceHomePayloadReturnsAnnouncementProviderError(t *testing.T) {
	wantErr := errors.New("announcement provider failed")
	svc := newTestService(newFakeRepository(), Config{
		HomeAnnouncementProvider: &fakeHomeAnnouncementProvider{err: wantErr},
		Now:                      fixedNow,
	})

	_, err := svc.GetHomePayload(context.Background())
	if !errors.Is(err, wantErr) {
		t.Fatalf("GetHomePayload() error = %v, want %v", err, wantErr)
	}
}

func TestServiceCommunitySignupUsesCommunityAccountSession(t *testing.T) {
	repo := newFakeRepository()
	nextIDs := []int64{101, 201}
	svc := newTestService(repo, Config{
		Now:       fixedNow,
		Passwords: fakePasswordCrypto{},
		NewIntID: func() int64 {
			id := nextIDs[0]
			nextIDs = nextIDs[1:]
			return id
		},
	})

	snapshot, tokens, err := svc.SignupCommunityAccount(context.Background(), model.CommunitySignupRequest{
		Username: "rinxxx",
		Email:    "rinxxx@example.com",
		Password: "password123",
	}, SessionIssueInput{ProductCode: "console-platform", ClientType: "community_web"})
	if err != nil {
		t.Fatalf("SignupCommunityAccount() error = %v", err)
	}
	if len(repo.accounts) != 1 || repo.accounts[0].ID != 101 || repo.accounts[0].Role != model.CommunityAccountRoleRegistered {
		t.Fatalf("expected one community account, got %#v", repo.accounts)
	}
	if len(repo.sessions) != 1 || repo.sessions[0].ID != 201 || tokens.AccessToken == "" {
		t.Fatalf("expected one community session and access token, sessions=%#v tokens=%#v", repo.sessions, tokens)
	}
	if snapshot.Account == nil || snapshot.Account.ID != "101" || snapshot.Account.Role != model.CommunityAccountRoleRegistered {
		t.Fatalf("unexpected community auth snapshot: %#v", snapshot)
	}
	principal, err := svc.AuthenticateToken(context.Background(), tokens.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken() error = %v", err)
	}
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		t.Fatalf("communityAccountClientID() error = %v", err)
	}
	if principal.OrgID != 0 || principal.UserID != 101 || clientID != "account:101" {
		t.Fatalf("expected community-only principal, got %#v", principal)
	}
}

func TestServiceVideoDetailDecoratesSourcesTagsAndRelated(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

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

func TestServiceListVideosUsesPersistedCategoryLinksOnly(t *testing.T) {
	repo := newFakeRepository()
	repo.categorySlugs["video-aoi-alpha"] = nil
	svc := newTestService(repo, Config{Now: fixedNow})

	payload, err := svc.ListVideos(context.Background(), model.VideoFilter{Limit: 10})
	if err != nil {
		t.Fatalf("ListVideos() error = %v", err)
	}
	for _, item := range payload.Items {
		if item.ID != "video-aoi-alpha" {
			continue
		}
		if len(item.Categories) != 0 {
			t.Fatalf("expected no guessed categories without persisted links, got %#v", item.Categories)
		}
		return
	}
	t.Fatalf("expected video-aoi-alpha in %#v", payload.Items)
}

func TestServiceListVideosReturnsDataInconsistentForMissingUploader(t *testing.T) {
	repo := newFakeRepository()
	repo.creators = repo.creators[1:]
	svc := newTestService(repo, Config{Now: fixedNow})

	_, err := svc.ListVideos(context.Background(), model.VideoFilter{Limit: 10})
	if !errors.Is(err, ErrDataInconsistent) {
		t.Fatalf("ListVideos() error = %v, want ErrDataInconsistent", err)
	}
}

func TestServiceSearchAggregatesVideosCreatorsAndCategories(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	payload, err := svc.Search(context.Background(), "子类", 10)
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if payload.Query != "子类" {
		t.Fatalf("expected original query, got %q", payload.Query)
	}
	if len(payload.Videos.Items) == 0 {
		t.Fatalf("expected matching videos, got %#v", payload)
	}
	if len(payload.Categories.Items) != 1 || payload.Categories.Items[0].Slug != "unit-child" {
		t.Fatalf("expected unit category match, got %#v", payload.Categories.Items)
	}
	if payload.TotalCount != len(payload.Videos.Items)+len(payload.Categories.Items)+len(payload.Creators.Items) {
		t.Fatalf("unexpected total count in %#v", payload)
	}
}

func TestServiceVideoCommentsCreatesAndListsPersistedComments(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
		NewID: func() string { return "unit-comment" },
		Now:   fixedNow,
	})

	comment, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{
		AuthorName: "  Aoi Viewer  ",
		Body:       "  这条评论来自社区讨论区。  ",
		ClientID:   " browser-client-1 ",
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
	if !comment.OwnedByCurrentClient {
		t.Fatalf("expected created comment to be owned by current client, got %#v", comment)
	}

	payload, err := svc.GetVideoComments(context.Background(), "aoi-alpha", model.VideoCommentFilter{ClientID: "browser-client-1", Sort: model.CommentSortNewest})
	if err != nil {
		t.Fatalf("GetVideoComments() error = %v", err)
	}
	if payload.VideoID != "video-aoi-alpha" || payload.TotalCount != 2 {
		t.Fatalf("unexpected comment payload: %#v", payload)
	}
	if payload.Items[0].ID != comment.ID {
		t.Fatalf("expected newest comment first, got %#v", payload.Items)
	}
	if !payload.Items[0].OwnedByCurrentClient || payload.Items[1].OwnedByCurrentClient {
		t.Fatalf("expected only current client comment to be marked owned, got %#v", payload.Items)
	}
}

func TestServiceVideoCommentOwnerCanUpdateAndDelete(t *testing.T) {
	repo := newFakeRepository()
	ids := []string{"unit-comment", "unit-comment-notification"}
	nextID := 0
	svc := newTestService(repo, Config{
		NewID: func() string {
			id := ids[nextID]
			nextID++
			return id
		},
		Now: fixedNow,
	})

	comment, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{
		AuthorName: "Aoi Viewer",
		Body:       "Original body",
		ClientID:   "browser-client-1",
	})
	if err != nil {
		t.Fatalf("CreateVideoComment() error = %v", err)
	}

	updated, err := svc.UpdateVideoComment(context.Background(), "aoi-alpha", comment.ID, model.UpdateVideoCommentRequest{
		Body:     "  Updated body  ",
		ClientID: " browser-client-1 ",
	})
	if err != nil {
		t.Fatalf("UpdateVideoComment() error = %v", err)
	}
	if updated.Body != "Updated body" || !updated.OwnedByCurrentClient {
		t.Fatalf("expected updated owned comment, got %#v", updated)
	}

	if _, err := svc.UpdateVideoComment(context.Background(), "aoi-alpha", comment.ID, model.UpdateVideoCommentRequest{
		Body:     "Hijack",
		ClientID: "other-client",
	}); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound for different client, got %v", err)
	}

	deleted, err := svc.DeleteVideoComment(context.Background(), "aoi-alpha", comment.ID, " browser-client-1 ")
	if err != nil {
		t.Fatalf("DeleteVideoComment() error = %v", err)
	}
	if !deleted.Deleted || deleted.CommentID != comment.ID || deleted.ClientID != "browser-client-1" {
		t.Fatalf("unexpected delete payload: %#v", deleted)
	}

	payload, err := svc.GetVideoComments(context.Background(), "aoi-alpha", model.VideoCommentFilter{ClientID: "browser-client-1"})
	if err != nil {
		t.Fatalf("GetVideoComments() error = %v", err)
	}
	if payload.TotalCount != 1 {
		t.Fatalf("expected one visible seed comment after delete, got %#v", payload)
	}
}

func TestServiceCreateVideoCommentRejectsEmptyInput(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateVideoComment(context.Background(), "aoi-alpha", model.CreateVideoCommentRequest{AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateVideoDanmakuPersistsAndNormalizesInput(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
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
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.CreateVideoDanmaku(context.Background(), "aoi-alpha", model.CreateVideoDanmakuRequest{AuthorName: "Aoi Viewer"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreatorFollowStatePersistsAndUpdatesFeed(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
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
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.FollowCreator(context.Background(), "rin721", model.CreatorFollowRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceAccountCreatorFollowUsesPrincipalIdentity(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
	principal := authtypes.Principal{
		UserID:   42,
		Username: "Rin Creator",
		Email:    "rin@example.com",
	}

	state, err := svc.FollowAccountCreator(context.Background(), principal, "rin721")
	if err != nil {
		t.Fatalf("FollowAccountCreator() error = %v", err)
	}
	if !state.Following || state.ClientID != "account:42" || state.FollowerCount != 43 || state.FollowedAt == nil {
		t.Fatalf("expected account follow state, got %#v", state)
	}

	feed, err := svc.AccountFollowingFeed(context.Background(), principal)
	if err != nil {
		t.Fatalf("AccountFollowingFeed() error = %v", err)
	}
	if !feed.Authenticated || feed.ClientID == nil || *feed.ClientID != "account:42" || feed.FollowingCount != 1 {
		t.Fatalf("expected account following feed, got %#v", feed)
	}
	if len(feed.Creators) != 1 || feed.Creators[0].Handle != "rin721" || feed.Creators[0].FollowedAt == nil {
		t.Fatalf("expected followed account creator, got %#v", feed.Creators)
	}

	lookup, err := svc.GetAccountCreatorFollowState(context.Background(), principal, "rin721")
	if err != nil {
		t.Fatalf("GetAccountCreatorFollowState() error = %v", err)
	}
	if !lookup.Following || lookup.ClientID != "account:42" {
		t.Fatalf("expected account lookup state, got %#v", lookup)
	}

	state, err = svc.UnfollowAccountCreator(context.Background(), principal, "rin721")
	if err != nil {
		t.Fatalf("UnfollowAccountCreator() error = %v", err)
	}
	if state.Following || state.ClientID != "account:42" || state.FollowedAt != nil {
		t.Fatalf("expected account unfollow state, got %#v", state)
	}
}

func TestServiceCommunityDynamicsListsAndCreatesTimelineItems(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
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
	if !created.OwnedByCurrentClient {
		t.Fatalf("expected created dynamic to be owned by current client, got %#v", created)
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
	if !payload.Items.Items[0].OwnedByCurrentClient || payload.Items.Items[1].OwnedByCurrentClient {
		t.Fatalf("expected only current client dynamic to be marked owned, got %#v", payload.Items.Items)
	}
}

func TestServiceCreateCommunityAccountDynamicUsesPrincipalIdentity(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
		NewID: func() string { return "account-dynamic" },
		Now:   fixedNow,
	})

	item, err := svc.CreateCommunityAccountDynamic(context.Background(), authtypes.Principal{
		UserID:      721,
		Username:    "rin721",
		DisplayName: "Rin Creator",
		Email:       "rin@example.invalid",
	}, model.CreateCommunityAccountDynamicRequest{
		Body: "  Account owned pulse  ",
	})
	if err != nil {
		t.Fatalf("CreateCommunityAccountDynamic() error = %v", err)
	}
	if item.ID != "dynamic-account-dynamic" || item.AuthorName != "Rin Creator" || item.Body != "Account owned pulse" {
		t.Fatalf("expected principal-backed dynamic, got %#v", item)
	}
	if len(repo.dynamics) == 0 || repo.dynamics[0].ClientID != "account:721" {
		t.Fatalf("expected account client id in repository, got %#v", repo.dynamics)
	}
}

func TestServiceCommunityDynamicOwnerCanUpdateAndDelete(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
		NewID: func() string { return "owned-dynamic" },
		Now:   fixedNow,
	})

	created, err := svc.CreateCommunityDynamic(context.Background(), model.CreateCommunityDynamicRequest{
		AuthorName: "Aoi Viewer",
		Body:       "Original pulse",
		ClientID:   "browser-client-1",
	})
	if err != nil {
		t.Fatalf("CreateCommunityDynamic() error = %v", err)
	}

	updated, err := svc.UpdateCommunityDynamic(context.Background(), created.ID, model.UpdateCommunityDynamicRequest{
		Body:     "  Updated pulse  ",
		ClientID: " browser-client-1 ",
	})
	if err != nil {
		t.Fatalf("UpdateCommunityDynamic() error = %v", err)
	}
	if updated.Body != "Updated pulse" || !updated.OwnedByCurrentClient {
		t.Fatalf("expected updated owned dynamic, got %#v", updated)
	}

	if _, err := svc.UpdateCommunityDynamic(context.Background(), created.ID, model.UpdateCommunityDynamicRequest{
		Body:     "Hijack pulse",
		ClientID: "other-client",
	}); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound for different client, got %v", err)
	}

	deleted, err := svc.DeleteCommunityDynamic(context.Background(), created.ID, " browser-client-1 ")
	if err != nil {
		t.Fatalf("DeleteCommunityDynamic() error = %v", err)
	}
	if !deleted.Deleted || deleted.DynamicID != created.ID || deleted.ClientID != "browser-client-1" {
		t.Fatalf("unexpected delete payload: %#v", deleted)
	}

	payload, err := svc.ListCommunityDynamics(context.Background(), model.CommunityDynamicFilter{ClientID: "browser-client-1", Limit: 10})
	if err != nil {
		t.Fatalf("ListCommunityDynamics() error = %v", err)
	}
	for _, item := range payload.Items.Items {
		if item.ID == created.ID {
			t.Fatalf("deleted dynamic still visible in timeline: %#v", payload.Items.Items)
		}
	}
}

func TestServiceCommunityDynamicRejectsInvalidInput(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

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
	svc := newTestService(repo, Config{
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
		CategorySlug:  "unit-child",
		ClientID:      " browser-client-1 ",
		Description:   "  Metadata only submission  ",
		SourceName:    "  alpha-preview.mp4  ",
		SourceSize:    1024 * 1024,
		SourceType:    "video/mp4",
		Tags:          []string{" Aoi ", "#Topic", "aoi"},
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
	if item.Category == nil || item.Category.Slug != "unit-child" || item.CategorySlug != "unit-child" {
		t.Fatalf("expected decorated category, got %#v", item)
	}
	if len(item.Tags) != 2 || item.Tags[0] != "Aoi" || item.Tags[1] != "Topic" {
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

func TestServiceReviewCommunitySubmissionTransitionsAndNotifies(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
	principal := authtypes.Principal{UserID: 7, Username: "reviewer"}

	item, err := svc.CreateCommunitySubmission(context.Background(), model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "unit-child",
		ClientID:      "browser-client-1",
		SourceName:    "alpha-preview.mp4",
		SourceSize:    1024,
		Title:         "Alpha preview upload",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	})
	if err != nil {
		t.Fatalf("CreateCommunitySubmission() error = %v", err)
	}

	approved, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		ReviewNote: "Ready for publishing",
		Status:     model.CommunitySubmissionStatusApproved,
	})
	if err != nil {
		t.Fatalf("ReviewCommunitySubmission(approved) error = %v", err)
	}
	if approved.Status != model.CommunitySubmissionStatusApproved || approved.ReviewerID != "7" || approved.ReviewedAt == nil {
		t.Fatalf("expected approved review state, got %#v", approved)
	}
	if approved.ReviewNote != "Ready for publishing" || approved.PublishedVideoID != "" || approved.PublishedAt != nil {
		t.Fatalf("expected review note without publish state, got %#v", approved)
	}

	published, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		PublishedVideoID: "aoi-alpha",
		Status:           model.CommunitySubmissionStatusPublished,
	})
	if err != nil {
		t.Fatalf("ReviewCommunitySubmission(published) error = %v", err)
	}
	if published.Status != model.CommunitySubmissionStatusPublished || published.PublishedVideoID != "video-aoi-alpha" || published.PublishedAt == nil {
		t.Fatalf("expected published state with external video id, got %#v", published)
	}
	if len(repo.notifications) < 3 || repo.notifications[0].Title != "投稿已发布" {
		t.Fatalf("expected publish notification before prior notices, got %#v", repo.notifications)
	}

	queue, err := svc.ListCommunityReviewSubmissions(context.Background(), model.CommunitySubmissionFilter{Status: model.CommunitySubmissionStatusPublished})
	if err != nil {
		t.Fatalf("ListCommunityReviewSubmissions() error = %v", err)
	}
	if !queue.Authenticated || len(queue.Items.Items) != 1 || queue.Items.Items[0].ID != item.ID {
		t.Fatalf("expected review queue with published item, got %#v", queue)
	}
}

func TestServiceReviewCommunitySubmissionCanGenerateVideoRecord(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
	principal := authtypes.Principal{UserID: 7, Username: "reviewer"}

	item, err := svc.CreateCommunitySubmission(context.Background(), model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "unit-child",
		ClientID:      "browser-client-1",
		Description:   "A generated video from review.",
		SourceName:    "alpha-generated.mp4",
		SourceSize:    2048,
		SourceType:    "video/mp4",
		Tags:          []string{"review", "generated"},
		Title:         "Generated review video",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	})
	if err != nil {
		t.Fatalf("CreateCommunitySubmission() error = %v", err)
	}
	if _, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		ReviewNote: "Ready for generated publishing",
		Status:     model.CommunitySubmissionStatusApproved,
	}); err != nil {
		t.Fatalf("ReviewCommunitySubmission(approved) error = %v", err)
	}

	published, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		DurationSeconds: 128,
		SourceURL:       "https://example.invalid/generated.mp4",
		Status:          model.CommunitySubmissionStatusPublished,
		ThumbnailURL:    "gradient:generated-review",
	})
	if err != nil {
		t.Fatalf("ReviewCommunitySubmission(published generated) error = %v", err)
	}
	if published.Status != model.CommunitySubmissionStatusPublished || published.PublishedVideoID == "" || published.PublishedAt == nil {
		t.Fatalf("expected generated published state, got %#v", published)
	}
	detail, err := svc.GetVideoDetail(context.Background(), published.PublishedVideoID)
	if err != nil {
		t.Fatalf("GetVideoDetail(generated) error = %v", err)
	}
	if detail.Title != "Generated review video" || detail.SourceURL != "https://example.invalid/generated.mp4" || detail.DurationSeconds != 128 {
		t.Fatalf("expected generated video to use submission metadata and source URL, got %#v", detail)
	}
	if detail.Uploader.DisplayName != "Aoi Creator" || len(detail.Categories) != 1 || detail.Categories[0].Slug != "unit-child" {
		t.Fatalf("expected generated creator and category decoration, got %#v", detail)
	}
	creator, err := repo.FindCreatorByHandle(context.Background(), detail.Uploader.Handle)
	if err != nil {
		t.Fatalf("FindCreatorByHandle(generated) error = %v", err)
	}
	if creator.Bio != nil {
		t.Fatalf("expected generated creator without hardcoded bio, got %#v", creator.Bio)
	}
	if len(detail.Tags) != 2 || detail.Tags[0] != "review" || len(detail.Sources) != 1 || detail.Sources[0].MimeType == nil || *detail.Sources[0].MimeType != "video/mp4" {
		t.Fatalf("expected generated tags and source metadata, got %#v", detail)
	}
}

func TestServiceReviewCommunitySubmissionCanGenerateVideoFromMediaAsset(t *testing.T) {
	repo := newFakeRepository()
	repo.mediaAssets[42] = model.CommunityMediaAsset{
		ID:           42,
		DisplayName:  "review-source",
		OriginalName: "review-source.mp4",
		URL:          "/api/v1/system/media/assets/42/download",
		MIMEType:     "video/mp4",
		SizeBytes:    4096,
	}
	svc := newTestService(repo, Config{Now: fixedNow})
	principal := authtypes.Principal{UserID: 7, Username: "reviewer"}

	item, err := svc.CreateCommunitySubmission(context.Background(), model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "unit-child",
		ClientID:      "browser-client-1",
		Description:   "A generated video from a controlled media asset.",
		SourceName:    "review-source.mp4",
		SourceSize:    4096,
		SourceType:    "video/mp4",
		Tags:          []string{"review", "asset"},
		Title:         "Media asset review video",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	})
	if err != nil {
		t.Fatalf("CreateCommunitySubmission() error = %v", err)
	}
	if _, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		ReviewNote: "Ready for asset publishing",
		Status:     model.CommunitySubmissionStatusApproved,
	}); err != nil {
		t.Fatalf("ReviewCommunitySubmission(approved) error = %v", err)
	}

	published, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{
		DurationSeconds: 96,
		MediaAssetID:    42,
		Status:          model.CommunitySubmissionStatusPublished,
		ThumbnailURL:    "gradient:media-asset-review",
	})
	if err != nil {
		t.Fatalf("ReviewCommunitySubmission(published asset) error = %v", err)
	}
	if published.Status != model.CommunitySubmissionStatusPublished || published.MediaAssetID != 42 || published.PublishedVideoID == "" {
		t.Fatalf("expected media asset backed published state, got %#v", published)
	}
	detail, err := svc.GetVideoDetail(context.Background(), published.PublishedVideoID)
	if err != nil {
		t.Fatalf("GetVideoDetail(media asset generated) error = %v", err)
	}
	if detail.SourceURL != "/api/v1/system/media/assets/42/download" || detail.DurationSeconds != 96 {
		t.Fatalf("expected generated video to use media asset source URL, got %#v", detail)
	}
	if len(detail.Sources) != 1 || detail.Sources[0].MimeType == nil || *detail.Sources[0].MimeType != "video/mp4" {
		t.Fatalf("expected media asset mime type on generated source, got %#v", detail.Sources)
	}
}

func TestServiceReviewCommunitySubmissionRejectsInvalidTransitions(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
	principal := authtypes.Principal{UserID: 7}

	item, err := svc.CreateCommunitySubmission(context.Background(), model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "unit-child",
		ClientID:      "browser-client-1",
		SourceName:    "alpha-preview.mp4",
		SourceSize:    1024,
		Title:         "Alpha preview upload",
		Visibility:    model.CommunitySubmissionVisibilityPublic,
	})
	if err != nil {
		t.Fatalf("CreateCommunitySubmission() error = %v", err)
	}
	if _, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{Status: model.CommunitySubmissionStatusPublished, PublishedVideoID: "aoi-alpha"}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for publishing before approval, got %v", err)
	}
	if _, err := svc.ReviewCommunitySubmission(context.Background(), principal, item.ID, model.ReviewCommunitySubmissionRequest{Status: model.CommunitySubmissionStatusRejected}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for rejection without note, got %v", err)
	}
	if _, err := svc.ReviewCommunitySubmission(context.Background(), authtypes.Principal{}, item.ID, model.ReviewCommunitySubmissionRequest{Status: model.CommunitySubmissionStatusApproved}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput for missing reviewer, got %v", err)
	}
}

func TestServiceCommunitySubmissionRejectsInvalidInput(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	valid := model.CreateCommunitySubmissionRequest{
		AllowComments: true,
		AuthorName:    "Aoi Creator",
		CategorySlug:  "unit-child",
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
	svc := newTestService(repo, Config{
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
		CategorySlug:  "unit-child",
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

	notifications, err := svc.CommunityAccountNotifications(context.Background(), principal, 12)
	if err != nil {
		t.Fatalf("CommunityAccountNotifications() error = %v", err)
	}
	if !notifications.Authenticated || notifications.ClientID == nil || *notifications.ClientID != "account:42" || notifications.UnreadCount != 1 {
		t.Fatalf("expected authenticated account notifications, got %#v", notifications)
	}

	updated, err := svc.MarkCommunityAccountNotificationsRead(context.Background(), principal)
	if err != nil {
		t.Fatalf("MarkCommunityAccountNotificationsRead() error = %v", err)
	}
	if !updated.Authenticated || updated.UnreadCount != 0 || len(updated.Items.Items) != 1 || updated.Items.Items[0].ReadAt == nil {
		t.Fatalf("expected read account notifications, got %#v", updated)
	}
}

func TestServiceVideoInteractionPersistsAndUpdatesLikeCount(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{Now: fixedNow})
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
	svc := newTestService(repo, Config{Now: fixedNow})
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
	svc := newTestService(repo, Config{Now: func() time.Time { return now }})
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

func TestServiceAccountVideoLibraryAndHistoryUsePrincipalIdentity(t *testing.T) {
	repo := newFakeRepository()
	now := fixedNow()
	svc := newTestService(repo, Config{Now: func() time.Time { return now }})
	principal := authtypes.Principal{
		UserID:   42,
		Username: "Rin Creator",
		Email:    "rin@example.com",
	}

	state, err := svc.SetAccountVideoInteraction(context.Background(), principal, "aoi-alpha", model.VideoInteractionKindFavorite)
	if err != nil {
		t.Fatalf("SetAccountVideoInteraction(favorite) error = %v", err)
	}
	if !state.Favorited || state.ClientID != "account:42" {
		t.Fatalf("expected account favorite state, got %#v", state)
	}
	if _, err := svc.SetAccountVideoInteraction(context.Background(), principal, "go-api-ready", model.VideoInteractionKindWatchLater); err != nil {
		t.Fatalf("SetAccountVideoInteraction(watch_later) error = %v", err)
	}

	library, err := svc.AccountVideoLibrary(context.Background(), principal)
	if err != nil {
		t.Fatalf("AccountVideoLibrary() error = %v", err)
	}
	if !library.Authenticated || library.ClientID == nil || *library.ClientID != "account:42" || library.FavoriteCount != 1 || library.WatchLaterCount != 1 {
		t.Fatalf("expected account library payload, got %#v", library)
	}

	now = now.Add(time.Minute)
	item, err := svc.RecordAccountVideoHistory(context.Background(), principal, "aoi-alpha", model.RecordAccountVideoHistoryRequest{ProgressSeconds: 999})
	if err != nil {
		t.Fatalf("RecordAccountVideoHistory() error = %v", err)
	}
	if item.Video.ID != "video-aoi-alpha" || item.ProgressSeconds != 300 {
		t.Fatalf("expected normalized account history item, got %#v", item)
	}

	history, err := svc.AccountVideoHistory(context.Background(), principal, 12)
	if err != nil {
		t.Fatalf("AccountVideoHistory() error = %v", err)
	}
	if !history.Authenticated || history.ClientID == nil || *history.ClientID != "account:42" || history.HistoryCount != 1 {
		t.Fatalf("expected account history payload, got %#v", history)
	}

	cleared, err := svc.ClearAccountVideoHistory(context.Background(), principal)
	if err != nil {
		t.Fatalf("ClearAccountVideoHistory() error = %v", err)
	}
	if !cleared.Authenticated || cleared.ClientID == nil || *cleared.ClientID != "account:42" || cleared.HistoryCount != 0 || len(cleared.Items.Items) != 0 {
		t.Fatalf("expected cleared account history, got %#v", cleared)
	}

	state, err = svc.UnsetAccountVideoInteraction(context.Background(), principal, "aoi-alpha", model.VideoInteractionKindFavorite)
	if err != nil {
		t.Fatalf("UnsetAccountVideoInteraction() error = %v", err)
	}
	if state.Favorited || state.ClientID != "account:42" {
		t.Fatalf("expected cleared account favorite, got %#v", state)
	}
}

func TestServiceVideoInteractionRejectsMissingClientID(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.SetVideoInteraction(context.Background(), "aoi-alpha", model.VideoInteractionKindFavorite, model.VideoInteractionRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceVideoHistoryRejectsMissingClientID(t *testing.T) {
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

	if _, err := svc.RecordVideoHistory(context.Background(), "aoi-alpha", model.VideoHistoryRequest{}); err != ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestServiceCreateVideoReportPersistsPendingReceipt(t *testing.T) {
	repo := newFakeRepository()
	svc := newTestService(repo, Config{
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
	svc := newTestService(newFakeRepository(), Config{Now: fixedNow})

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
	svc := newTestService(repo, Config{
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

type fakeHomeAnnouncementProvider struct {
	announcement *model.Announcement
	err          error
	calls        int
}

func (p *fakeHomeAnnouncementProvider) HomeAnnouncement(context.Context) (*model.Announcement, error) {
	p.calls++
	if p.err != nil {
		return nil, p.err
	}
	if p.announcement == nil {
		return nil, nil
	}
	announcement := *p.announcement
	return &announcement, nil
}

type fakeRepository struct {
	accounts      []model.CommunityAccount
	sessions      []model.CommunitySession
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
	mediaAssets   map[int64]model.CommunityMediaAsset
	reports       []model.CommunityReport
	submissions   []model.CommunitySubmission
	videoJobs     []model.CommunityVideoJob
	renditions    map[string][]model.CommunityVideoRendition
	sources       map[string][]model.VideoSourceOption
	tags          map[string][]string
}

func newFakeRepository() *fakeRepository {
	description := "测试分类说明"
	bio := "关注设计和社区体验"
	avatar := "https://example.invalid/avatar.png"
	return &fakeRepository{
		categories: []model.Category{
			{ID: "cat-unit-root", Slug: "unit-root", Name: "测试根类", Order: 10},
			{ID: "cat-unit-child", Slug: "unit-child", Name: "测试子类", Description: &description, ParentSlug: strPtr("unit-root"), Order: 10},
			{ID: "cat-unit-leaf", Slug: "unit-leaf", Name: "测试叶类", ParentSlug: strPtr("unit-child"), Order: 5},
		},
		creators: []model.Creator{
			{UserSummary: model.UserSummary{ID: "user-rin", Handle: "rin721", DisplayName: "Rin721", AvatarURL: &avatar}, Bio: &bio, FollowerCount: 42, JoinedAt: fixedNow()},
			{UserSummary: model.UserSummary{ID: "user-lab", Handle: "aoi-lab", DisplayName: "Aoi Lab"}, FollowerCount: 24, JoinedAt: fixedNow()},
		},
		videos: []model.Video{
			{ID: "video-aoi-alpha", Slug: "aoi-alpha", Title: "Banyao Alpha 子类预览", Description: &description, ThumbnailURL: "gradient:aoi-alpha", DurationSeconds: 300, ViewCount: 1200, CommentCount: 12, LikeCount: 20, SourceURL: "https://example.invalid/a.mp4", PublishedAt: fixedNow(), UploaderID: "user-rin"},
			{ID: "video-go-api", Slug: "go-api-ready", Title: "Community Notes", Description: strPtr("社区动线"), ThumbnailURL: "gradient:go-api", DurationSeconds: 240, ViewCount: 800, CommentCount: 8, LikeCount: 10, SourceURL: "https://example.invalid/b.mp4", PublishedAt: fixedNow().Add(-time.Hour), UploaderID: "user-lab"},
		},
		categorySlugs: map[string][]string{
			"video-aoi-alpha": {"unit-child"},
			"video-go-api":    {"unit-child"},
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
		mediaAssets:  map[int64]model.CommunityMediaAsset{},
		renditions:   map[string][]model.CommunityVideoRendition{},
		sources: map[string][]model.VideoSourceOption{
			"video-aoi-alpha": {{ID: "s1", VideoID: "video-aoi-alpha", Src: "https://example.invalid/a.mp4", Kind: model.VideoSourceKindNative, Label: "主源", IsDefault: true}},
		},
		tags: map[string][]string{
			"video-aoi-alpha": {"Banyao", "设计"},
		},
	}
}

func (r *fakeRepository) CreateCommunityAccount(_ context.Context, account model.CommunityAccount) error {
	r.accounts = append(r.accounts, account)
	return nil
}

func (r *fakeRepository) FindCommunityAccountByID(_ context.Context, id int64) (*model.CommunityAccount, error) {
	for index := range r.accounts {
		if r.accounts[index].ID == id && r.accounts[index].DeletedAt == nil {
			return &r.accounts[index], nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindCommunityAccountByHandle(_ context.Context, handle string) (*model.CommunityAccount, error) {
	handle = strings.ToLower(strings.TrimSpace(handle))
	for index := range r.accounts {
		if strings.ToLower(r.accounts[index].Handle) == handle && r.accounts[index].DeletedAt == nil {
			return &r.accounts[index], nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindCommunityAccountByEmail(_ context.Context, email string) (*model.CommunityAccount, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	for index := range r.accounts {
		if strings.ToLower(r.accounts[index].Email) == email && r.accounts[index].DeletedAt == nil {
			return &r.accounts[index], nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindCommunityAccountByHandleOrEmail(ctx context.Context, identifier string) (*model.CommunityAccount, error) {
	if account, err := r.FindCommunityAccountByHandle(ctx, identifier); err == nil {
		return account, nil
	}
	return r.FindCommunityAccountByEmail(ctx, identifier)
}

func (r *fakeRepository) UpdateCommunityAccount(_ context.Context, account model.CommunityAccount) error {
	for index := range r.accounts {
		if r.accounts[index].ID == account.ID && r.accounts[index].DeletedAt == nil {
			r.accounts[index] = account
			return nil
		}
	}
	return ErrNotFound
}

func (r *fakeRepository) ListCommunityAccounts(_ context.Context, filter model.CommunityAccountFilter) ([]model.CommunityAccount, error) {
	items := make([]model.CommunityAccount, 0)
	keyword := strings.ToLower(strings.TrimSpace(filter.Keyword))
	for _, account := range r.accounts {
		if account.DeletedAt != nil {
			continue
		}
		if filter.Role != "" && account.Role != filter.Role {
			continue
		}
		if filter.Status != "" && account.Status != filter.Status {
			continue
		}
		if keyword != "" && !strings.Contains(strings.ToLower(account.Handle+" "+account.Email+" "+account.DisplayName), keyword) {
			continue
		}
		items = append(items, account)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) CreateCommunitySession(_ context.Context, session model.CommunitySession) error {
	r.sessions = append(r.sessions, session)
	return nil
}

func (r *fakeRepository) FindCommunitySessionByAccessTokenHash(_ context.Context, tokenHash string, now time.Time) (*model.CommunitySession, error) {
	for index := range r.sessions {
		session := &r.sessions[index]
		if session.AccessTokenHash == tokenHash && session.RevokedAt == nil && session.DeletedAt == nil && session.AccessExpiresAt.After(now) {
			return session, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindCommunitySessionByID(_ context.Context, id int64) (*model.CommunitySession, error) {
	for index := range r.sessions {
		session := &r.sessions[index]
		if session.ID == id && session.RevokedAt == nil && session.DeletedAt == nil {
			return session, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) RevokeCommunitySession(_ context.Context, sessionID int64, now time.Time) error {
	for index := range r.sessions {
		if r.sessions[index].ID == sessionID && r.sessions[index].RevokedAt == nil {
			r.sessions[index].RevokedAt = &now
			r.sessions[index].UpdatedAt = now
			return nil
		}
	}
	return ErrNotFound
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

func (r *fakeRepository) FindVideoComment(_ context.Context, videoID string, commentID string) (*model.VideoComment, error) {
	for _, comment := range r.comments[videoID] {
		if comment.ID == commentID && comment.DeletedAt == nil && comment.Status == model.CommentStatusVisible {
			item := comment
			return &item, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindCommunityDynamic(_ context.Context, dynamicID string) (*model.CommunityDynamic, error) {
	for _, dynamic := range r.dynamics {
		if dynamic.ID == dynamicID && dynamic.DeletedAt == nil && dynamic.Status == model.CommunityDynamicStatusVisible {
			item := dynamic
			return &item, nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) CommunityCategories(context.Context) ([]model.Category, error) {
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
	items := make([]model.VideoComment, 0)
	for _, comment := range r.comments[videoID] {
		if comment.DeletedAt != nil || comment.Status != model.CommentStatusVisible {
			continue
		}
		items = append(items, comment)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) CountVideoComments(_ context.Context, videoID string) (int, error) {
	count := 0
	for _, comment := range r.comments[videoID] {
		if comment.DeletedAt == nil && comment.Status == model.CommentStatusVisible {
			count++
		}
	}
	return count, nil
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

func (r *fakeRepository) UpdateVideoComment(_ context.Context, comment model.VideoComment) error {
	items := r.comments[comment.VideoID]
	for index := range items {
		if items[index].ID != comment.ID || items[index].ClientID != comment.ClientID || items[index].DeletedAt != nil {
			continue
		}
		items[index].Body = comment.Body
		items[index].UpdatedAt = comment.UpdatedAt
		r.comments[comment.VideoID] = items
		return nil
	}
	return ErrNotFound
}

func (r *fakeRepository) DeleteVideoComment(_ context.Context, videoID string, commentID string, clientID string, now time.Time) error {
	items := r.comments[videoID]
	for index := range items {
		if items[index].ID != commentID || items[index].ClientID != clientID || items[index].DeletedAt != nil {
			continue
		}
		items[index].UpdatedAt = now
		items[index].DeletedAt = &now
		r.comments[videoID] = items
		for videoIndex := range r.videos {
			if r.videos[videoIndex].ID == videoID && r.videos[videoIndex].CommentCount > 0 {
				r.videos[videoIndex].CommentCount--
				break
			}
		}
		return nil
	}
	return ErrNotFound
}

func (r *fakeRepository) CreateVideoDanmaku(_ context.Context, item model.VideoDanmakuItem) error {
	r.danmaku[item.VideoID] = append(r.danmaku[item.VideoID], item)
	return nil
}

func (r *fakeRepository) CreateCommunityReport(_ context.Context, report model.CommunityReport) error {
	r.reports = append(r.reports, report)
	return nil
}

func (r *fakeRepository) ListCommunityReports(_ context.Context, filter model.CommunityReportFilter) ([]model.CommunityReport, error) {
	items := make([]model.CommunityReport, 0)
	for _, report := range r.reports {
		if report.DeletedAt != nil {
			continue
		}
		if filter.Status != "" && report.Status != filter.Status {
			continue
		}
		items = append(items, report)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) FindCommunityReport(_ context.Context, reportID string) (*model.CommunityReport, error) {
	for index := range r.reports {
		if r.reports[index].ID == reportID && r.reports[index].DeletedAt == nil {
			return &r.reports[index], nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) UpdateCommunityReportReview(_ context.Context, report model.CommunityReport) error {
	for index := range r.reports {
		if r.reports[index].ID == report.ID && r.reports[index].DeletedAt == nil {
			r.reports[index].Status = report.Status
			r.reports[index].ReviewNote = report.ReviewNote
			r.reports[index].ReviewerID = report.ReviewerID
			r.reports[index].ReviewedAt = report.ReviewedAt
			r.reports[index].UpdatedAt = report.UpdatedAt
			return nil
		}
	}
	return ErrNotFound
}

func (r *fakeRepository) CreateCommunityNotification(_ context.Context, notification model.CommunityNotification) error {
	r.notifications = append([]model.CommunityNotification{notification}, r.notifications...)
	return nil
}

func (r *fakeRepository) CreateCommunityDynamic(_ context.Context, dynamic model.CommunityDynamic) error {
	r.dynamics = append([]model.CommunityDynamic{dynamic}, r.dynamics...)
	return nil
}

func (r *fakeRepository) UpdateCommunityDynamic(_ context.Context, dynamic model.CommunityDynamic) error {
	for index := range r.dynamics {
		if r.dynamics[index].ID != dynamic.ID || r.dynamics[index].ClientID != dynamic.ClientID || r.dynamics[index].DeletedAt != nil {
			continue
		}
		r.dynamics[index].Body = dynamic.Body
		r.dynamics[index].UpdatedAt = dynamic.UpdatedAt
		return nil
	}
	return ErrNotFound
}

func (r *fakeRepository) DeleteCommunityDynamic(_ context.Context, dynamicID string, clientID string, now time.Time) error {
	for index := range r.dynamics {
		if r.dynamics[index].ID != dynamicID || r.dynamics[index].ClientID != clientID || r.dynamics[index].DeletedAt != nil {
			continue
		}
		r.dynamics[index].UpdatedAt = now
		r.dynamics[index].DeletedAt = &now
		return nil
	}
	return ErrNotFound
}

func (r *fakeRepository) CreateCommunitySubmission(_ context.Context, submission model.CommunitySubmission) error {
	r.submissions = append([]model.CommunitySubmission{submission}, r.submissions...)
	return nil
}

func (r *fakeRepository) CreateVideoFromSubmission(_ context.Context, creator model.Creator, video model.Video, source model.VideoSourceOption, categorySlugs []string, tags []string) error {
	return r.CreateVideoFromSubmissionSources(context.Background(), creator, video, []model.VideoSourceOption{source}, categorySlugs, tags)
}

func (r *fakeRepository) CreateVideoFromSubmissionSources(_ context.Context, creator model.Creator, video model.Video, sources []model.VideoSourceOption, categorySlugs []string, tags []string) error {
	foundCreator := false
	for index := range r.creators {
		if r.creators[index].ID != creator.ID {
			continue
		}
		r.creators[index].DisplayName = creator.DisplayName
		r.creators[index].Bio = creator.Bio
		r.creators[index].UpdatedAt = creator.UpdatedAt
		foundCreator = true
		break
	}
	if !foundCreator {
		r.creators = append(r.creators, creator)
	}
	r.videos = append([]model.Video{video}, r.videos...)
	r.sources[video.ID] = append([]model.VideoSourceOption(nil), sources...)
	r.categorySlugs[video.ID] = append([]string(nil), categorySlugs...)
	r.tags[video.ID] = append([]string(nil), tags...)
	return nil
}

func (r *fakeRepository) CreateMediaAsset(_ context.Context, asset model.CommunityMediaAsset) error {
	r.mediaAssets[asset.ID] = asset
	return nil
}

func (r *fakeRepository) FindCommunitySubmission(_ context.Context, submissionID string) (*model.CommunitySubmission, error) {
	for index := range r.submissions {
		if r.submissions[index].ID != submissionID || r.submissions[index].DeletedAt != nil {
			continue
		}
		return &r.submissions[index], nil
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) FindMediaAssetByID(_ context.Context, id int64) (*model.CommunityMediaAsset, error) {
	asset, ok := r.mediaAssets[id]
	if !ok || asset.DeletedAt != nil {
		return nil, ErrNotFound
	}
	return &asset, nil
}

func (r *fakeRepository) CreateCommunityVideoJob(_ context.Context, job model.CommunityVideoJob) error {
	r.videoJobs = append([]model.CommunityVideoJob{job}, r.videoJobs...)
	return nil
}

func (r *fakeRepository) UpdateCommunityVideoJob(_ context.Context, job model.CommunityVideoJob) error {
	for index := range r.videoJobs {
		if r.videoJobs[index].ID != job.ID || r.videoJobs[index].DeletedAt != nil {
			continue
		}
		r.videoJobs[index] = job
		return nil
	}
	return ErrNotFound
}

func (r *fakeRepository) ClaimCommunityVideoJobs(_ context.Context, workerID string, now time.Time, leaseTimeout time.Duration, limit int) ([]model.CommunityVideoJob, error) {
	if limit <= 0 {
		limit = 1
	}
	staleBefore := now.Add(-leaseTimeout)
	claimed := []model.CommunityVideoJob{}
	for index := range r.videoJobs {
		job := &r.videoJobs[index]
		if job.DeletedAt != nil {
			continue
		}
		if job.Status == model.CommunityVideoJobStatusRunning && job.ProviderJobID == "" && (job.HeartbeatAt == nil || !job.HeartbeatAt.After(staleBefore)) && (job.MaxAttempts == 0 || job.Attempt < job.MaxAttempts) {
			job.Status = model.CommunityVideoJobStatusQueued
			job.Progress = 0
			job.LockedBy = ""
			job.LockedAt = nil
			job.HeartbeatAt = nil
			job.NextRunAt = &now
			job.UpdatedAt = now
		}
		if job.Status != model.CommunityVideoJobStatusQueued || job.DeletedAt != nil {
			continue
		}
		if job.NextRunAt != nil && job.NextRunAt.After(now) {
			continue
		}
		job.Attempt++
		if job.MaxAttempts <= 0 {
			job.MaxAttempts = 3
		}
		job.LockedBy = workerID
		job.LockedAt = &now
		job.HeartbeatAt = &now
		job.UpdatedAt = now
		claimed = append(claimed, *job)
		if len(claimed) >= limit {
			break
		}
	}
	return claimed, nil
}

func (r *fakeRepository) FindCommunityVideoJob(_ context.Context, jobID string) (*model.CommunityVideoJob, error) {
	for index := range r.videoJobs {
		if r.videoJobs[index].ID == jobID && r.videoJobs[index].DeletedAt == nil {
			return &r.videoJobs[index], nil
		}
	}
	return nil, ErrNotFound
}

func (r *fakeRepository) ListCommunityVideoJobs(_ context.Context, filter model.CommunityVideoJobFilter) ([]model.CommunityVideoJob, error) {
	items := make([]model.CommunityVideoJob, 0)
	for _, job := range r.videoJobs {
		if job.DeletedAt != nil {
			continue
		}
		if filter.Status != "" && job.Status != filter.Status {
			continue
		}
		items = append(items, job)
	}
	if filter.Limit > 0 && len(items) > filter.Limit {
		return items[:filter.Limit], nil
	}
	return items, nil
}

func (r *fakeRepository) CreateCommunityVideoRenditions(_ context.Context, renditions []model.CommunityVideoRendition) error {
	for _, rendition := range renditions {
		r.renditions[rendition.JobID] = append(r.renditions[rendition.JobID], rendition)
	}
	return nil
}

func (r *fakeRepository) ListCommunityVideoRenditions(_ context.Context, jobID string) ([]model.CommunityVideoRendition, error) {
	return append([]model.CommunityVideoRendition(nil), r.renditions[jobID]...), nil
}

func (r *fakeRepository) UpdateCommunitySubmissionReview(_ context.Context, submission model.CommunitySubmission) error {
	for index := range r.submissions {
		if r.submissions[index].ID != submission.ID || r.submissions[index].DeletedAt != nil {
			continue
		}
		r.submissions[index].Status = submission.Status
		r.submissions[index].ReviewNote = submission.ReviewNote
		r.submissions[index].ReviewerID = submission.ReviewerID
		r.submissions[index].ReviewedAt = submission.ReviewedAt
		r.submissions[index].MediaAssetID = submission.MediaAssetID
		r.submissions[index].PublishedVideoID = submission.PublishedVideoID
		r.submissions[index].PublishedAt = submission.PublishedAt
		r.submissions[index].UpdatedAt = submission.UpdatedAt
		return nil
	}
	return ErrNotFound
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
		if submission.DeletedAt != nil {
			continue
		}
		if !filter.AllClients && submission.ClientID != filter.ClientID {
			continue
		}
		if filter.Status != "" && submission.Status != filter.Status {
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
	if len(filter.CategorySlugs) > 0 {
		allowedSlugs := make(map[string]struct{}, len(filter.CategorySlugs))
		for _, slug := range filter.CategorySlugs {
			allowedSlugs[slug] = struct{}{}
		}
		filtered := make([]model.Video, 0, len(items))
		for _, video := range items {
			for _, slug := range r.categorySlugs[video.ID] {
				if _, ok := allowedSlugs[slug]; ok {
					filtered = append(filtered, video)
					break
				}
			}
		}
		items = filtered
	}
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

type fakePasswordCrypto struct{}

func (fakePasswordCrypto) HashPassword(password string) (string, error) {
	return "hash:" + password, nil
}

func (fakePasswordCrypto) VerifyPassword(hashedPassword, password string) error {
	if hashedPassword != "hash:"+password {
		return errors.New("invalid password")
	}
	return nil
}

func strPtr(value string) *string {
	return &value
}
