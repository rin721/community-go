package service

import (
	"context"
	"errors"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
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
	FollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	UnfollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	SetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	UnsetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
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
	FollowCreator(context.Context, model.CreatorFollow) error
	SetVideoInteraction(context.Context, model.VideoInteraction) error
	ListCategories(context.Context) ([]model.Category, error)
	ListCategorySlugs(context.Context, string) ([]string, error)
	ListCreatorFollows(context.Context, string, int) ([]model.CreatorFollow, error)
	ListVideoInteractions(context.Context, model.VideoInteractionFilter) ([]model.VideoInteraction, error)
	ListVideoComments(context.Context, string, model.VideoCommentFilter) ([]model.VideoComment, error)
	ListCreators(context.Context, int) ([]model.Creator, error)
	ListDanmaku(context.Context, string) ([]model.VideoDanmakuItem, error)
	ListSources(context.Context, string) ([]model.VideoSourceOption, error)
	ListTags(context.Context, string) ([]string, error)
	ListVideos(context.Context, model.VideoFilter) ([]model.Video, error)
	ListVideosByIDs(context.Context, []string) ([]model.Video, error)
	UnfollowCreator(context.Context, string, string, time.Time) error
	UnsetVideoInteraction(context.Context, string, string, string, time.Time) error
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
			"/home",
			"/categories",
			"/videos",
			"/videos/:idOrSlug",
			"/videos/:idOrSlug/interaction-state",
			"/videos/:idOrSlug/interactions/:kind",
			"/videos/:idOrSlug/comments",
			"/videos/:idOrSlug/danmaku",
			"/videos/:idOrSlug/reports",
			"/search",
			"/users/:handle",
			"/users/:handle/follow-state",
			"/users/:handle/follow",
			"/feed/following",
			"/library",
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
	return model.HomePayload{
		Announcement: communityAnnouncement(s.now),
		Categories:   categories,
		Latest:       latest,
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
	return s.recommendedFollowingFeed(ctx, nil, "当前公开接口未绑定登录态；这里展示后端社区模块返回的推荐关注预览。")
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
	message := "收藏和稍后看来自后端社区模块的匿名 clientId；接入登录后可迁移为用户资料库。"
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
	message := messageText
	return model.FollowingFeedPayload{
		Authenticated:  false,
		ClientID:       clientID,
		Creators:       profiles,
		FollowingCount: 0,
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
	message := "关注关系来自后端社区模块的匿名 clientId，接入登录后可迁移到用户关系。"
	return model.FollowingFeedPayload{
		Authenticated:  false,
		ClientID:       &clientID,
		Creators:       profiles,
		FollowingCount: len(profiles),
		Latest:         model.PageResult[model.VideoSummary]{Items: filtered},
		Message:        &message,
	}, nil
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
	nodes := make(map[string]*model.CategoryTreeNode, len(categories))
	order := make([]string, 0, len(categories))
	for _, category := range categories {
		item := model.CategoryTreeNode{Category: category, Children: []model.CategoryTreeNode{}}
		nodes[category.Slug] = &item
		order = append(order, category.Slug)
	}
	for _, slug := range order {
		node := nodes[slug]
		if node.Category.ParentSlug != nil {
			if parent, ok := nodes[*node.Category.ParentSlug]; ok {
				parent.Children = append(parent.Children, *node)
			}
		}
	}
	roots := make([]model.CategoryTreeNode, 0)
	for _, slug := range order {
		node := nodes[slug]
		if node.Category.ParentSlug != nil {
			if _, ok := nodes[*node.Category.ParentSlug]; ok {
				continue
			}
		}
		roots = append(roots, *node)
	}
	sortCategoryTree(roots)
	return roots
}

func sortCategoryTree(nodes []model.CategoryTreeNode) {
	sort.SliceStable(nodes, func(i, j int) bool {
		if nodes[i].Order == nodes[j].Order {
			return nodes[i].Slug < nodes[j].Slug
		}
		return nodes[i].Order < nodes[j].Order
	})
	for index := range nodes {
		sortCategoryTree(nodes[index].Children)
	}
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

func normalizeCommentAuthor(value string) string {
	value = strings.TrimSpace(value)
	if len([]rune(value)) > 24 {
		value = string([]rune(value)[:24])
	}
	return value
}

func normalizeCommentBody(value string) string {
	value = strings.TrimSpace(value)
	if len([]rune(value)) > 500 {
		value = string([]rune(value)[:500])
	}
	return value
}

func normalizeDanmakuBody(value string) string {
	value = strings.TrimSpace(value)
	if len([]rune(value)) > 80 {
		value = string([]rune(value)[:80])
	}
	return value
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
	value = strings.TrimSpace(value)
	if len([]rune(value)) > 500 {
		value = string([]rune(value)[:500])
	}
	return value
}

func normalizeCommunityClientID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > 96 {
		return "", ErrInvalidInput
	}
	return value, nil
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
		Title:    "社区数据已接入 Go 后端",
		Body:     "首页、搜索、视频详情、弹幕和创作者资料正在由社区模块公开接口返回。",
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
