package service

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
	authtypes "github.com/open-console/console-platform/types/auth"
)

var (
	ErrInvalidInput       = errors.New("invalid community input")
	ErrNotFound           = errors.New("community resource not found")
	ErrStorageUnavailable = errors.New("community storage unavailable")
)

var danmakuColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// Service 定义视频社区公开只读能力。
type Service interface {
	CommunityStatus(context.Context) model.APIStatus
	GetCreatorProfile(context.Context, string) (model.CreatorProfile, error)
	GetHomePayload(context.Context) (model.HomePayload, error)
	GetVideoDanmaku(context.Context, string) (model.VideoDanmakuPayload, error)
	GetVideoComments(context.Context, string, model.VideoCommentFilter) (model.VideoCommentPayload, error)
	GetVideoDetail(context.Context, string) (model.VideoDetail, error)
	GetVideoInteractionState(context.Context, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	GetCreatorFollowState(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	ListCategories(context.Context) ([]model.CategoryTreeNode, error)
	ListVideos(context.Context, model.VideoFilter) (model.PageResult[model.VideoSummary], error)
	Search(context.Context, string, int) (model.SearchPayload, error)
	FollowingFeed(context.Context, model.CreatorFollowRequest) (model.FollowingFeedPayload, error)
	VideoLibrary(context.Context, model.VideoInteractionRequest) (model.VideoLibraryPayload, error)
	VideoHistory(context.Context, model.VideoHistoryFilter) (model.VideoHistoryPayload, error)
	CommunityNotifications(context.Context, model.CommunityNotificationFilter) (model.CommunityNotificationPayload, error)
	MarkCommunityNotificationsRead(context.Context, model.CommunityNotificationRequest) (model.CommunityNotificationPayload, error)
	ListCommunityDynamics(context.Context, model.CommunityDynamicFilter) (model.CommunityDynamicPayload, error)
	CreateCommunityDynamic(context.Context, model.CreateCommunityDynamicRequest) (model.CommunityDynamicItem, error)
	ListCommunitySubmissions(context.Context, model.CommunitySubmissionFilter) (model.CommunitySubmissionPayload, error)
	CreateCommunitySubmission(context.Context, model.CreateCommunitySubmissionRequest) (model.CommunitySubmissionItem, error)
	ListCommunityAccountSubmissions(context.Context, authtypes.Principal, int) (model.CommunitySubmissionPayload, error)
	CreateCommunityAccountSubmission(context.Context, authtypes.Principal, model.CreateCommunityAccountSubmissionRequest) (model.CommunitySubmissionItem, error)
	FollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	UnfollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	SetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	UnsetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	RecordVideoHistory(context.Context, string, model.VideoHistoryRequest) (model.VideoHistoryItem, error)
	ClearVideoHistory(context.Context, model.VideoHistoryClearRequest) (model.VideoHistoryPayload, error)
	CreateVideoComment(context.Context, string, model.CreateVideoCommentRequest) (model.VideoComment, error)
	CreateVideoDanmaku(context.Context, string, model.CreateVideoDanmakuRequest) (model.VideoDanmakuItem, error)
	CreateVideoReport(context.Context, string, model.CreateVideoReportRequest) (model.CommunityReportReceipt, error)
}

// Repository 是社区服务需要的最小持久化端口。
type Repository interface {
	FindCreatorByHandle(context.Context, string) (*model.Creator, error)
	FindCreatorFollow(context.Context, string, string) (*model.CreatorFollow, error)
	FindVideoByIDOrSlug(context.Context, string) (*model.Video, error)
	FindVideoInteraction(context.Context, string, string, string) (*model.VideoInteraction, error)
	CountVideoComments(context.Context, string) (int, error)
	CreateVideoComment(context.Context, model.VideoComment) error
	CreateVideoDanmaku(context.Context, model.VideoDanmakuItem) error
	CreateCommunityReport(context.Context, model.CommunityReport) error
	CreateCommunityNotification(context.Context, model.CommunityNotification) error
	CreateCommunityDynamic(context.Context, model.CommunityDynamic) error
	CreateCommunitySubmission(context.Context, model.CommunitySubmission) error
	FollowCreator(context.Context, model.CreatorFollow) error
	SetVideoInteraction(context.Context, model.VideoInteraction) error
	SetVideoHistory(context.Context, model.VideoHistory) error
	ListCategories(context.Context) ([]model.Category, error)
	ListCategorySlugs(context.Context, string) ([]string, error)
	ListCreatorFollows(context.Context, string, int) ([]model.CreatorFollow, error)
	ListVideoInteractions(context.Context, model.VideoInteractionFilter) ([]model.VideoInteraction, error)
	ListVideoHistory(context.Context, model.VideoHistoryFilter) ([]model.VideoHistory, error)
	ListCommunityNotifications(context.Context, model.CommunityNotificationFilter) ([]model.CommunityNotification, error)
	ListCommunityDynamics(context.Context, model.CommunityDynamicFilter) ([]model.CommunityDynamic, error)
	ListCommunitySubmissions(context.Context, model.CommunitySubmissionFilter) ([]model.CommunitySubmission, error)
	ListVideoComments(context.Context, string, model.VideoCommentFilter) ([]model.VideoComment, error)
	ListCreators(context.Context, int) ([]model.Creator, error)
	ListDanmaku(context.Context, string) ([]model.VideoDanmakuItem, error)
	ListSources(context.Context, string) ([]model.VideoSourceOption, error)
	ListTags(context.Context, string) ([]string, error)
	ListVideos(context.Context, model.VideoFilter) ([]model.Video, error)
	ListVideosByIDs(context.Context, []string) ([]model.Video, error)
	MarkCommunityNotificationsRead(context.Context, string, time.Time) error
	UnfollowCreator(context.Context, string, string, time.Time) error
	UnsetVideoInteraction(context.Context, string, string, string, time.Time) error
	ClearVideoHistory(context.Context, string, time.Time) error
}

type Config struct {
	BasePath string
	NewID    func() string
	Now      func() time.Time
}

type service struct {
	cfg  Config
	repo Repository
}

func New(repo Repository, cfg Config) Service {
	if cfg.Now == nil {
		cfg.Now = func() time.Time { return time.Now().UTC() }
	}
	if cfg.NewID == nil {
		cfg.NewID = func() string { return strconv.FormatInt(time.Now().UTC().UnixNano(), 10) }
	}
	if strings.TrimSpace(cfg.BasePath) == "" {
		cfg.BasePath = "/api/v1/public/community"
	}
	return &service{cfg: cfg, repo: repo}
}

func (s *service) CommunityStatus(context.Context) model.APIStatus {
	return model.APIStatus{
		Mode:        "go",
		BasePath:    s.cfg.BasePath,
		GeneratedAt: s.now(),
		LatencyMs:   0,
		Endpoints: []string{
			"/status",
			"/auth/login",
			"/auth/logout",
			"/auth/session",
			"/auth/signup",
			"/account/submissions",
			"/home",
			"/dynamics",
			"/submissions",
			"/categories",
			"/videos",
			"/videos/:idOrSlug",
			"/videos/:idOrSlug/interaction-state",
			"/videos/:idOrSlug/interactions/:kind",
			"/videos/:idOrSlug/history",
			"/videos/:idOrSlug/comments",
			"/videos/:idOrSlug/danmaku",
			"/videos/:idOrSlug/reports",
			"/notifications",
			"/notifications/read",
			"/search",
			"/users/:handle",
			"/users/:handle/follow-state",
			"/users/:handle/follow",
			"/feed/following",
			"/library",
			"/history",
			"/history/clear",
		},
	}
}

func (s *service) GetHomePayload(ctx context.Context) (model.HomePayload, error) {
	categories, err := s.ListCategories(ctx)
	if err != nil {
		return model.HomePayload{}, err
	}
	latest, err := s.ListVideos(ctx, model.VideoFilter{Limit: 24})
	if err != nil {
		return model.HomePayload{}, err
	}
	dynamics, err := s.communityDynamicItems(ctx, model.CommunityDynamicFilter{Limit: 6})
	if err != nil {
		return model.HomePayload{}, err
	}
	return model.HomePayload{
		Announcement: communityAnnouncement(s.now),
		Categories:   categories,
		Latest:       latest,
		Dynamics:     model.PageResult[model.CommunityDynamicItem]{Items: dynamics},
	}, nil
}

func (s *service) ListCategories(ctx context.Context) ([]model.CategoryTreeNode, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, mapStorageError(err)
	}
	return buildCategoryTree(categories), nil
}

func (s *service) ListVideos(ctx context.Context, filter model.VideoFilter) (model.PageResult[model.VideoSummary], error) {
	videos, err := s.listVideoSummaries(ctx, normalizeVideoFilter(filter))
	if err != nil {
		return model.PageResult[model.VideoSummary]{Items: []model.VideoSummary{}}, err
	}
	return model.PageResult[model.VideoSummary]{
		Items:      videos,
		NextCursor: nil,
	}, nil
}

func (s *service) GetVideoDetail(ctx context.Context, idOrSlug string) (model.VideoDetail, error) {
	if s.repo == nil {
		return model.VideoDetail{}, ErrStorageUnavailable
	}
	idOrSlug = strings.TrimSpace(idOrSlug)
	if idOrSlug == "" {
		return model.VideoDetail{}, ErrInvalidInput
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, idOrSlug)
	if err != nil {
		return model.VideoDetail{}, mapStorageError(err)
	}
	summaries, err := s.decorateVideos(ctx, []model.Video{*video})
	if err != nil {
		return model.VideoDetail{}, err
	}
	if len(summaries) == 0 {
		return model.VideoDetail{}, ErrNotFound
	}
	sources, err := s.repo.ListSources(ctx, video.ID)
	if err != nil {
		return model.VideoDetail{}, mapStorageError(err)
	}
	tags, err := s.repo.ListTags(ctx, video.ID)
	if err != nil {
		return model.VideoDetail{}, mapStorageError(err)
	}
	related, err := s.listVideoSummaries(ctx, model.VideoFilter{Limit: 5})
	if err != nil {
		return model.VideoDetail{}, err
	}
	related = excludeVideo(related, video.ID, 4)
	return model.VideoDetail{
		VideoSummary: summaries[0],
		SourceURL:    video.SourceURL,
		Sources:      sources,
		LikeCount:    video.LikeCount,
		Tags:         tags,
		Related:      related,
	}, nil
}

func (s *service) GetVideoDanmaku(ctx context.Context, idOrSlug string) (model.VideoDanmakuPayload, error) {
	if s.repo == nil {
		return model.VideoDanmakuPayload{}, ErrStorageUnavailable
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.VideoDanmakuPayload{}, mapStorageError(err)
	}
	items, err := s.repo.ListDanmaku(ctx, video.ID)
	if err != nil {
		return model.VideoDanmakuPayload{}, mapStorageError(err)
	}
	return model.VideoDanmakuPayload{
		Items:      items,
		NextCursor: nil,
		TotalCount: len(items),
		VideoID:    video.ID,
	}, nil
}

func (s *service) GetVideoComments(ctx context.Context, idOrSlug string, filter model.VideoCommentFilter) (model.VideoCommentPayload, error) {
	if s.repo == nil {
		return model.VideoCommentPayload{}, ErrStorageUnavailable
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.VideoCommentPayload{}, mapStorageError(err)
	}
	filter = normalizeVideoCommentFilter(filter)
	items, err := s.repo.ListVideoComments(ctx, video.ID, filter)
	if err != nil {
		return model.VideoCommentPayload{}, mapStorageError(err)
	}
	sortVideoComments(items, filter.Sort)
	totalCount, err := s.repo.CountVideoComments(ctx, video.ID)
	if err != nil {
		return model.VideoCommentPayload{}, mapStorageError(err)
	}
	return model.VideoCommentPayload{
		Items:      items,
		NextCursor: nil,
		Sort:       filter.Sort,
		TotalCount: totalCount,
		VideoID:    video.ID,
	}, nil
}

func (s *service) CreateVideoComment(ctx context.Context, idOrSlug string, req model.CreateVideoCommentRequest) (model.VideoComment, error) {
	if s.repo == nil {
		return model.VideoComment{}, ErrStorageUnavailable
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.VideoComment{}, mapStorageError(err)
	}
	authorName := normalizeCommentAuthor(req.AuthorName)
	body := normalizeCommentBody(req.Body)
	if authorName == "" || body == "" {
		return model.VideoComment{}, ErrInvalidInput
	}
	now := s.now()
	comment := model.VideoComment{
		ID:         s.newCommentID(),
		VideoID:    video.ID,
		Body:       body,
		AuthorName: authorName,
		Status:     model.CommentStatusVisible,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateVideoComment(ctx, comment); err != nil {
		return model.VideoComment{}, mapStorageError(err)
	}
	if clientID, err := normalizeOptionalCommunityClientID(req.ClientID); err != nil {
		return model.VideoComment{}, err
	} else if clientID != "" {
		if err := s.createNotification(ctx, model.CommunityNotification{
			ClientID:   clientID,
			Kind:       model.CommunityNotificationKindComment,
			Title:      "评论已发布",
			Body:       "你在《" + video.Title + "》下发布的评论已经进入公开讨论区。",
			TargetKind: model.CommunityNotificationTargetVideo,
			TargetID:   video.ID,
			VideoID:    video.ID,
			CreatorID:  video.UploaderID,
			Link:       videoLink(*video),
		}); err != nil {
			return model.VideoComment{}, err
		}
	}
	return comment, nil
}

func (s *service) CreateVideoDanmaku(ctx context.Context, idOrSlug string, req model.CreateVideoDanmakuRequest) (model.VideoDanmakuItem, error) {
	if s.repo == nil {
		return model.VideoDanmakuItem{}, ErrStorageUnavailable
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.VideoDanmakuItem{}, mapStorageError(err)
	}
	authorName := normalizeCommentAuthor(req.AuthorName)
	body := normalizeDanmakuBody(req.Body)
	if authorName == "" || body == "" {
		return model.VideoDanmakuItem{}, ErrInvalidInput
	}
	item := model.VideoDanmakuItem{
		ID:          s.newDanmakuID(),
		VideoID:     video.ID,
		Body:        body,
		TimeSeconds: normalizeDanmakuTime(req.TimeSeconds, video.DurationSeconds),
		Mode:        normalizeDanmakuMode(req.Mode),
		Color:       normalizeDanmakuColor(req.Color),
		AuthorName:  authorName,
		CreatedAt:   s.now(),
	}
	if err := s.repo.CreateVideoDanmaku(ctx, item); err != nil {
		return model.VideoDanmakuItem{}, mapStorageError(err)
	}
	if clientID, err := normalizeOptionalCommunityClientID(req.ClientID); err != nil {
		return model.VideoDanmakuItem{}, err
	} else if clientID != "" {
		if err := s.createNotification(ctx, model.CommunityNotification{
			ClientID:   clientID,
			Kind:       model.CommunityNotificationKindDanmaku,
			Title:      "弹幕已发送",
			Body:       "你的弹幕已经出现在《" + video.Title + "》的播放时间轴上。",
			TargetKind: model.CommunityNotificationTargetVideo,
			TargetID:   video.ID,
			VideoID:    video.ID,
			CreatorID:  video.UploaderID,
			Link:       videoLink(*video),
		}); err != nil {
			return model.VideoDanmakuItem{}, err
		}
	}
	return item, nil
}

func (s *service) CreateVideoReport(ctx context.Context, idOrSlug string, req model.CreateVideoReportRequest) (model.CommunityReportReceipt, error) {
	if s.repo == nil {
		return model.CommunityReportReceipt{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.CommunityReportReceipt{}, err
	}
	reason, err := normalizeReportReason(req.Reason)
	if err != nil {
		return model.CommunityReportReceipt{}, err
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.CommunityReportReceipt{}, mapStorageError(err)
	}
	now := s.now()
	report := model.CommunityReport{
		ID:         s.newReportID(),
		TargetKind: model.CommunityReportTargetVideo,
		TargetID:   video.ID,
		VideoID:    video.ID,
		ClientID:   clientID,
		Reason:     reason,
		Detail:     normalizeReportDetail(req.Detail),
		Status:     model.CommunityReportStatusPending,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateCommunityReport(ctx, report); err != nil {
		return model.CommunityReportReceipt{}, mapStorageError(err)
	}
	if err := s.createNotification(ctx, model.CommunityNotification{
		ClientID:   clientID,
		Kind:       model.CommunityNotificationKindReport,
		Title:      "举报已收到",
		Body:       "你提交的《" + video.Title + "》举报已进入待处理队列。",
		TargetKind: model.CommunityNotificationTargetVideo,
		TargetID:   video.ID,
		VideoID:    video.ID,
		CreatorID:  video.UploaderID,
		Link:       videoLink(*video),
	}); err != nil {
		return model.CommunityReportReceipt{}, err
	}
	return reportReceipt(report), nil
}

func (s *service) GetVideoInteractionState(ctx context.Context, idOrSlug string, req model.VideoInteractionRequest) (model.VideoInteractionState, error) {
	video, clientID, err := s.videoAndClient(ctx, idOrSlug, req)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	return s.videoInteractionState(ctx, *video, clientID)
}

func (s *service) SetVideoInteraction(ctx context.Context, idOrSlug string, kind string, req model.VideoInteractionRequest) (model.VideoInteractionState, error) {
	video, clientID, err := s.videoAndClient(ctx, idOrSlug, req)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	kind, err = normalizeVideoInteractionKind(kind)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	existing, err := s.repo.FindVideoInteraction(ctx, video.ID, clientID, kind)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return model.VideoInteractionState{}, mapStorageError(err)
	}
	now := s.now()
	interaction := model.VideoInteraction{
		ClientID:     clientID,
		VideoID:      video.ID,
		Kind:         kind,
		InteractedAt: now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.repo.SetVideoInteraction(ctx, interaction); err != nil {
		return model.VideoInteractionState{}, mapStorageError(err)
	}
	if existing == nil {
		if err := s.createNotification(ctx, model.CommunityNotification{
			ClientID:   clientID,
			Kind:       model.CommunityNotificationKindInteraction,
			Title:      videoInteractionNotificationTitle(kind),
			Body:       videoInteractionNotificationBody(kind, video.Title),
			TargetKind: model.CommunityNotificationTargetVideo,
			TargetID:   video.ID,
			VideoID:    video.ID,
			CreatorID:  video.UploaderID,
			Link:       videoLink(*video),
		}); err != nil {
			return model.VideoInteractionState{}, err
		}
	}
	updated, err := s.repo.FindVideoByIDOrSlug(ctx, video.ID)
	if err != nil {
		return model.VideoInteractionState{}, mapStorageError(err)
	}
	return s.videoInteractionState(ctx, *updated, clientID)
}

func (s *service) UnsetVideoInteraction(ctx context.Context, idOrSlug string, kind string, req model.VideoInteractionRequest) (model.VideoInteractionState, error) {
	video, clientID, err := s.videoAndClient(ctx, idOrSlug, req)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	kind, err = normalizeVideoInteractionKind(kind)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	if err := s.repo.UnsetVideoInteraction(ctx, video.ID, clientID, kind, s.now()); err != nil {
		return model.VideoInteractionState{}, mapStorageError(err)
	}
	updated, err := s.repo.FindVideoByIDOrSlug(ctx, video.ID)
	if err != nil {
		return model.VideoInteractionState{}, mapStorageError(err)
	}
	return s.videoInteractionState(ctx, *updated, clientID)
}

func (s *service) GetCreatorProfile(ctx context.Context, handle string) (model.CreatorProfile, error) {
	if s.repo == nil {
		return model.CreatorProfile{}, ErrStorageUnavailable
	}
	creator, err := s.repo.FindCreatorByHandle(ctx, strings.TrimSpace(handle))
	if err != nil {
		return model.CreatorProfile{}, mapStorageError(err)
	}
	latest, err := s.listVideoSummaries(ctx, model.VideoFilter{Limit: 24})
	if err != nil {
		return model.CreatorProfile{}, err
	}
	creatorVideos := make([]model.VideoSummary, 0)
	for _, video := range latest {
		if video.Uploader.Handle == creator.Handle {
			creatorVideos = append(creatorVideos, video)
		}
	}
	return model.CreatorProfile{
		UserSummary:   creator.UserSummary,
		Bio:           creator.Bio,
		Categories:    uniqueCategoriesFromVideos(creatorVideos),
		FollowerCount: creator.FollowerCount,
		JoinedAt:      creator.JoinedAt,
		Latest:        model.PageResult[model.VideoSummary]{Items: creatorVideos},
		VideoCount:    len(creatorVideos),
	}, nil
}

func (s *service) GetCreatorFollowState(ctx context.Context, handle string, req model.CreatorFollowRequest) (model.CreatorFollowState, error) {
	creator, clientID, err := s.creatorAndClient(ctx, handle, req)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	return s.creatorFollowState(ctx, *creator, clientID)
}

func (s *service) FollowCreator(ctx context.Context, handle string, req model.CreatorFollowRequest) (model.CreatorFollowState, error) {
	creator, clientID, err := s.creatorAndClient(ctx, handle, req)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	existing, err := s.repo.FindCreatorFollow(ctx, creator.ID, clientID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	wasFollowing := existing != nil
	now := s.now()
	follow := model.CreatorFollow{
		ClientID:   clientID,
		CreatorID:  creator.ID,
		FollowedAt: now,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.FollowCreator(ctx, follow); err != nil {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	if !wasFollowing {
		if err := s.createNotification(ctx, model.CommunityNotification{
			ClientID:   clientID,
			Kind:       model.CommunityNotificationKindFollow,
			Title:      "已关注创作者",
			Body:       "你已关注 " + creator.DisplayName + "，新的投稿会进入关注动态。",
			TargetKind: model.CommunityNotificationTargetCreator,
			TargetID:   creator.ID,
			CreatorID:  creator.ID,
			Link:       creatorLink(*creator),
		}); err != nil {
			return model.CreatorFollowState{}, err
		}
	}
	updated, err := s.repo.FindCreatorByHandle(ctx, creator.Handle)
	if err != nil {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	return s.creatorFollowState(ctx, *updated, clientID)
}

func (s *service) UnfollowCreator(ctx context.Context, handle string, req model.CreatorFollowRequest) (model.CreatorFollowState, error) {
	creator, clientID, err := s.creatorAndClient(ctx, handle, req)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	if err := s.repo.UnfollowCreator(ctx, creator.ID, clientID, s.now()); err != nil {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	updated, err := s.repo.FindCreatorByHandle(ctx, creator.Handle)
	if err != nil {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	return s.creatorFollowState(ctx, *updated, clientID)
}

func (s *service) Search(ctx context.Context, query string, limit int) (model.SearchPayload, error) {
	query = strings.TrimSpace(query)
	limit = normalizeLimit(limit, 24)
	if query == "" {
		return model.SearchPayload{
			Categories: model.PageResult[model.Category]{Items: []model.Category{}},
			Creators:   model.PageResult[model.CreatorProfile]{Items: []model.CreatorProfile{}},
			Query:      "",
			Videos:     model.PageResult[model.VideoSummary]{Items: []model.VideoSummary{}},
		}, nil
	}
	videos, err := s.listVideoSummaries(ctx, model.VideoFilter{Limit: limit, Query: query})
	if err != nil {
		return model.SearchPayload{}, err
	}
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return model.SearchPayload{}, mapStorageError(err)
	}
	categoryMatches := make([]model.Category, 0)
	needle := normalize(query)
	for _, category := range categories {
		if matchesCategory(category, needle) {
			categoryMatches = append(categoryMatches, category)
			if len(categoryMatches) >= limit {
				break
			}
		}
	}
	creators, err := s.repo.ListCreators(ctx, limit)
	if err != nil {
		return model.SearchPayload{}, mapStorageError(err)
	}
	creatorProfiles := make([]model.CreatorProfile, 0)
	for _, creator := range creators {
		if !matchesCreator(creator, needle) {
			continue
		}
		profile, err := s.GetCreatorProfile(ctx, creator.Handle)
		if err != nil {
			return model.SearchPayload{}, err
		}
		creatorProfiles = append(creatorProfiles, profile)
		if len(creatorProfiles) >= limit {
			break
		}
	}
	total := len(videos) + len(categoryMatches) + len(creatorProfiles)
	return model.SearchPayload{
		Categories: model.PageResult[model.Category]{Items: categoryMatches},
		Creators:   model.PageResult[model.CreatorProfile]{Items: creatorProfiles},
		Query:      query,
		TotalCount: total,
		Videos:     model.PageResult[model.VideoSummary]{Items: videos},
	}, nil
}

func (s *service) FollowingFeed(ctx context.Context, req model.CreatorFollowRequest) (model.FollowingFeedPayload, error) {
	clientID := strings.TrimSpace(req.ClientID)
	if clientID != "" {
		normalizedClientID, err := normalizeCommunityClientID(clientID)
		if err != nil {
			return model.FollowingFeedPayload{}, err
		}
		follows, err := s.repo.ListCreatorFollows(ctx, normalizedClientID, 24)
		if err != nil {
			return model.FollowingFeedPayload{}, mapStorageError(err)
		}
		if len(follows) > 0 {
			return s.followingFeedForClient(ctx, normalizedClientID, follows)
		}
		return s.recommendedFollowingFeed(ctx, &normalizedClientID, "还没有关注任何创作者，先展示社区推荐。")
	}
	return s.recommendedFollowingFeed(ctx, nil, "还没有识别到你的关注列表，先展示社区推荐。")
}

func (s *service) VideoLibrary(ctx context.Context, req model.VideoInteractionRequest) (model.VideoLibraryPayload, error) {
	if s.repo == nil {
		return model.VideoLibraryPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.VideoLibraryPayload{}, err
	}
	favorites, err := s.repo.ListVideoInteractions(ctx, model.VideoInteractionFilter{
		ClientID: clientID,
		Kind:     model.VideoInteractionKindFavorite,
		Limit:    48,
	})
	if err != nil {
		return model.VideoLibraryPayload{}, mapStorageError(err)
	}
	watchLater, err := s.repo.ListVideoInteractions(ctx, model.VideoInteractionFilter{
		ClientID: clientID,
		Kind:     model.VideoInteractionKindWatchLater,
		Limit:    48,
	})
	if err != nil {
		return model.VideoLibraryPayload{}, mapStorageError(err)
	}
	favoriteVideos, err := s.videoSummariesForInteractions(ctx, favorites)
	if err != nil {
		return model.VideoLibraryPayload{}, err
	}
	watchLaterVideos, err := s.videoSummariesForInteractions(ctx, watchLater)
	if err != nil {
		return model.VideoLibraryPayload{}, err
	}
	message := "收藏和稍后看会跟随当前会话同步；登录后可进入你的账号资料库。"
	return model.VideoLibraryPayload{
		Authenticated:   false,
		ClientID:        &clientID,
		FavoriteCount:   len(favoriteVideos),
		WatchLaterCount: len(watchLaterVideos),
		Favorites:       model.PageResult[model.VideoSummary]{Items: favoriteVideos},
		WatchLater:      model.PageResult[model.VideoSummary]{Items: watchLaterVideos},
		Message:         &message,
	}, nil
}

func (s *service) VideoHistory(ctx context.Context, filter model.VideoHistoryFilter) (model.VideoHistoryPayload, error) {
	if s.repo == nil {
		return model.VideoHistoryPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(filter.ClientID)
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	filter.ClientID = clientID
	filter.Limit = normalizeLimit(filter.Limit, 48)
	histories, err := s.repo.ListVideoHistory(ctx, filter)
	if err != nil {
		return model.VideoHistoryPayload{}, mapStorageError(err)
	}
	items, err := s.videoHistoryItems(ctx, histories)
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	return videoHistoryPayload(clientID, items), nil
}

func (s *service) RecordVideoHistory(ctx context.Context, idOrSlug string, req model.VideoHistoryRequest) (model.VideoHistoryItem, error) {
	if s.repo == nil {
		return model.VideoHistoryItem{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.VideoHistoryItem{}, err
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return model.VideoHistoryItem{}, mapStorageError(err)
	}
	now := s.now()
	history := model.VideoHistory{
		ClientID:        clientID,
		VideoID:         video.ID,
		ProgressSeconds: normalizeHistoryProgress(req.ProgressSeconds, video.DurationSeconds),
		LastViewedAt:    now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.repo.SetVideoHistory(ctx, history); err != nil {
		return model.VideoHistoryItem{}, mapStorageError(err)
	}
	items, err := s.videoHistoryItems(ctx, []model.VideoHistory{history})
	if err != nil {
		return model.VideoHistoryItem{}, err
	}
	if len(items) == 0 {
		return model.VideoHistoryItem{}, ErrNotFound
	}
	return items[0], nil
}

func (s *service) ClearVideoHistory(ctx context.Context, req model.VideoHistoryClearRequest) (model.VideoHistoryPayload, error) {
	if s.repo == nil {
		return model.VideoHistoryPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	if err := s.repo.ClearVideoHistory(ctx, clientID, s.now()); err != nil {
		return model.VideoHistoryPayload{}, mapStorageError(err)
	}
	return videoHistoryPayload(clientID, []model.VideoHistoryItem{}), nil
}

func (s *service) CommunityNotifications(ctx context.Context, filter model.CommunityNotificationFilter) (model.CommunityNotificationPayload, error) {
	if s.repo == nil {
		return model.CommunityNotificationPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(filter.ClientID)
	if err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	filter.ClientID = clientID
	filter.Limit = normalizeLimit(filter.Limit, 48)
	items, err := s.repo.ListCommunityNotifications(ctx, filter)
	if err != nil {
		return model.CommunityNotificationPayload{}, mapStorageError(err)
	}
	return notificationPayload(clientID, items), nil
}

func (s *service) MarkCommunityNotificationsRead(ctx context.Context, req model.CommunityNotificationRequest) (model.CommunityNotificationPayload, error) {
	if s.repo == nil {
		return model.CommunityNotificationPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	if err := s.repo.MarkCommunityNotificationsRead(ctx, clientID, s.now()); err != nil {
		return model.CommunityNotificationPayload{}, mapStorageError(err)
	}
	return s.CommunityNotifications(ctx, model.CommunityNotificationFilter{ClientID: clientID, Limit: 48})
}

func (s *service) ListCommunityDynamics(ctx context.Context, filter model.CommunityDynamicFilter) (model.CommunityDynamicPayload, error) {
	if s.repo == nil {
		return model.CommunityDynamicPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeOptionalCommunityClientID(filter.ClientID)
	if err != nil {
		return model.CommunityDynamicPayload{}, err
	}
	filter.ClientID = clientID
	filter.Limit = normalizeLimit(filter.Limit, 24)
	items, err := s.communityDynamicItems(ctx, filter)
	if err != nil {
		return model.CommunityDynamicPayload{}, err
	}
	message := "社区动态会展示创作者短更新，也会在关注动态里保持轻量阅读节奏。"
	var client *string
	if clientID != "" {
		client = &clientID
	}
	return model.CommunityDynamicPayload{
		Authenticated: false,
		ClientID:      client,
		Items:         model.PageResult[model.CommunityDynamicItem]{Items: items},
		Message:       &message,
	}, nil
}

func (s *service) CreateCommunityDynamic(ctx context.Context, req model.CreateCommunityDynamicRequest) (model.CommunityDynamicItem, error) {
	if s.repo == nil {
		return model.CommunityDynamicItem{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	authorName := normalizeCommentAuthor(req.AuthorName)
	body := normalizeCommentBody(req.Body)
	if authorName == "" || body == "" {
		return model.CommunityDynamicItem{}, ErrInvalidInput
	}
	videoID := strings.TrimSpace(req.VideoID)
	creatorID := ""
	kind := model.CommunityDynamicKindText
	if videoID != "" {
		video, err := s.repo.FindVideoByIDOrSlug(ctx, videoID)
		if err != nil {
			return model.CommunityDynamicItem{}, mapStorageError(err)
		}
		videoID = video.ID
		creatorID = video.UploaderID
		kind = model.CommunityDynamicKindVideoUpdate
	}
	now := s.now()
	dynamic := model.CommunityDynamic{
		ID:         s.newDynamicID(),
		ClientID:   clientID,
		CreatorID:  creatorID,
		AuthorName: authorName,
		Body:       body,
		Kind:       kind,
		Status:     model.CommunityDynamicStatusVisible,
		VideoID:    videoID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateCommunityDynamic(ctx, dynamic); err != nil {
		return model.CommunityDynamicItem{}, mapStorageError(err)
	}
	items, err := s.decorateDynamics(ctx, []model.CommunityDynamic{dynamic})
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	if len(items) == 0 {
		return model.CommunityDynamicItem{}, ErrStorageUnavailable
	}
	return items[0], nil
}

func (s *service) ListCommunitySubmissions(ctx context.Context, filter model.CommunitySubmissionFilter) (model.CommunitySubmissionPayload, error) {
	if s.repo == nil {
		return model.CommunitySubmissionPayload{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(filter.ClientID)
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	filter.ClientID = clientID
	filter.Limit = normalizeLimit(filter.Limit, 24)
	submissions, err := s.repo.ListCommunitySubmissions(ctx, filter)
	if err != nil {
		return model.CommunitySubmissionPayload{}, mapStorageError(err)
	}
	items, err := s.decorateSubmissions(ctx, submissions)
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	message := "投稿记录来自社区审核队列；当前只保存标题、分类、标签和文件信息。"
	return model.CommunitySubmissionPayload{
		Authenticated: false,
		ClientID:      &clientID,
		Items:         model.PageResult[model.CommunitySubmissionItem]{Items: items},
		Message:       &message,
	}, nil
}

func (s *service) CreateCommunitySubmission(ctx context.Context, req model.CreateCommunitySubmissionRequest) (model.CommunitySubmissionItem, error) {
	if s.repo == nil {
		return model.CommunitySubmissionItem{}, ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	authorName := normalizeCommentAuthor(req.AuthorName)
	title := trimRunes(req.Title, 160)
	description := trimRunes(req.Description, 720)
	categorySlug := strings.TrimSpace(req.CategorySlug)
	sourceName := trimRunes(req.SourceName, 240)
	sourceType := trimRunes(req.SourceType, 120)
	visibility, err := normalizeSubmissionVisibility(req.Visibility)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	category, err := s.categoryForSlug(ctx, categorySlug)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	tags := normalizeSubmissionTags(req.Tags)
	tagsJSON, err := encodeSubmissionTags(tags)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	if authorName == "" || len([]rune(title)) < 4 || sourceName == "" || req.SourceSize <= 0 || category == nil {
		return model.CommunitySubmissionItem{}, ErrInvalidInput
	}
	now := s.now()
	submission := model.CommunitySubmission{
		ID:            s.newSubmissionID(),
		ClientID:      clientID,
		AuthorName:    authorName,
		Title:         title,
		Description:   description,
		CategorySlug:  category.Slug,
		TagsJSON:      tagsJSON,
		Visibility:    visibility,
		SourceName:    sourceName,
		SourceSize:    req.SourceSize,
		SourceType:    sourceType,
		AllowComments: req.AllowComments,
		Sensitive:     req.Sensitive,
		Status:        model.CommunitySubmissionStatusPendingReview,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.repo.CreateCommunitySubmission(ctx, submission); err != nil {
		return model.CommunitySubmissionItem{}, mapStorageError(err)
	}
	if err := s.createNotification(ctx, model.CommunityNotification{
		ClientID:   clientID,
		Kind:       model.CommunityNotificationKindSubmission,
		Title:      "投稿已进入待审核",
		Body:       "《" + submission.Title + "》已进入待审核池，当前已保存标题、分区、标签和文件元数据。",
		TargetKind: model.CommunityNotificationTargetSubmission,
		TargetID:   submission.ID,
		Link:       "/upload",
	}); err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	items, err := s.decorateSubmissions(ctx, []model.CommunitySubmission{submission})
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	if len(items) == 0 {
		return model.CommunitySubmissionItem{}, ErrStorageUnavailable
	}
	return items[0], nil
}

func (s *service) ListCommunityAccountSubmissions(ctx context.Context, principal authtypes.Principal, limit int) (model.CommunitySubmissionPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	payload, err := s.ListCommunitySubmissions(ctx, model.CommunitySubmissionFilter{
		ClientID: clientID,
		Limit:    limit,
	})
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	payload.Authenticated = true
	message := "Community account submissions are stored in the shared review queue."
	payload.Message = &message
	return payload, nil
}

func (s *service) CreateCommunityAccountSubmission(ctx context.Context, principal authtypes.Principal, req model.CreateCommunityAccountSubmissionRequest) (model.CommunitySubmissionItem, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	return s.CreateCommunitySubmission(ctx, model.CreateCommunitySubmissionRequest{
		AllowComments: req.AllowComments,
		AuthorName:    communityAccountAuthorName(principal),
		CategorySlug:  req.CategorySlug,
		ClientID:      clientID,
		Description:   req.Description,
		Sensitive:     req.Sensitive,
		SourceName:    req.SourceName,
		SourceSize:    req.SourceSize,
		SourceType:    req.SourceType,
		Tags:          req.Tags,
		Title:         req.Title,
		Visibility:    req.Visibility,
	})
}

func (s *service) createNotification(ctx context.Context, notification model.CommunityNotification) error {
	if s.repo == nil {
		return ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(notification.ClientID)
	if err != nil {
		return err
	}
	now := s.now()
	notification.ID = s.newNotificationID()
	notification.ClientID = clientID
	notification.Kind = strings.TrimSpace(notification.Kind)
	notification.Title = trimRunes(notification.Title, 160)
	notification.Body = trimRunes(notification.Body, 500)
	notification.TargetKind = strings.TrimSpace(notification.TargetKind)
	notification.TargetID = strings.TrimSpace(notification.TargetID)
	notification.VideoID = strings.TrimSpace(notification.VideoID)
	notification.CreatorID = strings.TrimSpace(notification.CreatorID)
	notification.Link = trimRunes(notification.Link, 512)
	notification.CreatedAt = now
	notification.UpdatedAt = now
	if notification.Kind == "" || notification.Title == "" || notification.TargetKind == "" || notification.TargetID == "" {
		return ErrInvalidInput
	}
	if err := s.repo.CreateCommunityNotification(ctx, notification); err != nil {
		return mapStorageError(err)
	}
	return nil
}

func (s *service) recommendedFollowingFeed(ctx context.Context, clientID *string, messageText string) (model.FollowingFeedPayload, error) {
	creators, err := s.repo.ListCreators(ctx, 4)
	if err != nil {
		return model.FollowingFeedPayload{}, mapStorageError(err)
	}
	profiles := make([]model.CreatorProfile, 0, len(creators))
	for _, creator := range creators {
		profile, err := s.GetCreatorProfile(ctx, creator.Handle)
		if err != nil {
			return model.FollowingFeedPayload{}, err
		}
		profiles = append(profiles, profile)
	}
	latest, err := s.ListVideos(ctx, model.VideoFilter{Limit: 6})
	if err != nil {
		return model.FollowingFeedPayload{}, err
	}
	dynamics, err := s.communityDynamicItems(ctx, model.CommunityDynamicFilter{Limit: 6})
	if err != nil {
		return model.FollowingFeedPayload{}, err
	}
	message := messageText
	return model.FollowingFeedPayload{
		Authenticated:  false,
		ClientID:       clientID,
		Creators:       profiles,
		FollowingCount: 0,
		Dynamics:       model.PageResult[model.CommunityDynamicItem]{Items: dynamics},
		Latest:         latest,
		Message:        &message,
	}, nil
}

func (s *service) followingFeedForClient(ctx context.Context, clientID string, follows []model.CreatorFollow) (model.FollowingFeedPayload, error) {
	creators, err := s.repo.ListCreators(ctx, 0)
	if err != nil {
		return model.FollowingFeedPayload{}, mapStorageError(err)
	}
	creatorByID := make(map[string]model.Creator, len(creators))
	for _, creator := range creators {
		creatorByID[creator.ID] = creator
	}
	profiles := make([]model.CreatorProfile, 0, len(follows))
	followedIDs := make(map[string]struct{}, len(follows))
	followedCreatorIDs := make([]string, 0, len(follows))
	for _, follow := range follows {
		creator, ok := creatorByID[follow.CreatorID]
		if !ok {
			continue
		}
		profile, err := s.GetCreatorProfile(ctx, creator.Handle)
		if err != nil {
			return model.FollowingFeedPayload{}, err
		}
		followedAt := follow.FollowedAt
		profile.FollowedAt = &followedAt
		profiles = append(profiles, profile)
		followedIDs[creator.ID] = struct{}{}
		followedCreatorIDs = append(followedCreatorIDs, creator.ID)
	}
	latest, err := s.ListVideos(ctx, model.VideoFilter{Limit: 24})
	if err != nil {
		return model.FollowingFeedPayload{}, err
	}
	filtered := make([]model.VideoSummary, 0, len(latest.Items))
	for _, video := range latest.Items {
		if _, ok := followedIDs[video.Uploader.ID]; ok {
			filtered = append(filtered, video)
		}
	}
	dynamics := []model.CommunityDynamicItem{}
	if len(followedCreatorIDs) > 0 {
		var err error
		dynamics, err = s.communityDynamicItems(ctx, model.CommunityDynamicFilter{CreatorIDs: followedCreatorIDs, Limit: 12})
		if err != nil {
			return model.FollowingFeedPayload{}, err
		}
	}
	message := "关注关系会跟随当前会话同步；登录后可进入你的社区账号。"
	return model.FollowingFeedPayload{
		Authenticated:  false,
		ClientID:       &clientID,
		Creators:       profiles,
		FollowingCount: len(profiles),
		Dynamics:       model.PageResult[model.CommunityDynamicItem]{Items: dynamics},
		Latest:         model.PageResult[model.VideoSummary]{Items: filtered},
		Message:        &message,
	}, nil
}

func (s *service) communityDynamicItems(ctx context.Context, filter model.CommunityDynamicFilter) ([]model.CommunityDynamicItem, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	filter.Limit = normalizeLimit(filter.Limit, 24)
	dynamics, err := s.repo.ListCommunityDynamics(ctx, filter)
	if err != nil {
		return nil, mapStorageError(err)
	}
	return s.decorateDynamics(ctx, dynamics)
}

func (s *service) decorateDynamics(ctx context.Context, dynamics []model.CommunityDynamic) ([]model.CommunityDynamicItem, error) {
	if len(dynamics) == 0 {
		return []model.CommunityDynamicItem{}, nil
	}
	creators, err := s.repo.ListCreators(ctx, 0)
	if err != nil {
		return nil, mapStorageError(err)
	}
	creatorByID := make(map[string]model.Creator, len(creators))
	for _, creator := range creators {
		creatorByID[creator.ID] = creator
	}
	videoIDs := make([]string, 0, len(dynamics))
	seenVideoIDs := make(map[string]struct{}, len(dynamics))
	for _, dynamic := range dynamics {
		if dynamic.VideoID == "" {
			continue
		}
		if _, ok := seenVideoIDs[dynamic.VideoID]; ok {
			continue
		}
		seenVideoIDs[dynamic.VideoID] = struct{}{}
		videoIDs = append(videoIDs, dynamic.VideoID)
	}
	videos, err := s.repo.ListVideosByIDs(ctx, videoIDs)
	if err != nil {
		return nil, mapStorageError(err)
	}
	summaries, err := s.decorateVideos(ctx, videos)
	if err != nil {
		return nil, err
	}
	videoByID := make(map[string]model.VideoSummary, len(summaries))
	for _, video := range summaries {
		videoByID[video.ID] = video
	}
	items := make([]model.CommunityDynamicItem, 0, len(dynamics))
	for _, dynamic := range dynamics {
		var author *model.UserSummary
		authorName := dynamic.AuthorName
		if creator, ok := creatorByID[dynamic.CreatorID]; ok {
			authorSummary := creator.UserSummary
			author = &authorSummary
			if authorName == "" {
				authorName = creator.DisplayName
			}
		}
		var video *model.VideoSummary
		if summary, ok := videoByID[dynamic.VideoID]; ok {
			videoSummary := summary
			video = &videoSummary
		}
		items = append(items, model.CommunityDynamicItem{
			ID:         dynamic.ID,
			Kind:       dynamic.Kind,
			AuthorName: authorName,
			Author:     author,
			Body:       dynamic.Body,
			VideoID:    dynamic.VideoID,
			Video:      video,
			CreatedAt:  dynamic.CreatedAt,
		})
	}
	return items, nil
}

func (s *service) decorateSubmissions(ctx context.Context, submissions []model.CommunitySubmission) ([]model.CommunitySubmissionItem, error) {
	if len(submissions) == 0 {
		return []model.CommunitySubmissionItem{}, nil
	}
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, mapStorageError(err)
	}
	categoryBySlug := make(map[string]model.Category, len(categories))
	for _, category := range categories {
		categoryBySlug[category.Slug] = category
	}
	items := make([]model.CommunitySubmissionItem, 0, len(submissions))
	for _, submission := range submissions {
		var category *model.Category
		if match, ok := categoryBySlug[submission.CategorySlug]; ok {
			item := match
			category = &item
		}
		items = append(items, model.CommunitySubmissionItem{
			ID:            submission.ID,
			ClientID:      submission.ClientID,
			AuthorName:    submission.AuthorName,
			Title:         submission.Title,
			Description:   submission.Description,
			CategorySlug:  submission.CategorySlug,
			Category:      category,
			Tags:          decodeSubmissionTags(submission.TagsJSON),
			Visibility:    submission.Visibility,
			SourceName:    submission.SourceName,
			SourceSize:    submission.SourceSize,
			SourceType:    submission.SourceType,
			AllowComments: submission.AllowComments,
			Sensitive:     submission.Sensitive,
			Status:        submission.Status,
			CreatedAt:     submission.CreatedAt,
		})
	}
	return items, nil
}

func (s *service) categoryForSlug(ctx context.Context, slug string) (*model.Category, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrInvalidInput
	}
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, mapStorageError(err)
	}
	for _, category := range categories {
		if category.Slug == slug {
			item := category
			return &item, nil
		}
	}
	return nil, ErrInvalidInput
}

func (s *service) videoSummariesForInteractions(ctx context.Context, interactions []model.VideoInteraction) ([]model.VideoSummary, error) {
	if len(interactions) == 0 {
		return []model.VideoSummary{}, nil
	}
	ids := make([]string, 0, len(interactions))
	for _, interaction := range interactions {
		ids = append(ids, interaction.VideoID)
	}
	videos, err := s.repo.ListVideosByIDs(ctx, ids)
	if err != nil {
		return nil, mapStorageError(err)
	}
	videoByID := make(map[string]model.Video, len(videos))
	for _, video := range videos {
		videoByID[video.ID] = video
	}
	ordered := make([]model.Video, 0, len(interactions))
	for _, interaction := range interactions {
		if video, ok := videoByID[interaction.VideoID]; ok {
			ordered = append(ordered, video)
		}
	}
	return s.decorateVideos(ctx, ordered)
}

func (s *service) videoHistoryItems(ctx context.Context, histories []model.VideoHistory) ([]model.VideoHistoryItem, error) {
	if len(histories) == 0 {
		return []model.VideoHistoryItem{}, nil
	}
	ids := make([]string, 0, len(histories))
	for _, history := range histories {
		ids = append(ids, history.VideoID)
	}
	videos, err := s.repo.ListVideosByIDs(ctx, ids)
	if err != nil {
		return nil, mapStorageError(err)
	}
	videoByID := make(map[string]model.Video, len(videos))
	for _, video := range videos {
		videoByID[video.ID] = video
	}
	ordered := make([]model.Video, 0, len(histories))
	orderedHistories := make([]model.VideoHistory, 0, len(histories))
	for _, history := range histories {
		if video, ok := videoByID[history.VideoID]; ok {
			ordered = append(ordered, video)
			orderedHistories = append(orderedHistories, history)
		}
	}
	summaries, err := s.decorateVideos(ctx, ordered)
	if err != nil {
		return nil, err
	}
	items := make([]model.VideoHistoryItem, 0, len(summaries))
	for index, summary := range summaries {
		history := orderedHistories[index]
		items = append(items, model.VideoHistoryItem{
			Video:           summary,
			ProgressSeconds: normalizeHistoryProgress(history.ProgressSeconds, summary.DurationSeconds),
			LastViewedAt:    history.LastViewedAt,
		})
	}
	return items, nil
}

func (s *service) listVideoSummaries(ctx context.Context, filter model.VideoFilter) ([]model.VideoSummary, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	videos, err := s.repo.ListVideos(ctx, normalizeVideoFilter(filter))
	if err != nil {
		return nil, mapStorageError(err)
	}
	return s.decorateVideos(ctx, videos)
}

func (s *service) decorateVideos(ctx context.Context, videos []model.Video) ([]model.VideoSummary, error) {
	if len(videos) == 0 {
		return []model.VideoSummary{}, nil
	}
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, mapStorageError(err)
	}
	creators, err := s.repo.ListCreators(ctx, 0)
	if err != nil {
		return nil, mapStorageError(err)
	}
	categoryBySlug := make(map[string]model.Category, len(categories))
	for _, category := range categories {
		categoryBySlug[category.Slug] = category
	}
	creatorByID := make(map[string]model.Creator, len(creators))
	for _, creator := range creators {
		creatorByID[creator.ID] = creator
	}
	out := make([]model.VideoSummary, 0, len(videos))
	for _, video := range videos {
		categorySlugs, err := s.repo.ListCategorySlugs(ctx, video.ID)
		if err != nil {
			return nil, mapStorageError(err)
		}
		videoCategories := make([]model.Category, 0, len(categorySlugs))
		for _, slug := range categorySlugs {
			if category, ok := categoryBySlug[slug]; ok {
				videoCategories = append(videoCategories, category)
			}
		}
		if len(videoCategories) == 0 {
			videoCategories = categoriesForVideoByTitle(video, categories)
		}
		uploader := model.UserSummary{ID: video.UploaderID, Handle: "unknown", DisplayName: "Unknown", AvatarURL: nil}
		if creator, ok := creatorByID[video.UploaderID]; ok {
			uploader = creator.UserSummary
		}
		out = append(out, model.VideoSummary{
			ID:              video.ID,
			Slug:            video.Slug,
			Title:           video.Title,
			Description:     video.Description,
			ThumbnailURL:    video.ThumbnailURL,
			DurationSeconds: video.DurationSeconds,
			ViewCount:       video.ViewCount,
			CommentCount:    video.CommentCount,
			PublishedAt:     video.PublishedAt,
			Uploader:        uploader,
			Categories:      videoCategories,
		})
	}
	return out, nil
}

func buildCategoryTree(categories []model.Category) []model.CategoryTreeNode {
	known := make(map[string]struct{}, len(categories))
	for _, category := range categories {
		known[category.Slug] = struct{}{}
	}

	roots := make([]model.Category, 0)
	childrenByParent := make(map[string][]model.Category, len(categories))
	for _, category := range categories {
		parentSlug := ""
		if category.ParentSlug != nil {
			if _, ok := known[*category.ParentSlug]; ok {
				parentSlug = *category.ParentSlug
			}
		}
		if parentSlug == "" {
			roots = append(roots, category)
			continue
		}
		childrenByParent[parentSlug] = append(childrenByParent[parentSlug], category)
	}

	sortCategories(roots)
	for parentSlug := range childrenByParent {
		sortCategories(childrenByParent[parentSlug])
	}

	var buildNode func(model.Category) model.CategoryTreeNode
	buildNode = func(category model.Category) model.CategoryTreeNode {
		children := childrenByParent[category.Slug]
		node := model.CategoryTreeNode{
			Category: category,
			Children: make([]model.CategoryTreeNode, 0, len(children)),
		}
		for _, child := range children {
			node.Children = append(node.Children, buildNode(child))
		}
		return node
	}

	tree := make([]model.CategoryTreeNode, 0, len(roots))
	for _, root := range roots {
		tree = append(tree, buildNode(root))
	}
	return tree
}

func sortCategories(categories []model.Category) {
	sort.SliceStable(categories, func(i, j int) bool {
		if categories[i].Order == categories[j].Order {
			return categories[i].Slug < categories[j].Slug
		}
		return categories[i].Order < categories[j].Order
	})
}

func sortVideoComments(items []model.VideoComment, sortMode string) {
	sort.SliceStable(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left.CreatedAt.Equal(right.CreatedAt) {
			if sortMode == model.CommentSortOldest {
				return left.ID < right.ID
			}
			return left.ID > right.ID
		}
		if sortMode == model.CommentSortOldest {
			return left.CreatedAt.Before(right.CreatedAt)
		}
		return left.CreatedAt.After(right.CreatedAt)
	})
}

func categoriesForVideoByTitle(video model.Video, categories []model.Category) []model.Category {
	out := make([]model.Category, 0)
	title := normalize(video.Title + " " + deref(video.Description))
	for _, category := range categories {
		if category.Slug == "home" {
			continue
		}
		if strings.Contains(title, normalize(category.Name)) || strings.Contains(title, normalize(category.Slug)) {
			out = append(out, category)
		}
	}
	return out
}

func uniqueCategoriesFromVideos(videos []model.VideoSummary) []model.Category {
	seen := map[string]struct{}{}
	out := make([]model.Category, 0)
	for _, video := range videos {
		for _, category := range video.Categories {
			if _, ok := seen[category.Slug]; ok {
				continue
			}
			seen[category.Slug] = struct{}{}
			out = append(out, category)
		}
	}
	return out
}

func excludeVideo(videos []model.VideoSummary, id string, limit int) []model.VideoSummary {
	out := make([]model.VideoSummary, 0, limit)
	for _, video := range videos {
		if video.ID == id {
			continue
		}
		out = append(out, video)
		if len(out) >= limit {
			break
		}
	}
	return out
}

func (s *service) creatorAndClient(ctx context.Context, handle string, req model.CreatorFollowRequest) (*model.Creator, string, error) {
	if s.repo == nil {
		return nil, "", ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return nil, "", err
	}
	creator, err := s.repo.FindCreatorByHandle(ctx, strings.TrimSpace(handle))
	if err != nil {
		return nil, "", mapStorageError(err)
	}
	return creator, clientID, nil
}

func (s *service) videoAndClient(ctx context.Context, idOrSlug string, req model.VideoInteractionRequest) (*model.Video, string, error) {
	if s.repo == nil {
		return nil, "", ErrStorageUnavailable
	}
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return nil, "", err
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return nil, "", mapStorageError(err)
	}
	return video, clientID, nil
}

func (s *service) creatorFollowState(ctx context.Context, creator model.Creator, clientID string) (model.CreatorFollowState, error) {
	follow, err := s.repo.FindCreatorFollow(ctx, creator.ID, clientID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return model.CreatorFollowState{}, mapStorageError(err)
	}
	var followedAt *time.Time
	following := follow != nil
	if follow != nil {
		value := follow.FollowedAt
		followedAt = &value
	}
	return model.CreatorFollowState{
		ClientID:      clientID,
		CreatorID:     creator.ID,
		Handle:        creator.Handle,
		Following:     following,
		FollowerCount: creator.FollowerCount,
		FollowedAt:    followedAt,
	}, nil
}

func (s *service) videoInteractionState(ctx context.Context, video model.Video, clientID string) (model.VideoInteractionState, error) {
	state := model.VideoInteractionState{
		ClientID:  clientID,
		VideoID:   video.ID,
		LikeCount: video.LikeCount,
	}
	kinds := []string{
		model.VideoInteractionKindLike,
		model.VideoInteractionKindFavorite,
		model.VideoInteractionKindWatchLater,
	}
	for _, kind := range kinds {
		interaction, err := s.repo.FindVideoInteraction(ctx, video.ID, clientID, kind)
		if err != nil && !errors.Is(err, ErrNotFound) {
			return model.VideoInteractionState{}, mapStorageError(err)
		}
		if interaction == nil {
			continue
		}
		switch kind {
		case model.VideoInteractionKindLike:
			state.Liked = true
		case model.VideoInteractionKindFavorite:
			state.Favorited = true
		case model.VideoInteractionKindWatchLater:
			state.WatchLater = true
		}
	}
	return state, nil
}

func normalizeVideoFilter(filter model.VideoFilter) model.VideoFilter {
	filter.Category = strings.TrimSpace(filter.Category)
	filter.Cursor = strings.TrimSpace(filter.Cursor)
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Limit = normalizeLimit(filter.Limit, 24)
	return filter
}

func normalizeVideoCommentFilter(filter model.VideoCommentFilter) model.VideoCommentFilter {
	filter.Sort = strings.TrimSpace(filter.Sort)
	if filter.Sort != model.CommentSortOldest {
		filter.Sort = model.CommentSortNewest
	}
	filter.Limit = normalizeLimit(filter.Limit, 48)
	return filter
}

func normalizeVideoInteractionKind(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case model.VideoInteractionKindLike:
		return model.VideoInteractionKindLike, nil
	case model.VideoInteractionKindFavorite:
		return model.VideoInteractionKindFavorite, nil
	case model.VideoInteractionKindWatchLater:
		return model.VideoInteractionKindWatchLater, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeOptionalCommunityClientID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	return normalizeCommunityClientID(value)
}

func videoInteractionNotificationTitle(kind string) string {
	switch kind {
	case model.VideoInteractionKindLike:
		return "已点赞视频"
	case model.VideoInteractionKindFavorite:
		return "已加入收藏"
	case model.VideoInteractionKindWatchLater:
		return "已加入稍后看"
	default:
		return "互动已保存"
	}
}

func videoInteractionNotificationBody(kind string, title string) string {
	switch kind {
	case model.VideoInteractionKindLike:
		return "你点赞了《" + title + "》，创作者会在热度统计中看到这次互动。"
	case model.VideoInteractionKindFavorite:
		return "《" + title + "》已经保存到收藏列表。"
	case model.VideoInteractionKindWatchLater:
		return "《" + title + "》已经保存到稍后看列表。"
	default:
		return "你对《" + title + "》的互动已经保存。"
	}
}

func videoLink(video model.Video) string {
	if strings.TrimSpace(video.Slug) != "" {
		return "/video/" + video.Slug
	}
	return "/video/" + video.ID
}

func creatorLink(creator model.Creator) string {
	if strings.TrimSpace(creator.Handle) != "" {
		return "/u/" + creator.Handle
	}
	return "/"
}

func videoHistoryPayload(clientID string, items []model.VideoHistoryItem) model.VideoHistoryPayload {
	message := "观看历史会跟随当前会话同步；登录后可进入你的播放记录。"
	return model.VideoHistoryPayload{
		Authenticated: false,
		ClientID:      &clientID,
		HistoryCount:  len(items),
		Message:       &message,
		Items:         model.PageResult[model.VideoHistoryItem]{Items: items},
	}
}

func notificationPayload(clientID string, notifications []model.CommunityNotification) model.CommunityNotificationPayload {
	items := make([]model.CommunityNotificationItem, 0, len(notifications))
	unreadCount := 0
	for _, notification := range notifications {
		if notification.ReadAt == nil {
			unreadCount++
		}
		items = append(items, notificationItem(notification))
	}
	message := "通知来自你的社区互动；登录后可进入完整消息中心。"
	return model.CommunityNotificationPayload{
		Authenticated: false,
		ClientID:      &clientID,
		UnreadCount:   unreadCount,
		Message:       &message,
		Items:         model.PageResult[model.CommunityNotificationItem]{Items: items},
	}
}

func notificationItem(notification model.CommunityNotification) model.CommunityNotificationItem {
	return model.CommunityNotificationItem{
		ID:         notification.ID,
		Kind:       notification.Kind,
		Title:      notification.Title,
		Body:       notification.Body,
		TargetKind: notification.TargetKind,
		TargetID:   notification.TargetID,
		VideoID:    notification.VideoID,
		CreatorID:  notification.CreatorID,
		Link:       notification.Link,
		ReadAt:     notification.ReadAt,
		CreatedAt:  notification.CreatedAt,
	}
}

func normalizeCommentAuthor(value string) string {
	return trimRunes(value, 24)
}

func normalizeCommentBody(value string) string {
	return trimRunes(value, 500)
}

func normalizeDanmakuBody(value string) string {
	return trimRunes(value, 80)
}

func normalizeDanmakuMode(value string) string {
	switch strings.TrimSpace(value) {
	case model.DanmakuModeTop:
		return model.DanmakuModeTop
	case model.DanmakuModeBottom:
		return model.DanmakuModeBottom
	default:
		return model.DanmakuModeScroll
	}
}

func normalizeDanmakuColor(value string) string {
	value = strings.TrimSpace(value)
	if danmakuColorPattern.MatchString(value) {
		return value
	}
	return "#ffffff"
}

func normalizeDanmakuTime(value int, durationSeconds int) int {
	if value < 0 {
		return 0
	}
	maxSecond := durationSeconds - 1
	if maxSecond < 0 {
		maxSecond = 0
	}
	if value > maxSecond {
		return maxSecond
	}
	return value
}

func normalizeHistoryProgress(value int, durationSeconds int) int {
	if value < 0 {
		return 0
	}
	if durationSeconds < 0 {
		durationSeconds = 0
	}
	if value > durationSeconds {
		return durationSeconds
	}
	return value
}

func normalizeReportReason(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case model.CommunityReportReasonSpam:
		return model.CommunityReportReasonSpam, nil
	case model.CommunityReportReasonAbuse:
		return model.CommunityReportReasonAbuse, nil
	case model.CommunityReportReasonCopyright:
		return model.CommunityReportReasonCopyright, nil
	case model.CommunityReportReasonMisleading:
		return model.CommunityReportReasonMisleading, nil
	case model.CommunityReportReasonOther:
		return model.CommunityReportReasonOther, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeReportDetail(value string) string {
	return trimRunes(value, 500)
}

func normalizeSubmissionVisibility(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case "", model.CommunitySubmissionVisibilityPublic:
		return model.CommunitySubmissionVisibilityPublic, nil
	case model.CommunitySubmissionVisibilityUnlisted:
		return model.CommunitySubmissionVisibilityUnlisted, nil
	case model.CommunitySubmissionVisibilityPrivate:
		return model.CommunitySubmissionVisibilityPrivate, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeSubmissionTags(tags []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		value := trimRunes(strings.TrimPrefix(strings.TrimSpace(tag), "#"), 40)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
		if len(out) >= 8 {
			break
		}
	}
	return out
}

func encodeSubmissionTags(tags []string) (string, error) {
	if tags == nil {
		tags = []string{}
	}
	raw, err := json.Marshal(tags)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func decodeSubmissionTags(value string) []string {
	var tags []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(value)), &tags); err != nil {
		return []string{}
	}
	return normalizeSubmissionTags(tags)
}

func normalizeCommunityClientID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > 96 {
		return "", ErrInvalidInput
	}
	return value, nil
}

func communityAccountClientID(principal authtypes.Principal) (string, error) {
	if principal.UserID <= 0 {
		return "", ErrInvalidInput
	}
	return normalizeCommunityClientID("account:" + strconv.FormatInt(principal.UserID, 10))
}

func communityAccountAuthorName(principal authtypes.Principal) string {
	if name := normalizeCommentAuthor(principal.Username); name != "" {
		return name
	}
	if emailName, _, ok := strings.Cut(strings.TrimSpace(principal.Email), "@"); ok {
		if name := normalizeCommentAuthor(emailName); name != "" {
			return name
		}
	}
	return normalizeCommentAuthor("user-" + strconv.FormatInt(principal.UserID, 10))
}

func normalizeLimit(value int, fallback int) int {
	if value < 1 {
		return fallback
	}
	if value > 100 {
		return 100
	}
	return value
}

func trimRunes(value string, limit int) string {
	value = strings.TrimSpace(value)
	if limit > 0 && len([]rune(value)) > limit {
		value = string([]rune(value)[:limit])
	}
	return value
}

func matchesCategory(category model.Category, needle string) bool {
	return strings.Contains(normalize(category.Name+" "+category.Slug+" "+deref(category.Description)), needle)
}

func matchesCreator(creator model.Creator, needle string) bool {
	return strings.Contains(normalize(creator.DisplayName+" "+creator.Handle+" "+deref(creator.Bio)), needle)
}

func normalize(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func mapStorageError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrNotFound) {
		return ErrNotFound
	}
	if errors.Is(err, ErrStorageUnavailable) {
		return ErrStorageUnavailable
	}
	return err
}

func reportReceipt(report model.CommunityReport) model.CommunityReportReceipt {
	return model.CommunityReportReceipt{
		ID:         report.ID,
		TargetKind: report.TargetKind,
		TargetID:   report.TargetID,
		VideoID:    report.VideoID,
		ClientID:   report.ClientID,
		Reason:     report.Reason,
		Status:     report.Status,
		CreatedAt:  report.CreatedAt,
	}
}

func communityAnnouncement(now func() time.Time) *model.Announcement {
	return &model.Announcement{
		ID:       "community-live-data",
		Title:    "今日更新",
		Body:     "首页阅读节奏变得更轻了，分类、动态和最新投稿会一起陪你发现新的创作者内容。",
		Href:     nil,
		Severity: "info",
		StartsAt: now().UTC(),
		EndsAt:   nil,
	}
}

func (s *service) now() time.Time {
	return s.cfg.Now().UTC()
}

func (s *service) newCommentID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "comment-") {
		return raw
	}
	return "comment-" + raw
}

func (s *service) newDanmakuID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "danmaku-") {
		return raw
	}
	return "danmaku-" + raw
}

func (s *service) newReportID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "report-") {
		return raw
	}
	return "report-" + raw
}

func (s *service) newNotificationID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "notification-") {
		return raw
	}
	return "notification-" + raw
}

func (s *service) newDynamicID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "dynamic-") {
		return raw
	}
	return "dynamic-" + raw
}

func (s *service) newSubmissionID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "submission-") {
		return raw
	}
	return "submission-" + raw
}
