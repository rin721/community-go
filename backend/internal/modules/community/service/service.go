package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
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
	ErrDataInconsistent   = errors.New("community data inconsistent")
	ErrNotFound           = errors.New("community resource not found")
	ErrStorageUnavailable = errors.New("community storage unavailable")
	ErrUnauthorized       = errors.New("community unauthorized")
	ErrDuplicate          = errors.New("community duplicate")
	ErrForbidden          = errors.New("community forbidden")
	ErrCooldownActive     = errors.New("avatar update cooldown active")
)

var danmakuColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
var communityHandlePattern = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_-]{2,63}$`)

// Service 定义视频社区公开只读能力。
type Service interface {
	AuthenticateToken(context.Context, string) (authtypes.Principal, error)
	SignupCommunityAccount(context.Context, model.CommunitySignupRequest, SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error)
	LoginCommunityAccount(context.Context, model.CommunityLoginRequest, SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error)
	CommunityAuthSession(context.Context, authtypes.Principal) (model.CommunityAuthSessionSnapshot, error)
	RefreshCommunitySession(context.Context, string, SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error)
	LogoutCommunityAccount(context.Context, authtypes.Principal) error
	ListAccountSessions(context.Context, authtypes.Principal) (model.AccountSessionPayload, error)
	RevokeAccountSession(context.Context, authtypes.Principal, int64) error
	UploadAccountAvatar(context.Context, authtypes.Principal, UploadSourceInput) (model.AccountAvatarResult, error)
	DeleteAccountAvatar(context.Context, authtypes.Principal) (model.AccountAvatarResult, error)
	UploadAccountBanner(context.Context, authtypes.Principal, UploadSourceInput) (model.AccountBannerResult, error)
	DeleteAccountBanner(context.Context, authtypes.Principal) (model.AccountBannerResult, error)
	ListCommunityAccounts(context.Context, model.CommunityAccountFilter) (model.CommunityAccountPayload, error)
	UpdateCommunityAccount(context.Context, string, model.UpdateCommunityAccountRequest) (model.CommunityAccountItem, error)
	ListCommunityReports(context.Context, model.CommunityReportFilter) (model.CommunityReportPayload, error)
	ReviewCommunityReport(context.Context, authtypes.Principal, string, model.ReviewCommunityReportRequest) (model.CommunityReportItem, error)
	CommunityStatus(context.Context) model.APIStatus
	GetCreatorProfile(context.Context, string) (model.CreatorProfile, error)
	GetHomePayload(context.Context) (model.HomePayload, error)
	GetVideoDanmaku(context.Context, string) (model.VideoDanmakuPayload, error)
	GetVideoComments(context.Context, string, model.VideoCommentFilter) (model.VideoCommentPayload, error)
	GetVideoDetail(context.Context, string) (model.VideoDetail, error)
	GetVideoInteractionState(context.Context, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	GetAccountVideoInteractionState(context.Context, authtypes.Principal, string) (model.VideoInteractionState, error)
	GetCreatorFollowState(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	ListCategories(context.Context) ([]model.CategoryTreeNode, error)
	ListVideos(context.Context, model.VideoFilter) (model.PageResult[model.VideoSummary], error)
	Search(context.Context, string, int) (model.SearchPayload, error)
	FollowingFeed(context.Context, model.CreatorFollowRequest) (model.FollowingFeedPayload, error)
	AccountFollowingFeed(context.Context, authtypes.Principal) (model.FollowingFeedPayload, error)
	VideoLibrary(context.Context, model.VideoInteractionRequest) (model.VideoLibraryPayload, error)
	AccountVideoLibrary(context.Context, authtypes.Principal) (model.VideoLibraryPayload, error)
	VideoHistory(context.Context, model.VideoHistoryFilter) (model.VideoHistoryPayload, error)
	AccountVideoHistory(context.Context, authtypes.Principal, int) (model.VideoHistoryPayload, error)
	CommunityNotifications(context.Context, model.CommunityNotificationFilter) (model.CommunityNotificationPayload, error)
	MarkCommunityNotificationsRead(context.Context, model.CommunityNotificationRequest) (model.CommunityNotificationPayload, error)
	CommunityAccountNotifications(context.Context, authtypes.Principal, int) (model.CommunityNotificationPayload, error)
	MarkCommunityAccountNotificationsRead(context.Context, authtypes.Principal) (model.CommunityNotificationPayload, error)
	ListCommunityDynamics(context.Context, model.CommunityDynamicFilter) (model.CommunityDynamicPayload, error)
	CreateCommunityDynamic(context.Context, model.CreateCommunityDynamicRequest) (model.CommunityDynamicItem, error)
	CreateCommunityAccountDynamic(context.Context, authtypes.Principal, model.CreateCommunityAccountDynamicRequest) (model.CommunityDynamicItem, error)
	UpdateCommunityDynamic(context.Context, string, model.UpdateCommunityDynamicRequest) (model.CommunityDynamicItem, error)
	UpdateCommunityAccountDynamic(context.Context, authtypes.Principal, string, model.UpdateCommunityDynamicRequest) (model.CommunityDynamicItem, error)
	DeleteCommunityDynamic(context.Context, string, string) (model.DeleteCommunityDynamicResult, error)
	DeleteCommunityAccountDynamic(context.Context, authtypes.Principal, string) (model.DeleteCommunityDynamicResult, error)
	ListCommunitySubmissions(context.Context, model.CommunitySubmissionFilter) (model.CommunitySubmissionPayload, error)
	CreateCommunitySubmission(context.Context, model.CreateCommunitySubmissionRequest) (model.CommunitySubmissionItem, error)
	ListCommunityReviewSubmissions(context.Context, model.CommunitySubmissionFilter) (model.CommunitySubmissionPayload, error)
	ReviewCommunitySubmission(context.Context, authtypes.Principal, string, model.ReviewCommunitySubmissionRequest) (model.CommunitySubmissionItem, error)
	ListCommunityAccountSubmissions(context.Context, authtypes.Principal, int) (model.CommunitySubmissionPayload, error)
	CreateCommunityAccountSubmission(context.Context, authtypes.Principal, model.CreateCommunityAccountSubmissionRequest) (model.CommunitySubmissionItem, error)
	UploadCommunityAccountSubmissionSource(context.Context, authtypes.Principal, UploadSourceInput) (model.CommunitySubmissionUploadResult, error)
	CreateCommunitySubmissionTranscodeJob(context.Context, authtypes.Principal, string, model.CreateCommunityVideoJobRequest) (model.CommunityVideoJobItem, error)
	ListCommunityVideoJobs(context.Context, model.CommunityVideoJobFilter) (model.CommunityVideoJobPayload, error)
	GetCommunityVideoJob(context.Context, string) (model.CommunityVideoJobItem, error)
	RetryCommunityVideoJob(context.Context, authtypes.Principal, string) (model.CommunityVideoJobItem, error)
	ClaimCommunityVideoJobs(context.Context, VideoJobClaimInput) ([]string, error)
	ProcessCommunityVideoJob(context.Context, VideoJobProcessInput) error
	HandleCommunityVideoJobCallback(context.Context, string, VideoJobCallbackInput) (model.CommunityVideoJobItem, error)
	GetCommunityVideoAsset(context.Context, string) (VideoAsset, error)
	GetCommunitySourceAsset(context.Context, string) (VideoAsset, error)
	FollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	FollowAccountCreator(context.Context, authtypes.Principal, string) (model.CreatorFollowState, error)
	UnfollowCreator(context.Context, string, model.CreatorFollowRequest) (model.CreatorFollowState, error)
	UnfollowAccountCreator(context.Context, authtypes.Principal, string) (model.CreatorFollowState, error)
	GetAccountCreatorFollowState(context.Context, authtypes.Principal, string) (model.CreatorFollowState, error)
	SetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	SetAccountVideoInteraction(context.Context, authtypes.Principal, string, string) (model.VideoInteractionState, error)
	UnsetVideoInteraction(context.Context, string, string, model.VideoInteractionRequest) (model.VideoInteractionState, error)
	UnsetAccountVideoInteraction(context.Context, authtypes.Principal, string, string) (model.VideoInteractionState, error)
	RecordVideoHistory(context.Context, string, model.VideoHistoryRequest) (model.VideoHistoryItem, error)
	RecordAccountVideoHistory(context.Context, authtypes.Principal, string, model.RecordAccountVideoHistoryRequest) (model.VideoHistoryItem, error)
	ClearVideoHistory(context.Context, model.VideoHistoryClearRequest) (model.VideoHistoryPayload, error)
	ClearAccountVideoHistory(context.Context, authtypes.Principal) (model.VideoHistoryPayload, error)
	CreateVideoComment(context.Context, string, model.CreateVideoCommentRequest) (model.VideoComment, error)
	UpdateVideoComment(context.Context, string, string, model.UpdateVideoCommentRequest) (model.VideoComment, error)
	UpdateAccountVideoComment(context.Context, authtypes.Principal, string, string, model.UpdateVideoCommentRequest) (model.VideoComment, error)
	DeleteVideoComment(context.Context, string, string, string) (model.DeleteVideoCommentResult, error)
	DeleteAccountVideoComment(context.Context, authtypes.Principal, string, string) (model.DeleteVideoCommentResult, error)
	CreateVideoDanmaku(context.Context, string, model.CreateVideoDanmakuRequest) (model.VideoDanmakuItem, error)
	CreateVideoReport(context.Context, string, model.CreateVideoReportRequest) (model.CommunityReportReceipt, error)
	// Account profile management — authenticated-only.
	GetCommunityAccountProfile(context.Context, authtypes.Principal) (model.AccountProfileResponse, error)
	UpdateCommunityAccountProfile(context.Context, authtypes.Principal, model.UpdateAccountProfileRequest) (model.AccountProfileResponse, error)
	UpdateCommunityAccountCreatorProfile(context.Context, authtypes.Principal, model.UpdateAccountCreatorProfileRequest) (model.AccountProfileResponse, error)
	ChangeAccountPassword(context.Context, authtypes.Principal, model.ChangeAccountPasswordRequest) error
	GetCommunityAccountSubmission(context.Context, authtypes.Principal, string) (model.CommunitySubmissionItem, error)
	DeleteCommunityAccountSubmission(context.Context, authtypes.Principal, string) (model.DeleteCommunitySubmissionResult, error)
}


// Repository 是社区服务需要的最小持久化端口。
type Repository interface {
	CreateCommunityAccount(context.Context, model.CommunityAccount) error
	FindCommunityAccountByID(context.Context, int64) (*model.CommunityAccount, error)
	FindCommunityAccountByHandleOrEmail(context.Context, string) (*model.CommunityAccount, error)
	FindCommunityAccountByHandle(context.Context, string) (*model.CommunityAccount, error)
	FindCommunityAccountByEmail(context.Context, string) (*model.CommunityAccount, error)
	UpdateCommunityAccount(context.Context, model.CommunityAccount) error
	CreateCommunitySession(context.Context, model.CommunitySession) error
	FindCommunitySessionByAccessTokenHash(context.Context, string, time.Time) (*model.CommunitySession, error)
	FindCommunitySessionByRefreshTokenHash(context.Context, string, time.Time) (*model.CommunitySession, error)
	FindCommunitySessionByID(context.Context, int64) (*model.CommunitySession, error)
	RevokeCommunitySession(context.Context, int64, time.Time) error
	ListCommunitySessionsByAccountID(context.Context, int64, int) ([]model.CommunitySession, error)
	ListCommunityAccounts(context.Context, model.CommunityAccountFilter) ([]model.CommunityAccount, error)
	ListCommunityReports(context.Context, model.CommunityReportFilter) ([]model.CommunityReport, error)
	FindCommunityReport(context.Context, string) (*model.CommunityReport, error)
	UpdateCommunityReportReview(context.Context, model.CommunityReport) error
	FindCreatorByHandle(context.Context, string) (*model.Creator, error)
	CreateCreator(context.Context, model.Creator) error
	UpdateCreator(context.Context, model.Creator) error
	FindCreatorFollow(context.Context, string, string) (*model.CreatorFollow, error)
	FindVideoComment(context.Context, string, string) (*model.VideoComment, error)
	FindVideoByIDOrSlug(context.Context, string) (*model.Video, error)
	FindVideoInteraction(context.Context, string, string, string) (*model.VideoInteraction, error)
	CountVideoComments(context.Context, string) (int, error)
	CreateVideoComment(context.Context, model.VideoComment) error
	UpdateVideoComment(context.Context, model.VideoComment) error
	DeleteVideoComment(context.Context, string, string, string, time.Time) error
	CreateVideoDanmaku(context.Context, model.VideoDanmakuItem) error
	CreateCommunityReport(context.Context, model.CommunityReport) error
	CreateCommunityNotification(context.Context, model.CommunityNotification) error
	CreateCommunityDynamic(context.Context, model.CommunityDynamic) error
	FindCommunityDynamic(context.Context, string) (*model.CommunityDynamic, error)
	UpdateCommunityDynamic(context.Context, model.CommunityDynamic) error
	DeleteCommunityDynamic(context.Context, string, string, time.Time) error
	DeleteCommunitySubmission(context.Context, string, string, time.Time) error
	CreateCommunitySubmission(context.Context, model.CommunitySubmission) error
	FindCommunitySubmission(context.Context, string) (*model.CommunitySubmission, error)
	FindMediaAssetByID(context.Context, int64) (*model.CommunityMediaAsset, error)
	CreateMediaAsset(context.Context, model.CommunityMediaAsset) error
	CreateVideoFromSubmission(context.Context, model.Creator, model.Video, model.VideoSourceOption, []string, []string) error
	CreateVideoFromSubmissionSources(context.Context, model.Creator, model.Video, []model.VideoSourceOption, []string, []string) error
	UpdateCommunitySubmissionReview(context.Context, model.CommunitySubmission) error
	CreateCommunityVideoJob(context.Context, model.CommunityVideoJob) error
	UpdateCommunityVideoJob(context.Context, model.CommunityVideoJob) error
	ClaimCommunityVideoJobs(context.Context, string, time.Time, time.Duration, int) ([]model.CommunityVideoJob, error)
	FindCommunityVideoJob(context.Context, string) (*model.CommunityVideoJob, error)
	ListCommunityVideoJobs(context.Context, model.CommunityVideoJobFilter) ([]model.CommunityVideoJob, error)
	ListLatestCommunityVideoJobsBySubmissionIDs(context.Context, []string) ([]model.CommunityVideoJob, error)
	CreateCommunityVideoRenditions(context.Context, []model.CommunityVideoRendition) error
	ListCommunityVideoRenditions(context.Context, string) ([]model.CommunityVideoRendition, error)
	FollowCreator(context.Context, model.CreatorFollow) error
	SetVideoInteraction(context.Context, model.VideoInteraction) error
	SetVideoHistory(context.Context, model.VideoHistory) error
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

type HomeAnnouncementProvider interface {
	HomeAnnouncement(context.Context) (*model.Announcement, error)
}

const VideoCategoryDictionaryCode = "community.video.category"

type CategoryProvider interface {
	CommunityCategories(context.Context) ([]model.Category, error)
}

type Config struct {
	BasePath                 string
	CategoryProvider         CategoryProvider
	HomeAnnouncementProvider HomeAnnouncementProvider
	NewID                    func() string
	NewIntID                 func() int64
	Storage                  MediaStorage
	Video                    VideoConfig
	VideoService             VideoService
	Passwords                PasswordCrypto
	AccessTokenTTL           time.Duration
	RefreshTokenTTL          time.Duration
	DefaultProductCode       string
	DefaultClientType        string
	Now                      func() time.Time
}

type service struct {
	cfg   Config
	repo  Repository
	video VideoService
}

type PasswordCrypto interface {
	HashPassword(password string) (string, error)
	VerifyPassword(hashedPassword, password string) error
}

type SessionIssueInput struct {
	UserAgent   string
	IPAddress   string
	ProductCode string
	ClientType  string
}

type SessionTokens struct {
	AccessToken      string
	RefreshToken     string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
}

func New(repo Repository, cfg Config) Service {
	if cfg.Now == nil {
		cfg.Now = func() time.Time { return time.Now().UTC() }
	}
	if cfg.NewID == nil {
		cfg.NewID = func() string { return strconv.FormatInt(time.Now().UTC().UnixNano(), 10) }
	}
	if cfg.NewIntID == nil {
		cfg.NewIntID = func() int64 { return time.Now().UTC().UnixNano() }
	}
	if cfg.AccessTokenTTL <= 0 {
		cfg.AccessTokenTTL = 15 * time.Minute
	}
	if cfg.RefreshTokenTTL <= 0 {
		cfg.RefreshTokenTTL = 7 * 24 * time.Hour
	}
	if strings.TrimSpace(cfg.DefaultClientType) == "" {
		cfg.DefaultClientType = "pc_web"
	}
	if strings.TrimSpace(cfg.BasePath) == "" {
		cfg.BasePath = "/api/v1/public/community"
	}
	svc := &service{cfg: cfg, repo: repo}
	if cfg.VideoService != nil {
		svc.video = cfg.VideoService
	} else {
		svc.video = newConfiguredVideoService(svc, cfg.Video)
	}
	return svc
}

func (s *service) SignupCommunityAccount(ctx context.Context, req model.CommunitySignupRequest, input SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error) {
	if s.repo == nil || s.cfg.Passwords == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrStorageUnavailable
	}
	handle, email, displayName, password, err := normalizeCommunitySignup(req)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, err
	}
	if _, err := s.repo.FindCommunityAccountByHandle(ctx, handle); err == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrDuplicate
	} else if !errors.Is(err, ErrNotFound) {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	if _, err := s.repo.FindCommunityAccountByEmail(ctx, email); err == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrDuplicate
	} else if !errors.Is(err, ErrNotFound) {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	hash, err := s.cfg.Passwords.HashPassword(password)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrInvalidInput
	}
	now := s.now()
	account := model.CommunityAccount{
		ID:           s.cfg.NewIntID(),
		Handle:       handle,
		Email:        email,
		PasswordHash: hash,
		DisplayName:  displayName,
		Role:         model.CommunityAccountRoleRegistered,
		Status:       model.CommunityAccountStatusActive,
		LastLoginAt:  &now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.repo.CreateCommunityAccount(ctx, account); err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	snapshot, tokens, err := s.issueCommunitySession(ctx, &account, input)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, err
	}
	return snapshot, tokens, nil
}

func (s *service) LoginCommunityAccount(ctx context.Context, req model.CommunityLoginRequest, input SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error) {
	if s.repo == nil || s.cfg.Passwords == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrStorageUnavailable
	}
	identifier := strings.ToLower(strings.TrimSpace(firstNonEmpty(req.Identifier, req.Email)))
	if identifier == "" || strings.TrimSpace(req.Password) == "" {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrInvalidInput
	}
	account, err := s.repo.FindCommunityAccountByHandleOrEmail(ctx, identifier)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrUnauthorized
		}
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	if account.Status != model.CommunityAccountStatusActive {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrForbidden
	}
	if err := s.cfg.Passwords.VerifyPassword(account.PasswordHash, strings.TrimSpace(req.Password)); err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrUnauthorized
	}
	now := s.now()
	account.LastLoginAt = &now
	account.UpdatedAt = now
	if err := s.repo.UpdateCommunityAccount(ctx, *account); err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	return s.issueCommunitySession(ctx, account, input)
}

func (s *service) AuthenticateToken(ctx context.Context, token string) (authtypes.Principal, error) {
	if s.repo == nil {
		return authtypes.Principal{}, ErrStorageUnavailable
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return authtypes.Principal{}, ErrUnauthorized
	}
	session, err := s.repo.FindCommunitySessionByAccessTokenHash(ctx, hashToken(token), s.now())
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return authtypes.Principal{}, ErrUnauthorized
		}
		return authtypes.Principal{}, mapStorageError(err)
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, session.AccountID)
	if err != nil {
		return authtypes.Principal{}, mapStorageError(err)
	}
	if account.Status != model.CommunityAccountStatusActive {
		return authtypes.Principal{}, ErrForbidden
	}
	return s.communityPrincipal(account, session), nil
}

func (s *service) CommunityAuthSession(ctx context.Context, principal authtypes.Principal) (model.CommunityAuthSessionSnapshot, error) {
	if s.repo == nil {
		return model.CommunityAuthSessionSnapshot{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, mapStorageError(err)
	}
	session, err := s.repo.FindCommunitySessionByID(ctx, principal.SessionID)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, mapStorageError(err)
	}
	snapshot := communityAuthSnapshot(*account, *session)
	return snapshot, nil
}

func (s *service) LogoutCommunityAccount(ctx context.Context, principal authtypes.Principal) error {
	if s.repo == nil {
		return ErrStorageUnavailable
	}
	if principal.SessionID <= 0 {
		return ErrUnauthorized
	}
	return mapStorageError(s.repo.RevokeCommunitySession(ctx, principal.SessionID, s.now()))
}

func (s *service) RefreshCommunitySession(ctx context.Context, refreshToken string, input SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error) {
	if s.repo == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrStorageUnavailable
	}
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrUnauthorized
	}
	now := s.now()
	oldSession, err := s.repo.FindCommunitySessionByRefreshTokenHash(ctx, hashToken(refreshToken), now)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrUnauthorized
		}
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, oldSession.AccountID)
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	if account.Status != model.CommunityAccountStatusActive {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrForbidden
	}
	// Revoke old session before issuing new one.
	if rErr := s.repo.RevokeCommunitySession(ctx, oldSession.ID, now); rErr != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(rErr)
	}
	// Carry over IP/UserAgent from old session when not provided in new input.
	if input.IPAddress == "" {
		input.IPAddress = oldSession.IPAddress
	}
	if input.UserAgent == "" {
		input.UserAgent = oldSession.UserAgent
	}
	if input.ProductCode == "" {
		input.ProductCode = oldSession.ProductCode
	}
	if input.ClientType == "" {
		input.ClientType = oldSession.ClientType
	}
	return s.issueCommunitySession(ctx, account, input)
}

func (s *service) ListAccountSessions(ctx context.Context, principal authtypes.Principal) (model.AccountSessionPayload, error) {
	if s.repo == nil {
		return model.AccountSessionPayload{}, ErrStorageUnavailable
	}
	sessions, err := s.repo.ListCommunitySessionsByAccountID(ctx, principal.UserID, 20)
	if err != nil {
		return model.AccountSessionPayload{}, mapStorageError(err)
	}
	items := make([]model.AccountSessionItem, 0, len(sessions))
	for _, s := range sessions {
		items = append(items, model.AccountSessionItem{
			ID:               strconv.FormatInt(s.ID, 10),
			ProductCode:      s.ProductCode,
			ClientType:       s.ClientType,
			IPAddress:        s.IPAddress,
			UserAgent:        s.UserAgent,
			AccessExpiresAt:  s.AccessExpiresAt,
			RefreshExpiresAt: s.RefreshExpiresAt,
			CreatedAt:        s.CreatedAt,
		})
	}
	return model.AccountSessionPayload{Items: items}, nil
}

func (s *service) RevokeAccountSession(ctx context.Context, principal authtypes.Principal, sessionID int64) error {
	if s.repo == nil {
		return ErrStorageUnavailable
	}
	session, err := s.repo.FindCommunitySessionByID(ctx, sessionID)
	if err != nil {
		return mapStorageError(err)
	}
	// Security verification: session belongs to requesting account
	if session.AccountID != principal.UserID {
		return ErrForbidden
	}
	return mapStorageError(s.repo.RevokeCommunitySession(ctx, sessionID, s.now()))
}

func (s *service) UploadAccountAvatar(ctx context.Context, principal authtypes.Principal, input UploadSourceInput) (model.AccountAvatarResult, error) {
	if s.video == nil || s.repo == nil {
		return model.AccountAvatarResult{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountAvatarResult{}, mapStorageError(err)
	}
	creator, err := s.getOrCreateCreator(ctx, account)
	if err != nil {
		return model.AccountAvatarResult{}, err
	}
	now := s.now()
	// Rate limit avatar change cooldown (30 seconds) to prevent spamming upload resources
	if creator.UserSummary.AvatarURL != nil && creator.UpdatedAt.Add(30 * time.Second).After(now) {
		return model.AccountAvatarResult{}, ErrCooldownActive
	}

	// Reuse submission upload infra to store the avatar file.
	uploadResult, err := s.video.UploadSource(ctx, principal, input)
	if err != nil {
		return model.AccountAvatarResult{}, err
	}
	avatarURL := uploadResult.URL

	creator.UserSummary.AvatarURL = &avatarURL
	creator.UpdatedAt = now
	if uErr := s.repo.UpdateCreator(ctx, *creator); uErr != nil {
		return model.AccountAvatarResult{}, mapStorageError(uErr)
	}
	profile, err := s.GetCommunityAccountProfile(ctx, principal)
	if err != nil {
		return model.AccountAvatarResult{}, err
	}
	return model.AccountAvatarResult{
		AvatarURL: avatarURL,
		Profile:   profile,
	}, nil
}

func (s *service) DeleteAccountAvatar(ctx context.Context, principal authtypes.Principal) (model.AccountAvatarResult, error) {
	if s.repo == nil {
		return model.AccountAvatarResult{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountAvatarResult{}, mapStorageError(err)
	}
	creator, err := s.getOrCreateCreator(ctx, account)
	if err != nil {
		return model.AccountAvatarResult{}, err
	}
	now := s.now()
	creator.UserSummary.AvatarURL = nil
	creator.UpdatedAt = now
	if uErr := s.repo.UpdateCreator(ctx, *creator); uErr != nil {
		return model.AccountAvatarResult{}, mapStorageError(uErr)
	}
	profile, err := s.GetCommunityAccountProfile(ctx, principal)
	if err != nil {
		return model.AccountAvatarResult{}, err
	}
	return model.AccountAvatarResult{
		AvatarURL: "",
		Profile:   profile,
	}, nil
}


func (s *service) ListCommunityAccounts(ctx context.Context, filter model.CommunityAccountFilter) (model.CommunityAccountPayload, error) {
	if s.repo == nil {
		return model.CommunityAccountPayload{}, ErrStorageUnavailable
	}
	accounts, err := s.repo.ListCommunityAccounts(ctx, filter)
	if err != nil {
		return model.CommunityAccountPayload{}, mapStorageError(err)
	}
	items := make([]model.CommunityAccountItem, 0, len(accounts))
	for _, account := range accounts {
		items = append(items, communityAccountItem(account))
	}
	return model.CommunityAccountPayload{Items: model.PageResult[model.CommunityAccountItem]{Items: items}}, nil
}

func (s *service) UpdateCommunityAccount(ctx context.Context, accountID string, req model.UpdateCommunityAccountRequest) (model.CommunityAccountItem, error) {
	if s.repo == nil {
		return model.CommunityAccountItem{}, ErrStorageUnavailable
	}
	id, err := strconv.ParseInt(strings.TrimSpace(accountID), 10, 64)
	if err != nil || id <= 0 {
		return model.CommunityAccountItem{}, ErrInvalidInput
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, id)
	if err != nil {
		return model.CommunityAccountItem{}, mapStorageError(err)
	}
	if role := strings.TrimSpace(req.Role); role != "" {
		normalized, err := normalizeCommunityAccountRole(role)
		if err != nil {
			return model.CommunityAccountItem{}, err
		}
		account.Role = normalized
	}
	if status := strings.TrimSpace(req.Status); status != "" {
		normalized, err := normalizeCommunityAccountStatus(status)
		if err != nil {
			return model.CommunityAccountItem{}, err
		}
		account.Status = normalized
	}
	account.UpdatedAt = s.now()
	if err := s.repo.UpdateCommunityAccount(ctx, *account); err != nil {
		return model.CommunityAccountItem{}, mapStorageError(err)
	}
	return communityAccountItem(*account), nil
}

func (s *service) ListCommunityReports(ctx context.Context, filter model.CommunityReportFilter) (model.CommunityReportPayload, error) {
	if s.repo == nil {
		return model.CommunityReportPayload{}, ErrStorageUnavailable
	}
	if strings.TrimSpace(filter.Status) != "" {
		status, err := normalizeCommunityReportStatus(filter.Status)
		if err != nil {
			return model.CommunityReportPayload{}, err
		}
		filter.Status = status
	}
	reports, err := s.repo.ListCommunityReports(ctx, filter)
	if err != nil {
		return model.CommunityReportPayload{}, mapStorageError(err)
	}
	items := make([]model.CommunityReportItem, 0, len(reports))
	for _, report := range reports {
		items = append(items, communityReportItem(report))
	}
	return model.CommunityReportPayload{Items: model.PageResult[model.CommunityReportItem]{Items: items}}, nil
}

func (s *service) ReviewCommunityReport(ctx context.Context, principal authtypes.Principal, reportID string, req model.ReviewCommunityReportRequest) (model.CommunityReportItem, error) {
	if s.repo == nil {
		return model.CommunityReportItem{}, ErrStorageUnavailable
	}
	if principal.UserID <= 0 {
		return model.CommunityReportItem{}, ErrInvalidInput
	}
	nextStatus, err := normalizeCommunityReportReviewStatus(req.Status)
	if err != nil {
		return model.CommunityReportItem{}, err
	}
	report, err := s.repo.FindCommunityReport(ctx, reportID)
	if err != nil {
		return model.CommunityReportItem{}, mapStorageError(err)
	}
	now := s.now()
	report.Status = nextStatus
	report.ReviewNote = strings.TrimSpace(req.ReviewNote)
	report.ReviewerID = strconv.FormatInt(principal.UserID, 10)
	report.ReviewedAt = &now
	report.UpdatedAt = now
	if err := s.repo.UpdateCommunityReportReview(ctx, *report); err != nil {
		return model.CommunityReportItem{}, mapStorageError(err)
	}
	return communityReportItem(*report), nil
}

func (s *service) CommunityStatus(context.Context) model.APIStatus {
	return model.APIStatus{
		Mode:        "go",
		BasePath:    s.cfg.BasePath,
		GeneratedAt: s.now(),
		LatencyMs:   0,
		Endpoints:   []string{},
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
	announcement, err := s.homeAnnouncement(ctx)
	if err != nil {
		return model.HomePayload{}, err
	}
	return model.HomePayload{
		Announcement: announcement,
		Categories:   categories,
		Latest:       latest,
		Dynamics:     model.PageResult[model.CommunityDynamicItem]{Items: dynamics},
	}, nil
}

func (s *service) homeAnnouncement(ctx context.Context) (*model.Announcement, error) {
	if s.cfg.HomeAnnouncementProvider == nil {
		return nil, nil
	}
	return s.cfg.HomeAnnouncementProvider.HomeAnnouncement(ctx)
}

func (s *service) listCategories(ctx context.Context) ([]model.Category, error) {
	if s.cfg.CategoryProvider == nil {
		return nil, ErrStorageUnavailable
	}
	categories, err := s.cfg.CategoryProvider.CommunityCategories(ctx)
	if err != nil {
		return nil, mapStorageError(err)
	}
	sortCategories(categories)
	return categories, nil
}

func (s *service) ListCategories(ctx context.Context) ([]model.CategoryTreeNode, error) {
	categories, err := s.listCategories(ctx)
	if err != nil {
		return nil, err
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
	if clientID, err := normalizeOptionalCommunityClientID(filter.ClientID); err != nil {
		return model.VideoCommentPayload{}, err
	} else {
		filter.ClientID = clientID
	}
	items, err := s.repo.ListVideoComments(ctx, video.ID, filter)
	if err != nil {
		return model.VideoCommentPayload{}, mapStorageError(err)
	}
	sortVideoComments(items, filter.Sort)
	markOwnedVideoComments(items, filter.ClientID)
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
	clientID, err := normalizeOptionalCommunityClientID(req.ClientID)
	if err != nil {
		return model.VideoComment{}, err
	}
	now := s.now()
	comment := model.VideoComment{
		ID:         s.newCommentID(),
		VideoID:    video.ID,
		ClientID:   clientID,
		Body:       body,
		AuthorName: authorName,
		Status:     model.CommentStatusVisible,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateVideoComment(ctx, comment); err != nil {
		return model.VideoComment{}, mapStorageError(err)
	}
	comment.OwnedByCurrentClient = clientID != ""
	if clientID != "" {
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

func (s *service) UpdateVideoComment(ctx context.Context, idOrSlug string, commentID string, req model.UpdateVideoCommentRequest) (model.VideoComment, error) {
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.VideoComment{}, err
	}
	body := normalizeCommentBody(req.Body)
	if body == "" {
		return model.VideoComment{}, ErrInvalidInput
	}
	video, comment, err := s.videoCommentForClient(ctx, idOrSlug, commentID, clientID)
	if err != nil {
		return model.VideoComment{}, err
	}
	comment.VideoID = video.ID
	comment.Body = body
	comment.UpdatedAt = s.now()
	if err := s.repo.UpdateVideoComment(ctx, *comment); err != nil {
		return model.VideoComment{}, mapStorageError(err)
	}
	comment.OwnedByCurrentClient = true
	return *comment, nil
}

func (s *service) UpdateAccountVideoComment(ctx context.Context, principal authtypes.Principal, idOrSlug string, commentID string, req model.UpdateVideoCommentRequest) (model.VideoComment, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoComment{}, err
	}
	req.ClientID = clientID
	return s.UpdateVideoComment(ctx, idOrSlug, commentID, req)
}

func (s *service) DeleteVideoComment(ctx context.Context, idOrSlug string, commentID string, clientID string) (model.DeleteVideoCommentResult, error) {
	clientID, err := normalizeCommunityClientID(clientID)
	if err != nil {
		return model.DeleteVideoCommentResult{}, err
	}
	video, comment, err := s.videoCommentForClient(ctx, idOrSlug, commentID, clientID)
	if err != nil {
		return model.DeleteVideoCommentResult{}, err
	}
	if err := s.repo.DeleteVideoComment(ctx, video.ID, comment.ID, clientID, s.now()); err != nil {
		return model.DeleteVideoCommentResult{}, mapStorageError(err)
	}
	return model.DeleteVideoCommentResult{
		CommentID: comment.ID,
		VideoID:   video.ID,
		ClientID:  clientID,
		Deleted:   true,
	}, nil
}

func (s *service) DeleteAccountVideoComment(ctx context.Context, principal authtypes.Principal, idOrSlug string, commentID string) (model.DeleteVideoCommentResult, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.DeleteVideoCommentResult{}, err
	}
	return s.DeleteVideoComment(ctx, idOrSlug, commentID, clientID)
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

func (s *service) GetAccountVideoInteractionState(ctx context.Context, principal authtypes.Principal, idOrSlug string) (model.VideoInteractionState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	return s.GetVideoInteractionState(ctx, idOrSlug, model.VideoInteractionRequest{ClientID: clientID})
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

func (s *service) SetAccountVideoInteraction(ctx context.Context, principal authtypes.Principal, idOrSlug string, kind string) (model.VideoInteractionState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	return s.SetVideoInteraction(ctx, idOrSlug, kind, model.VideoInteractionRequest{ClientID: clientID})
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

func (s *service) UnsetAccountVideoInteraction(ctx context.Context, principal authtypes.Principal, idOrSlug string, kind string) (model.VideoInteractionState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoInteractionState{}, err
	}
	return s.UnsetVideoInteraction(ctx, idOrSlug, kind, model.VideoInteractionRequest{ClientID: clientID})
}

func (s *service) GetCreatorProfile(ctx context.Context, handle string) (model.CreatorProfile, error) {
	if s.repo == nil {
		return model.CreatorProfile{}, ErrStorageUnavailable
	}
	creator, err := s.repo.FindCreatorByHandle(ctx, strings.TrimSpace(handle))
	if err != nil {
		return model.CreatorProfile{}, mapStorageError(err)
	}
	latest, err := s.listVideoSummaries(ctx, model.VideoFilter{UploaderID: creator.ID, Limit: 100})
	if err != nil {
		return model.CreatorProfile{}, err
	}
	return model.CreatorProfile{
		UserSummary:   creator.UserSummary,
		Bio:           creator.Bio,
		BannerURL:     creator.BannerURL,
		Categories:    uniqueCategoriesFromVideos(latest),
		FollowerCount: creator.FollowerCount,
		JoinedAt:      creator.JoinedAt,
		Latest:        model.PageResult[model.VideoSummary]{Items: latest},
		VideoCount:    len(latest),
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

func (s *service) GetAccountCreatorFollowState(ctx context.Context, principal authtypes.Principal, handle string) (model.CreatorFollowState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	return s.GetCreatorFollowState(ctx, handle, model.CreatorFollowRequest{ClientID: clientID})
}

func (s *service) FollowAccountCreator(ctx context.Context, principal authtypes.Principal, handle string) (model.CreatorFollowState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	return s.FollowCreator(ctx, handle, model.CreatorFollowRequest{ClientID: clientID})
}

func (s *service) UnfollowAccountCreator(ctx context.Context, principal authtypes.Principal, handle string) (model.CreatorFollowState, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CreatorFollowState{}, err
	}
	return s.UnfollowCreator(ctx, handle, model.CreatorFollowRequest{ClientID: clientID})
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
	categories, err := s.listCategories(ctx)
	if err != nil {
		return model.SearchPayload{}, err
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

func (s *service) AccountFollowingFeed(ctx context.Context, principal authtypes.Principal) (model.FollowingFeedPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.FollowingFeedPayload{}, err
	}
	payload, err := s.FollowingFeed(ctx, model.CreatorFollowRequest{ClientID: clientID})
	if err != nil {
		return model.FollowingFeedPayload{}, err
	}
	payload.Authenticated = true
	message := "社区账号关注动态会跟随当前登录账号同步。"
	payload.Message = &message
	return payload, nil
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

func (s *service) AccountVideoLibrary(ctx context.Context, principal authtypes.Principal) (model.VideoLibraryPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoLibraryPayload{}, err
	}
	payload, err := s.VideoLibrary(ctx, model.VideoInteractionRequest{ClientID: clientID})
	if err != nil {
		return model.VideoLibraryPayload{}, err
	}
	payload.Authenticated = true
	message := "社区账号资料库会跟随当前登录账号同步。"
	payload.Message = &message
	return payload, nil
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

func (s *service) AccountVideoHistory(ctx context.Context, principal authtypes.Principal, limit int) (model.VideoHistoryPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	payload, err := s.VideoHistory(ctx, model.VideoHistoryFilter{ClientID: clientID, Limit: limit})
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	payload.Authenticated = true
	message := "社区账号观看历史会跟随当前登录账号同步。"
	payload.Message = &message
	return payload, nil
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

func (s *service) RecordAccountVideoHistory(ctx context.Context, principal authtypes.Principal, idOrSlug string, req model.RecordAccountVideoHistoryRequest) (model.VideoHistoryItem, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoHistoryItem{}, err
	}
	return s.RecordVideoHistory(ctx, idOrSlug, model.VideoHistoryRequest{
		ClientID:        clientID,
		ProgressSeconds: req.ProgressSeconds,
	})
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

func (s *service) ClearAccountVideoHistory(ctx context.Context, principal authtypes.Principal) (model.VideoHistoryPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	payload, err := s.ClearVideoHistory(ctx, model.VideoHistoryClearRequest{ClientID: clientID})
	if err != nil {
		return model.VideoHistoryPayload{}, err
	}
	payload.Authenticated = true
	message := "社区账号观看历史会跟随当前登录账号同步。"
	payload.Message = &message
	return payload, nil
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

func (s *service) CommunityAccountNotifications(ctx context.Context, principal authtypes.Principal, limit int) (model.CommunityNotificationPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	payload, err := s.CommunityNotifications(ctx, model.CommunityNotificationFilter{
		ClientID: clientID,
		Limit:    limit,
	})
	if err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	payload.Authenticated = true
	message := "社区账号通知会跟随当前登录账号同步。"
	payload.Message = &message
	return payload, nil
}

func (s *service) MarkCommunityAccountNotificationsRead(ctx context.Context, principal authtypes.Principal) (model.CommunityNotificationPayload, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	if _, err := s.MarkCommunityNotificationsRead(ctx, model.CommunityNotificationRequest{ClientID: clientID}); err != nil {
		return model.CommunityNotificationPayload{}, err
	}
	return s.CommunityAccountNotifications(ctx, principal, 48)
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
	items, err := s.decorateDynamics(ctx, []model.CommunityDynamic{dynamic}, clientID)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	if len(items) == 0 {
		return model.CommunityDynamicItem{}, ErrStorageUnavailable
	}
	return items[0], nil
}

func (s *service) CreateCommunityAccountDynamic(ctx context.Context, principal authtypes.Principal, req model.CreateCommunityAccountDynamicRequest) (model.CommunityDynamicItem, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	return s.CreateCommunityDynamic(ctx, model.CreateCommunityDynamicRequest{
		AuthorName: communityAccountAuthorName(principal),
		Body:       req.Body,
		ClientID:   clientID,
		VideoID:    req.VideoID,
	})
}

func (s *service) UpdateCommunityDynamic(ctx context.Context, dynamicID string, req model.UpdateCommunityDynamicRequest) (model.CommunityDynamicItem, error) {
	clientID, err := normalizeCommunityClientID(req.ClientID)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	body := normalizeCommentBody(req.Body)
	if body == "" {
		return model.CommunityDynamicItem{}, ErrInvalidInput
	}
	dynamic, err := s.communityDynamicForClient(ctx, dynamicID, clientID)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	dynamic.Body = body
	dynamic.UpdatedAt = s.now()
	if err := s.repo.UpdateCommunityDynamic(ctx, *dynamic); err != nil {
		return model.CommunityDynamicItem{}, mapStorageError(err)
	}
	items, err := s.decorateDynamics(ctx, []model.CommunityDynamic{*dynamic}, clientID)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	if len(items) == 0 {
		return model.CommunityDynamicItem{}, ErrStorageUnavailable
	}
	return items[0], nil
}

func (s *service) UpdateCommunityAccountDynamic(ctx context.Context, principal authtypes.Principal, dynamicID string, req model.UpdateCommunityDynamicRequest) (model.CommunityDynamicItem, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.CommunityDynamicItem{}, err
	}
	req.ClientID = clientID
	return s.UpdateCommunityDynamic(ctx, dynamicID, req)
}

func (s *service) DeleteCommunityDynamic(ctx context.Context, dynamicID string, clientID string) (model.DeleteCommunityDynamicResult, error) {
	clientID, err := normalizeCommunityClientID(clientID)
	if err != nil {
		return model.DeleteCommunityDynamicResult{}, err
	}
	dynamic, err := s.communityDynamicForClient(ctx, dynamicID, clientID)
	if err != nil {
		return model.DeleteCommunityDynamicResult{}, err
	}
	if err := s.repo.DeleteCommunityDynamic(ctx, dynamic.ID, clientID, s.now()); err != nil {
		return model.DeleteCommunityDynamicResult{}, mapStorageError(err)
	}
	return model.DeleteCommunityDynamicResult{
		DynamicID: dynamic.ID,
		ClientID:  clientID,
		Deleted:   true,
	}, nil
}

func (s *service) DeleteCommunityAccountDynamic(ctx context.Context, principal authtypes.Principal, dynamicID string) (model.DeleteCommunityDynamicResult, error) {
	clientID, err := communityAccountClientID(principal)
	if err != nil {
		return model.DeleteCommunityDynamicResult{}, err
	}
	return s.DeleteCommunityDynamic(ctx, dynamicID, clientID)
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
	mediaAssetID, err := normalizeSubmissionMediaAssetID(req.MediaAssetID)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	if mediaAssetID > 0 {
		asset, err := s.repo.FindMediaAssetByID(ctx, mediaAssetID)
		if err != nil {
			return model.CommunitySubmissionItem{}, mapStorageError(err)
		}
		if sourceName == "" {
			sourceName = trimRunes(firstNonEmpty(asset.OriginalName, asset.DisplayName), 240)
		}
		if sourceType == "" {
			sourceType = trimRunes(asset.MIMEType, 120)
		}
		if req.SourceSize <= 0 {
			req.SourceSize = asset.SizeBytes
		}
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
		MediaAssetID:  mediaAssetID,
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

func (s *service) ListCommunityReviewSubmissions(ctx context.Context, filter model.CommunitySubmissionFilter) (model.CommunitySubmissionPayload, error) {
	if s.repo == nil {
		return model.CommunitySubmissionPayload{}, ErrStorageUnavailable
	}
	status, err := normalizeSubmissionReviewListStatus(filter.Status)
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	filter.AllClients = true
	filter.Status = status
	filter.Limit = normalizeLimit(filter.Limit, 24)
	submissions, err := s.repo.ListCommunitySubmissions(ctx, filter)
	if err != nil {
		return model.CommunitySubmissionPayload{}, mapStorageError(err)
	}
	items, err := s.decorateSubmissions(ctx, submissions)
	if err != nil {
		return model.CommunitySubmissionPayload{}, err
	}
	message := "社区投稿审核队列来自 community_submissions；发布时可绑定既有视频，或从受控 system_media_assets 资产生成社区视频记录。"
	return model.CommunitySubmissionPayload{
		Authenticated: true,
		Items:         model.PageResult[model.CommunitySubmissionItem]{Items: items},
		Message:       &message,
	}, nil
}

func (s *service) ReviewCommunitySubmission(ctx context.Context, principal authtypes.Principal, submissionID string, req model.ReviewCommunitySubmissionRequest) (model.CommunitySubmissionItem, error) {
	if s.repo == nil {
		return model.CommunitySubmissionItem{}, ErrStorageUnavailable
	}
	reviewerID, err := communityReviewPrincipalID(principal)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	submissionID = strings.TrimSpace(submissionID)
	if submissionID == "" {
		return model.CommunitySubmissionItem{}, ErrInvalidInput
	}
	nextStatus, err := normalizeSubmissionReviewStatus(req.Status)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	reviewNote := trimRunes(req.ReviewNote, 720)
	publishedVideoID := trimRunes(req.PublishedVideoID, 96)
	var mediaAssetID int64
	if nextStatus == model.CommunitySubmissionStatusRejected && reviewNote == "" {
		return model.CommunitySubmissionItem{}, ErrInvalidInput
	}
	submission, err := s.repo.FindCommunitySubmission(ctx, submissionID)
	if err != nil {
		return model.CommunitySubmissionItem{}, mapStorageError(err)
	}
	now := s.now()
	if nextStatus == model.CommunitySubmissionStatusPublished {
		publish, err := s.resolvePublishedSubmissionVideo(ctx, *submission, req, now)
		if err != nil {
			return model.CommunitySubmissionItem{}, err
		}
		publishedVideoID = publish.VideoID
		mediaAssetID = publish.MediaAssetID
	}
	if err := applySubmissionReview(submission, nextStatus, reviewNote, reviewerID, publishedVideoID, mediaAssetID, now); err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	if err := s.repo.UpdateCommunitySubmissionReview(ctx, *submission); err != nil {
		return model.CommunitySubmissionItem{}, mapStorageError(err)
	}
	if err := s.createNotification(ctx, submissionReviewNotification(*submission)); err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	items, err := s.decorateSubmissions(ctx, []model.CommunitySubmission{*submission})
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
		MediaAssetID:  req.MediaAssetID,
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

func submissionReviewNotification(submission model.CommunitySubmission) model.CommunityNotification {
	title := "投稿审核状态已更新"
	body := "《" + submission.Title + "》的审核状态已更新为 " + submission.Status + "。"
	link := "/upload"
	switch submission.Status {
	case model.CommunitySubmissionStatusApproved:
		title = "投稿审核通过"
		body = "《" + submission.Title + "》已通过审核，等待后续媒体发布处理。"
	case model.CommunitySubmissionStatusRejected:
		title = "投稿审核未通过"
		body = "《" + submission.Title + "》未通过审核。"
		if strings.TrimSpace(submission.ReviewNote) != "" {
			body += "原因：" + strings.TrimSpace(submission.ReviewNote)
		}
	case model.CommunitySubmissionStatusPublished:
		title = "投稿已发布"
		body = "《" + submission.Title + "》已关联公开视频 " + submission.PublishedVideoID + "。"
		if strings.TrimSpace(submission.PublishedVideoID) != "" {
			link = "/video/" + submission.PublishedVideoID
		}
	}
	return model.CommunityNotification{
		ClientID:   submission.ClientID,
		Kind:       model.CommunityNotificationKindSubmission,
		Title:      title,
		Body:       body,
		TargetKind: model.CommunityNotificationTargetSubmission,
		TargetID:   submission.ID,
		VideoID:    submission.PublishedVideoID,
		Link:       link,
	}
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
	filter := model.CommunityDynamicFilter{Limit: 6}
	if clientID != nil {
		filter.ClientID = *clientID
	}
	dynamics, err := s.communityDynamicItems(ctx, filter)
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
		dynamics, err = s.communityDynamicItems(ctx, model.CommunityDynamicFilter{ClientID: clientID, CreatorIDs: followedCreatorIDs, Limit: 12})
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
	return s.decorateDynamics(ctx, dynamics, filter.ClientID)
}

func (s *service) decorateDynamics(ctx context.Context, dynamics []model.CommunityDynamic, currentClientID string) ([]model.CommunityDynamicItem, error) {
	if len(dynamics) == 0 {
		return []model.CommunityDynamicItem{}, nil
	}
	currentClientID = strings.TrimSpace(currentClientID)
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
			UpdatedAt:  dynamic.UpdatedAt,

			OwnedByCurrentClient: currentClientID != "" && dynamic.ClientID == currentClientID,
		})
	}
	return items, nil
}

func (s *service) decorateSubmissions(ctx context.Context, submissions []model.CommunitySubmission) ([]model.CommunitySubmissionItem, error) {
	if len(submissions) == 0 {
		return []model.CommunitySubmissionItem{}, nil
	}
	categories, err := s.listCategories(ctx)
	if err != nil {
		return nil, err
	}
	categoryBySlug := make(map[string]model.Category, len(categories))
	for _, category := range categories {
		categoryBySlug[category.Slug] = category
	}
	submissionIDs := make([]string, 0, len(submissions))
	for _, submission := range submissions {
		submissionIDs = append(submissionIDs, submission.ID)
	}
	jobs, err := s.repo.ListLatestCommunityVideoJobsBySubmissionIDs(ctx, submissionIDs)
	if err != nil {
		return nil, mapStorageError(err)
	}
	jobBySubmissionID := make(map[string]model.CommunitySubmissionVideoJobSummary, len(jobs))
	for _, job := range jobs {
		jobBySubmissionID[job.SubmissionID] = summarizeCommunityVideoJob(job)
	}
	items := make([]model.CommunitySubmissionItem, 0, len(submissions))
	for _, submission := range submissions {
		var category *model.Category
		if match, ok := categoryBySlug[submission.CategorySlug]; ok {
			item := match
			category = &item
		}
		var latestVideoJob *model.CommunitySubmissionVideoJobSummary
		if job, ok := jobBySubmissionID[submission.ID]; ok {
			latestVideoJob = &job
		}
		items = append(items, model.CommunitySubmissionItem{
			ID:               submission.ID,
			ClientID:         submission.ClientID,
			AuthorName:       submission.AuthorName,
			Title:            submission.Title,
			Description:      submission.Description,
			CategorySlug:     submission.CategorySlug,
			Category:         category,
			Tags:             decodeSubmissionTags(submission.TagsJSON),
			Visibility:       submission.Visibility,
			SourceName:       submission.SourceName,
			SourceSize:       submission.SourceSize,
			SourceType:       submission.SourceType,
			AllowComments:    submission.AllowComments,
			Sensitive:        submission.Sensitive,
			Status:           submission.Status,
			ReviewNote:       submission.ReviewNote,
			ReviewerID:       submission.ReviewerID,
			ReviewedAt:       submission.ReviewedAt,
			MediaAssetID:     submission.MediaAssetID,
			PublishedVideoID: submission.PublishedVideoID,
			PublishedAt:      submission.PublishedAt,
			LatestVideoJob:   latestVideoJob,
			CreatedAt:        submission.CreatedAt,
			UpdatedAt:        submission.UpdatedAt,
		})
	}
	return items, nil
}

func summarizeCommunityVideoJob(job model.CommunityVideoJob) model.CommunitySubmissionVideoJobSummary {
	return model.CommunitySubmissionVideoJobSummary{
		ID:              job.ID,
		Status:          job.Status,
		Progress:        job.Progress,
		VideoID:         job.VideoID,
		FailureCode:     job.FailureCode,
		ErrorMessage:    job.ErrorMessage,
		OutputPublicURL: job.OutputPublicURL,
		StartedAt:       job.StartedAt,
		FinishedAt:      job.FinishedAt,
		CreatedAt:       job.CreatedAt,
		UpdatedAt:       job.UpdatedAt,
	}
}

func (s *service) categoryForSlug(ctx context.Context, slug string) (*model.Category, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrInvalidInput
	}
	categories, err := s.listCategories(ctx)
	if err != nil {
		return nil, err
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
	normalized, err := s.normalizeVideoListFilter(ctx, filter)
	if err != nil {
		return nil, err
	}
	videos, err := s.repo.ListVideos(ctx, normalized)
	if err != nil {
		return nil, mapStorageError(err)
	}
	return s.decorateVideos(ctx, videos)
}

func (s *service) decorateVideos(ctx context.Context, videos []model.Video) ([]model.VideoSummary, error) {
	if len(videos) == 0 {
		return []model.VideoSummary{}, nil
	}
	categories, err := s.listCategories(ctx)
	if err != nil {
		return nil, err
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
				continue
			}
			return nil, fmt.Errorf("%w: video %s references missing category %s", ErrDataInconsistent, video.ID, slug)
		}
		creator, ok := creatorByID[video.UploaderID]
		if !ok {
			return nil, fmt.Errorf("%w: video %s references missing uploader %s", ErrDataInconsistent, video.ID, video.UploaderID)
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
			Uploader:        creator.UserSummary,
			Categories:      videoCategories,
		})
	}
	return out, nil
}

func (s *service) normalizeVideoListFilter(ctx context.Context, filter model.VideoFilter) (model.VideoFilter, error) {
	filter = normalizeVideoFilter(filter)
	if filter.Category == "" {
		return filter, nil
	}
	categories, err := s.listCategories(ctx)
	if err != nil {
		return model.VideoFilter{}, err
	}
	slugs := categorySelfAndChildren(categories, filter.Category)
	if len(slugs) == 0 {
		return model.VideoFilter{}, ErrInvalidInput
	}
	filter.CategorySlugs = slugs
	return filter, nil
}

func categorySelfAndChildren(categories []model.Category, slug string) []string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil
	}
	childrenByParent := make(map[string][]string, len(categories))
	known := make(map[string]struct{}, len(categories))
	for _, category := range categories {
		known[category.Slug] = struct{}{}
		if category.ParentSlug != nil {
			parent := strings.TrimSpace(*category.ParentSlug)
			if parent != "" {
				childrenByParent[parent] = append(childrenByParent[parent], category.Slug)
			}
		}
	}
	if _, ok := known[slug]; !ok {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	var walk func(string)
	walk = func(current string) {
		if _, ok := seen[current]; ok {
			return
		}
		seen[current] = struct{}{}
		out = append(out, current)
		for _, child := range childrenByParent[current] {
			walk(child)
		}
	}
	walk(slug)
	sort.Strings(out)
	return out
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

func (s *service) videoCommentForClient(ctx context.Context, idOrSlug string, commentID string, clientID string) (*model.Video, *model.VideoComment, error) {
	if s.repo == nil {
		return nil, nil, ErrStorageUnavailable
	}
	video, err := s.repo.FindVideoByIDOrSlug(ctx, strings.TrimSpace(idOrSlug))
	if err != nil {
		return nil, nil, mapStorageError(err)
	}
	commentID = strings.TrimSpace(commentID)
	if commentID == "" {
		return nil, nil, ErrInvalidInput
	}
	comment, err := s.repo.FindVideoComment(ctx, video.ID, commentID)
	if err != nil {
		return nil, nil, mapStorageError(err)
	}
	if strings.TrimSpace(comment.ClientID) == "" || comment.ClientID != clientID {
		return nil, nil, ErrNotFound
	}
	return video, comment, nil
}

func (s *service) communityDynamicForClient(ctx context.Context, dynamicID string, clientID string) (*model.CommunityDynamic, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	dynamicID = strings.TrimSpace(dynamicID)
	if dynamicID == "" {
		return nil, ErrInvalidInput
	}
	dynamic, err := s.repo.FindCommunityDynamic(ctx, dynamicID)
	if err != nil {
		return nil, mapStorageError(err)
	}
	if strings.TrimSpace(dynamic.ClientID) == "" || dynamic.ClientID != clientID {
		return nil, ErrNotFound
	}
	return dynamic, nil
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

func markOwnedVideoComments(items []model.VideoComment, clientID string) {
	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return
	}
	for index := range items {
		items[index].OwnedByCurrentClient = items[index].ClientID == clientID
	}
}

func normalizeVideoFilter(filter model.VideoFilter) model.VideoFilter {
	filter.Category = strings.TrimSpace(filter.Category)
	filter.CategorySlugs = normalizeCategorySlugs(filter.CategorySlugs)
	filter.Cursor = strings.TrimSpace(filter.Cursor)
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Limit = normalizeLimit(filter.Limit, 24)
	filter.UploaderID = strings.TrimSpace(filter.UploaderID)
	return filter
}

func normalizeCategorySlugs(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
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

func normalizeSubmissionReviewStatus(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case model.CommunitySubmissionStatusApproved:
		return model.CommunitySubmissionStatusApproved, nil
	case model.CommunitySubmissionStatusRejected:
		return model.CommunitySubmissionStatusRejected, nil
	case model.CommunitySubmissionStatusPublished:
		return model.CommunitySubmissionStatusPublished, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeSubmissionReviewListStatus(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case "":
		return "", nil
	case model.CommunitySubmissionStatusPendingReview:
		return model.CommunitySubmissionStatusPendingReview, nil
	case model.CommunitySubmissionStatusApproved:
		return model.CommunitySubmissionStatusApproved, nil
	case model.CommunitySubmissionStatusRejected:
		return model.CommunitySubmissionStatusRejected, nil
	case model.CommunitySubmissionStatusPublished:
		return model.CommunitySubmissionStatusPublished, nil
	default:
		return "", ErrInvalidInput
	}
}

type submissionPublishResult struct {
	MediaAssetID int64
	VideoID      string
}

func (s *service) resolvePublishedSubmissionVideo(ctx context.Context, submission model.CommunitySubmission, req model.ReviewCommunitySubmissionRequest, now time.Time) (submissionPublishResult, error) {
	if publishedVideoID := trimRunes(req.PublishedVideoID, 96); publishedVideoID != "" {
		video, err := s.repo.FindVideoByIDOrSlug(ctx, publishedVideoID)
		if err != nil {
			return submissionPublishResult{}, mapStorageError(err)
		}
		return submissionPublishResult{VideoID: video.ID, MediaAssetID: submission.MediaAssetID}, nil
	}
	if strings.TrimSpace(submission.PublishedVideoID) != "" {
		return submissionPublishResult{VideoID: submission.PublishedVideoID, MediaAssetID: submission.MediaAssetID}, nil
	}
	mediaAssetID, err := normalizeSubmissionMediaAssetID(req.MediaAssetID)
	if err != nil {
		return submissionPublishResult{}, err
	}
	if mediaAssetID == 0 {
		mediaAssetID = submission.MediaAssetID
	}
	sourceURL := ""
	sourceType := submission.SourceType
	if mediaAssetID > 0 {
		asset, err := s.repo.FindMediaAssetByID(ctx, mediaAssetID)
		if err != nil {
			return submissionPublishResult{}, mapStorageError(err)
		}
		sourceURL = strings.TrimSpace(asset.URL)
		if strings.TrimSpace(asset.MIMEType) != "" {
			sourceType = asset.MIMEType
		}
		if _, err := normalizeSubmissionReviewSourceURL(sourceURL); err != nil {
			return submissionPublishResult{}, err
		}
	} else {
		sourceURL, err = normalizeSubmissionReviewSourceURL(req.SourceURL)
		if err != nil {
			return submissionPublishResult{}, err
		}
	}
	durationSeconds := normalizeSubmissionReviewDuration(req.DurationSeconds)
	if durationSeconds <= 0 {
		return submissionPublishResult{}, ErrInvalidInput
	}
	videoID := submissionVideoID(submission)
	slug := submissionVideoSlug(submission, req.Slug)
	thumbnailURL := normalizeSubmissionReviewThumbnailURL(req.ThumbnailURL, slug)
	description := trimRunes(submission.Description, 720)
	var descriptionPtr *string
	if description != "" {
		descriptionPtr = &description
	}
	creator, err := s.submissionVideoCreator(ctx, submission, now)
	if err != nil {
		return submissionPublishResult{}, err
	}
	video := model.Video{
		ID:              videoID,
		Slug:            slug,
		Title:           trimRunes(submission.Title, 240),
		Description:     descriptionPtr,
		ThumbnailURL:    thumbnailURL,
		DurationSeconds: durationSeconds,
		ViewCount:       0,
		CommentCount:    0,
		LikeCount:       0,
		SourceURL:       sourceURL,
		PublishedAt:     now,
		UploaderID:      creator.ID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	source := model.VideoSourceOption{
		ID:        submissionVideoSourceID(videoID),
		VideoID:   videoID,
		Src:       sourceURL,
		Kind:      model.VideoSourceKindNative,
		Label:     "投稿原始源",
		MimeType:  optionalSourceMimeType(sourceType),
		IsDefault: true,
		Order:     10,
	}
	categorySlugs := []string{}
	if strings.TrimSpace(submission.CategorySlug) != "" {
		categorySlugs = append(categorySlugs, strings.TrimSpace(submission.CategorySlug))
	}
	if err := s.repo.CreateVideoFromSubmission(ctx, creator, video, source, categorySlugs, decodeSubmissionTags(submission.TagsJSON)); err != nil {
		return submissionPublishResult{}, mapStorageError(err)
	}
	return submissionPublishResult{VideoID: video.ID, MediaAssetID: mediaAssetID}, nil
}

func applySubmissionReview(submission *model.CommunitySubmission, nextStatus string, reviewNote string, reviewerID string, publishedVideoID string, mediaAssetID int64, now time.Time) error {
	switch nextStatus {
	case model.CommunitySubmissionStatusApproved:
		if submission.Status == model.CommunitySubmissionStatusPublished {
			return ErrInvalidInput
		}
		submission.PublishedVideoID = ""
		submission.PublishedAt = nil
	case model.CommunitySubmissionStatusRejected:
		if submission.Status == model.CommunitySubmissionStatusPublished {
			return ErrInvalidInput
		}
		submission.PublishedVideoID = ""
		submission.PublishedAt = nil
	case model.CommunitySubmissionStatusPublished:
		if submission.Status != model.CommunitySubmissionStatusApproved && submission.Status != model.CommunitySubmissionStatusPublished {
			return ErrInvalidInput
		}
		if mediaAssetID > 0 {
			submission.MediaAssetID = mediaAssetID
		}
		submission.PublishedVideoID = publishedVideoID
		submission.PublishedAt = &now
	default:
		return ErrInvalidInput
	}
	submission.Status = nextStatus
	submission.ReviewNote = reviewNote
	submission.ReviewerID = reviewerID
	submission.ReviewedAt = &now
	submission.UpdatedAt = now
	return nil
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

func normalizeSubmissionReviewSourceURL(value string) (string, error) {
	value = trimRunes(value, 512)
	if value == "" {
		return "", ErrInvalidInput
	}
	lower := strings.ToLower(value)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(value, "/") {
		return value, nil
	}
	return "", ErrInvalidInput
}

func normalizeSubmissionMediaAssetID(value int64) (int64, error) {
	if value < 0 {
		return 0, ErrInvalidInput
	}
	return value, nil
}

func normalizeSubmissionReviewThumbnailURL(value string, slug string) string {
	value = trimRunes(value, 512)
	if value != "" {
		return value
	}
	return "gradient:" + slug
}

func normalizeSubmissionReviewDuration(value int) int {
	if value < 0 {
		return 0
	}
	if value > 24*60*60 {
		return 24 * 60 * 60
	}
	return value
}

func optionalSourceMimeType(value string) *string {
	value = trimRunes(value, 120)
	if value == "" {
		return nil
	}
	return &value
}

func submissionVideoID(submission model.CommunitySubmission) string {
	raw := strings.TrimPrefix(strings.TrimSpace(submission.ID), "submission-")
	raw = safeASCIIIdentifier(raw)
	if raw == "" {
		raw = shortHash(submission.ID)
	}
	return trimRunes("video-"+raw, 96)
}

func submissionVideoSourceID(videoID string) string {
	raw := strings.TrimPrefix(strings.TrimSpace(videoID), "video-")
	raw = safeASCIIIdentifier(raw)
	if raw == "" {
		raw = shortHash(videoID)
	}
	return trimRunes("source-"+raw+"-primary", 96)
}

func submissionVideoSlug(submission model.CommunitySubmission, value string) string {
	base := safeASCIIIdentifier(value)
	if base == "" {
		base = safeASCIIIdentifier(submission.Title)
	}
	if base == "" {
		base = "submission"
	}
	base = trimRunes(base, 48)
	return trimRunes(base+"-"+shortHash(submission.ID), 160)
}

func (s *service) submissionVideoCreator(ctx context.Context, submission model.CommunitySubmission, now time.Time) (model.Creator, error) {
	seed := strings.TrimSpace(submission.ClientID)
	if strings.HasPrefix(seed, "account:") {
		idStr := strings.TrimPrefix(seed, "account:")
		if id, err := strconv.ParseInt(idStr, 10, 64); err == nil {
			account, err := s.repo.FindCommunityAccountByID(ctx, id)
			if err == nil && account != nil {
				if cr, err := s.repo.FindCreatorByHandle(ctx, account.Handle); err == nil && cr != nil {
					return *cr, nil
				}
				hash := shortHash(account.Handle + ":" + strconv.FormatInt(account.ID, 10))
				creatorID := trimRunes("creator-"+hash, 96)
				return model.Creator{
					UserSummary: model.UserSummary{
						ID:          creatorID,
						Handle:      account.Handle,
						DisplayName: account.DisplayName,
						AvatarURL:   nil,
					},
					FollowerCount: 0,
					JoinedAt:      account.CreatedAt,
					CreatedAt:     account.CreatedAt,
					UpdatedAt:     now,
				}, nil
			}
		}
	}

	hash := shortHash(seed + ":" + submission.AuthorName)
	handleBase := safeASCIIIdentifier(seed)
	if handleBase == "" {
		handleBase = "community"
	}
	handle := trimRunes("u-"+trimRunes(handleBase, 42)+"-"+hash, 96)
	creatorID := trimRunes("creator-"+hash, 96)
	displayName := normalizeCommentAuthor(submission.AuthorName)
	if displayName == "" {
		return model.Creator{}, ErrInvalidInput
	}
	return model.Creator{
		UserSummary: model.UserSummary{
			ID:          creatorID,
			Handle:      handle,
			DisplayName: displayName,
			AvatarURL:   nil,
		},
		FollowerCount: 0,
		JoinedAt:      now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}, nil
}

func safeASCIIIdentifier(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		allowed := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if allowed {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash && builder.Len() > 0 {
			builder.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func shortHash(value string) string {
	hash := fnv.New32a()
	if _, err := hash.Write([]byte(value)); err != nil {
		return "0"
	}
	return strconv.FormatUint(uint64(hash.Sum32()), 36)
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
	if name := normalizeCommentAuthor(principal.DisplayName); name != "" {
		return name
	}
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

func communityReviewPrincipalID(principal authtypes.Principal) (string, error) {
	if principal.UserID <= 0 {
		return "", ErrInvalidInput
	}
	return strconv.FormatInt(principal.UserID, 10), nil
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

func normalizeCommunitySignup(req model.CommunitySignupRequest) (string, string, string, string, error) {
	handle := strings.ToLower(strings.TrimSpace(req.Username))
	email := strings.ToLower(strings.TrimSpace(req.Email))
	displayName := strings.TrimSpace(req.DisplayName)
	password := strings.TrimSpace(req.Password)
	if !communityHandlePattern.MatchString(handle) || !validCommunityEmail(email) || len(password) < 8 {
		return "", "", "", "", ErrInvalidInput
	}
	if displayName == "" {
		displayName = handle
	}
	if len(displayName) > 120 {
		return "", "", "", "", ErrInvalidInput
	}
	return handle, email, displayName, password, nil
}

func validCommunityEmail(value string) bool {
	at := strings.Index(value, "@")
	return at > 0 && at < len(value)-1 && strings.Contains(value[at+1:], ".") && !strings.ContainsAny(value, " \t\r\n")
}

func (s *service) issueCommunitySession(ctx context.Context, account *model.CommunityAccount, input SessionIssueInput) (model.CommunityAuthSessionSnapshot, SessionTokens, error) {
	if account == nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, ErrInvalidInput
	}
	accessToken, err := randomToken()
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, err
	}
	refreshToken, err := randomToken()
	if err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, err
	}
	now := s.now()
	session := model.CommunitySession{
		ID:               s.cfg.NewIntID(),
		AccountID:        account.ID,
		AccessTokenHash:  hashToken(accessToken),
		RefreshTokenHash: hashToken(refreshToken),
		ProductCode:      strings.TrimSpace(firstNonEmpty(input.ProductCode, s.cfg.DefaultProductCode)),
		ClientType:       strings.TrimSpace(firstNonEmpty(input.ClientType, s.cfg.DefaultClientType)),
		IPAddress:        trimMax(input.IPAddress, 64),
		UserAgent:        trimMax(input.UserAgent, 512),
		AccessExpiresAt:  now.Add(s.cfg.AccessTokenTTL),
		RefreshExpiresAt: now.Add(s.cfg.RefreshTokenTTL),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := s.repo.CreateCommunitySession(ctx, session); err != nil {
		return model.CommunityAuthSessionSnapshot{}, SessionTokens{}, mapStorageError(err)
	}
	tokens := SessionTokens{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		AccessExpiresAt:  session.AccessExpiresAt,
		RefreshExpiresAt: session.RefreshExpiresAt,
	}
	return communityAuthSnapshot(*account, session), tokens, nil
}

func (s *service) communityPrincipal(account *model.CommunityAccount, session *model.CommunitySession) authtypes.Principal {
	return authtypes.Principal{
		UserID:      account.ID,
		SessionID:   session.ID,
		ProductCode: strings.TrimSpace(firstNonEmpty(session.ProductCode, s.cfg.DefaultProductCode)),
		ClientType:  strings.TrimSpace(firstNonEmpty(session.ClientType, s.cfg.DefaultClientType)),
		Username:    account.Handle,
		DisplayName: account.DisplayName,
		Email:       account.Email,
		RoleCode:    account.Role,
	}
}

func communityAuthSnapshot(account model.CommunityAccount, session model.CommunitySession) model.CommunityAuthSessionSnapshot {
	userID := strconv.FormatInt(account.ID, 10)
	sessionID := strconv.FormatInt(session.ID, 10)
	expiresAt := session.AccessExpiresAt
	refreshExpiresAt := session.RefreshExpiresAt
	accountView := model.CommunityAccountSession{
		ID:          strconv.FormatInt(account.ID, 10),
		Handle:      account.Handle,
		Email:       account.Email,
		DisplayName: account.DisplayName,
		Role:        account.Role,
		Status:      account.Status,
		LastLoginAt: account.LastLoginAt,
		CreatedAt:   account.CreatedAt,
	}
	return model.CommunityAuthSessionSnapshot{
		Authenticated:    true,
		Account:          &accountView,
		User:             &accountView,
		UserID:           &userID,
		SessionID:        &sessionID,
		ExpiresAt:        &expiresAt,
		AccessExpiresAt:  &expiresAt,
		RefreshExpiresAt: &refreshExpiresAt,
	}
}

func communityAccountItem(account model.CommunityAccount) model.CommunityAccountItem {
	return model.CommunityAccountItem{
		ID:          strconv.FormatInt(account.ID, 10),
		Handle:      account.Handle,
		Email:       account.Email,
		DisplayName: account.DisplayName,
		Role:        account.Role,
		Status:      account.Status,
		LastLoginAt: account.LastLoginAt,
		CreatedAt:   account.CreatedAt,
		UpdatedAt:   account.UpdatedAt,
	}
}

func communityReportItem(report model.CommunityReport) model.CommunityReportItem {
	return model.CommunityReportItem{
		ID:         report.ID,
		TargetKind: report.TargetKind,
		TargetID:   report.TargetID,
		VideoID:    report.VideoID,
		ClientID:   report.ClientID,
		Reason:     report.Reason,
		Detail:     report.Detail,
		Status:     report.Status,
		ReviewNote: report.ReviewNote,
		ReviewerID: report.ReviewerID,
		ReviewedAt: report.ReviewedAt,
		CreatedAt:  report.CreatedAt,
		UpdatedAt:  report.UpdatedAt,
	}
}

func normalizeCommunityAccountRole(value string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case model.CommunityAccountRoleRegistered:
		return model.CommunityAccountRoleRegistered, nil
	case model.CommunityAccountRoleCreator:
		return model.CommunityAccountRoleCreator, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeCommunityAccountStatus(value string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case model.CommunityAccountStatusActive:
		return model.CommunityAccountStatusActive, nil
	case model.CommunityAccountStatusDisabled:
		return model.CommunityAccountStatusDisabled, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeCommunityReportStatus(value string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case model.CommunityReportStatusPending:
		return model.CommunityReportStatusPending, nil
	case model.CommunityReportStatusResolved:
		return model.CommunityReportStatusResolved, nil
	case model.CommunityReportStatusRejected:
		return model.CommunityReportStatusRejected, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeCommunityReportReviewStatus(value string) (string, error) {
	status, err := normalizeCommunityReportStatus(value)
	if err != nil {
		return "", err
	}
	if status == model.CommunityReportStatusPending {
		return "", ErrInvalidInput
	}
	return status, nil
}

func randomToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashToken(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func trimMax(value string, max int) string {
	value = strings.TrimSpace(value)
	if max <= 0 || len(value) <= max {
		return value
	}
	return value[:max]
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
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

// ── Account Profile Management ─────────────────────────────────────────────

// GetCommunityAccountProfile 返回当前登录账号的完整资料，若 role == "creator" 则附加 bio 和 avatarUrl。
func (s *service) GetCommunityAccountProfile(ctx context.Context, principal authtypes.Principal) (model.AccountProfileResponse, error) {
	if s.repo == nil {
		return model.AccountProfileResponse{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountProfileResponse{}, mapStorageError(err)
	}
	resp := accountProfileResponse(*account)
	// Try to enrich with creator bio/avatar/banner if creator record exists.
	creator, cerr := s.repo.FindCreatorByHandle(ctx, account.Handle)
	if cerr == nil && creator != nil {
		resp.Bio = creator.Bio
		resp.AvatarURL = creator.UserSummary.AvatarURL
		resp.BannerURL = creator.BannerURL
	}
	return resp, nil
}

// UpdateCommunityAccountProfile 更新当前账号的昵称。
func (s *service) UpdateCommunityAccountProfile(ctx context.Context, principal authtypes.Principal, req model.UpdateAccountProfileRequest) (model.AccountProfileResponse, error) {
	if s.repo == nil {
		return model.AccountProfileResponse{}, ErrStorageUnavailable
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		return model.AccountProfileResponse{}, ErrInvalidInput
	}
	if len([]rune(displayName)) > 120 {
		return model.AccountProfileResponse{}, ErrInvalidInput
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountProfileResponse{}, mapStorageError(err)
	}
	account.DisplayName = displayName
	account.UpdatedAt = s.now()
	if err := s.repo.UpdateCommunityAccount(ctx, *account); err != nil {
		return model.AccountProfileResponse{}, mapStorageError(err)
	}
	resp := accountProfileResponse(*account)
	if account.Role == model.CommunityAccountRoleCreator {
		creator, cerr := s.repo.FindCreatorByHandle(ctx, account.Handle)
		if cerr == nil && creator != nil {
			resp.Bio = creator.Bio
			resp.AvatarURL = creator.UserSummary.AvatarURL
			resp.BannerURL = creator.BannerURL
		}
	}
	return resp, nil
}

// UpdateCommunityAccountCreatorProfile 更新创作者的 bio 和 avatarUrl；非创作者账号返回 ErrForbidden。
func (s *service) UpdateCommunityAccountCreatorProfile(ctx context.Context, principal authtypes.Principal, req model.UpdateAccountCreatorProfileRequest) (model.AccountProfileResponse, error) {
	if s.repo == nil {
		return model.AccountProfileResponse{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountProfileResponse{}, mapStorageError(err)
	}
	creator, err := s.getOrCreateCreator(ctx, account)
	if err != nil {
		return model.AccountProfileResponse{}, err
	}
	if req.Bio != nil {
		bio := trimRunes(*req.Bio, 640)
		creator.Bio = &bio
	}
	if req.AvatarURL != nil {
		avatar := trimRunes(*req.AvatarURL, 512)
		creator.UserSummary.AvatarURL = &avatar
	}
	creator.UpdatedAt = s.now()
	if err := s.repo.UpdateCreator(ctx, *creator); err != nil {
		return model.AccountProfileResponse{}, mapStorageError(err)
	}
	resp := accountProfileResponse(*account)
	resp.Bio = creator.Bio
	resp.AvatarURL = creator.UserSummary.AvatarURL
	resp.BannerURL = creator.BannerURL
	return resp, nil
}

func (s *service) UploadAccountBanner(ctx context.Context, principal authtypes.Principal, input UploadSourceInput) (model.AccountBannerResult, error) {
	if s.video == nil || s.repo == nil {
		return model.AccountBannerResult{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountBannerResult{}, mapStorageError(err)
	}
	creator, err := s.getOrCreateCreator(ctx, account)
	if err != nil {
		return model.AccountBannerResult{}, err
	}
	now := s.now()
	// Cooldown for banner uploads (10 seconds)
	if creator.BannerURL != nil && creator.UpdatedAt.Add(10 * time.Second).After(now) {
		return model.AccountBannerResult{}, ErrCooldownActive
	}

	uploadResult, err := s.video.UploadSource(ctx, principal, input)
	if err != nil {
		return model.AccountBannerResult{}, err
	}
	bannerURL := uploadResult.URL

	creator.BannerURL = &bannerURL
	creator.UpdatedAt = now
	if uErr := s.repo.UpdateCreator(ctx, *creator); uErr != nil {
		return model.AccountBannerResult{}, mapStorageError(uErr)
	}
	profile, err := s.GetCommunityAccountProfile(ctx, principal)
	if err != nil {
		return model.AccountBannerResult{}, err
	}
	return model.AccountBannerResult{
		BannerURL: bannerURL,
		Profile:   profile,
	}, nil
}

func (s *service) DeleteAccountBanner(ctx context.Context, principal authtypes.Principal) (model.AccountBannerResult, error) {
	if s.repo == nil {
		return model.AccountBannerResult{}, ErrStorageUnavailable
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return model.AccountBannerResult{}, mapStorageError(err)
	}
	creator, err := s.getOrCreateCreator(ctx, account)
	if err != nil {
		return model.AccountBannerResult{}, err
	}
	now := s.now()
	creator.BannerURL = nil
	creator.UpdatedAt = now
	if uErr := s.repo.UpdateCreator(ctx, *creator); uErr != nil {
		return model.AccountBannerResult{}, mapStorageError(uErr)
	}
	profile, err := s.GetCommunityAccountProfile(ctx, principal)
	if err != nil {
		return model.AccountBannerResult{}, err
	}
	return model.AccountBannerResult{
		BannerURL: "",
		Profile:   profile,
	}, nil
}

// ChangeAccountPassword 验证当前密码后更新为新密码。
func (s *service) ChangeAccountPassword(ctx context.Context, principal authtypes.Principal, req model.ChangeAccountPasswordRequest) error {
	if s.repo == nil || s.cfg.Passwords == nil {
		return ErrStorageUnavailable
	}
	currentPassword := strings.TrimSpace(req.CurrentPassword)
	newPassword := strings.TrimSpace(req.NewPassword)
	if currentPassword == "" || newPassword == "" {
		return ErrInvalidInput
	}
	if len(newPassword) < 8 {
		return ErrInvalidInput
	}
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return mapStorageError(err)
	}
	if err := s.cfg.Passwords.VerifyPassword(account.PasswordHash, currentPassword); err != nil {
		return ErrUnauthorized
	}
	hash, err := s.cfg.Passwords.HashPassword(newPassword)
	if err != nil {
		return ErrInvalidInput
	}
	account.PasswordHash = hash
	account.UpdatedAt = s.now()
	return mapStorageError(s.repo.UpdateCommunityAccount(ctx, *account))
}

// GetCommunityAccountSubmission 获取当前账号的单条投稿详情。
func (s *service) GetCommunityAccountSubmission(ctx context.Context, principal authtypes.Principal, submissionID string) (model.CommunitySubmissionItem, error) {
	if s.repo == nil {
		return model.CommunitySubmissionItem{}, ErrStorageUnavailable
	}
	clientID, err := s.accountClientID(ctx, principal)
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	sub, err := s.repo.FindCommunitySubmission(ctx, strings.TrimSpace(submissionID))
	if err != nil {
		return model.CommunitySubmissionItem{}, mapStorageError(err)
	}
	if sub.ClientID != clientID {
		return model.CommunitySubmissionItem{}, ErrForbidden
	}
	items, err := s.decorateSubmissions(ctx, []model.CommunitySubmission{*sub})
	if err != nil {
		return model.CommunitySubmissionItem{}, err
	}
	if len(items) == 0 {
		return model.CommunitySubmissionItem{}, ErrNotFound
	}
	return items[0], nil
}

// DeleteCommunityAccountSubmission 删除（软删除）当前账号的某条投稿。
func (s *service) DeleteCommunityAccountSubmission(ctx context.Context, principal authtypes.Principal, submissionID string) (model.DeleteCommunitySubmissionResult, error) {
	if s.repo == nil {
		return model.DeleteCommunitySubmissionResult{}, ErrStorageUnavailable
	}
	clientID, err := s.accountClientID(ctx, principal)
	if err != nil {
		return model.DeleteCommunitySubmissionResult{}, err
	}
	sub, err := s.repo.FindCommunitySubmission(ctx, strings.TrimSpace(submissionID))
	if err != nil {
		return model.DeleteCommunitySubmissionResult{}, mapStorageError(err)
	}
	if sub.ClientID != clientID {
		return model.DeleteCommunitySubmissionResult{}, ErrForbidden
	}
	now := s.now()
	if err := s.repo.DeleteCommunitySubmission(ctx, sub.ID, clientID, now); err != nil {
		return model.DeleteCommunitySubmissionResult{}, mapStorageError(err)
	}
	return model.DeleteCommunitySubmissionResult{
		SubmissionID: sub.ID,
		Deleted:      true,
	}, nil
}



// accountClientID derives the community client ID string from the authenticated principal.
func (s *service) accountClientID(ctx context.Context, principal authtypes.Principal) (string, error) {
	account, err := s.repo.FindCommunityAccountByID(ctx, principal.UserID)
	if err != nil {
		return "", mapStorageError(err)
	}
	return "account-" + account.Handle, nil
}

// accountProfileResponse maps a CommunityAccount to the AccountProfileResponse DTO.
func accountProfileResponse(account model.CommunityAccount) model.AccountProfileResponse {
	return model.AccountProfileResponse{
		ID:          strconv.FormatInt(account.ID, 10),
		Handle:      account.Handle,
		Email:       account.Email,
		DisplayName: account.DisplayName,
		Role:        account.Role,
		Status:      account.Status,
		LastLoginAt: account.LastLoginAt,
		CreatedAt:   account.CreatedAt,
	}
}

func (s *service) getOrCreateCreator(ctx context.Context, account *model.CommunityAccount) (*model.Creator, error) {
	creator, err := s.repo.FindCreatorByHandle(ctx, account.Handle)
	if err == nil && creator != nil {
		return creator, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, mapStorageError(err)
	}

	now := s.now()
	hash := shortHash(account.Handle + ":" + strconv.FormatInt(account.ID, 10))
	creatorID := trimRunes("creator-"+hash, 96)

	newCreator := model.Creator{
		UserSummary: model.UserSummary{
			ID:          creatorID,
			Handle:      account.Handle,
			DisplayName: account.DisplayName,
			AvatarURL:   nil,
		},
		FollowerCount: 0,
		JoinedAt:      now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.CreateCreator(ctx, newCreator); err != nil {
		return nil, mapStorageError(err)
	}
	return &newCreator, nil
}
