package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/middleware"
	"github.com/open-console/console-platform/internal/modules/community/model"
	"github.com/open-console/console-platform/internal/modules/community/service"
	"github.com/open-console/console-platform/internal/ports"
	authtypes "github.com/open-console/console-platform/types/auth"
	"github.com/open-console/console-platform/types/result"
)

// Handler 是视频社区公开 API 的 HTTP 适配器。
type Handler struct {
	logger              ports.Logger
	service             service.Service
	setupStatusProvider SetupStatusProvider
	statusEndpoints     []string
	config              RuntimeConfig
}

type SetupStatusProvider interface {
	CommunitySetupStatus(context.Context) (model.SetupStatus, error)
}

type RuntimeConfig struct {
	CookieNamePrefix string
	CookieDomain     string
	CookiePath       string
	CookieSameSite   string
	CookieSecure     bool
	CSRFEnabled      bool
	CSRFCookieName   string
	CSRFHeaderName   string
	ProductHeader    string
	ClientTypeHeader string
	DefaultProduct   string
	DefaultClient    string
}

func New(service service.Service, logger ports.Logger, configs ...RuntimeConfig) *Handler {
	cfg := RuntimeConfig{}
	if len(configs) > 0 {
		cfg = configs[0]
	}
	cfg.applyDefaults()
	return &Handler{service: service, logger: logger, config: cfg}
}

func (cfg *RuntimeConfig) applyDefaults() {
	if strings.TrimSpace(cfg.CookieNamePrefix) == "" {
		cfg.CookieNamePrefix = "community"
	}
	if strings.TrimSpace(cfg.CookiePath) == "" {
		cfg.CookiePath = "/"
	}
	if strings.TrimSpace(cfg.CookieSameSite) == "" {
		cfg.CookieSameSite = "lax"
	}
	if strings.TrimSpace(cfg.CSRFCookieName) == "" {
		cfg.CSRFCookieName = cfg.CookieNamePrefix + "_csrf"
	}
	if strings.TrimSpace(cfg.CSRFHeaderName) == "" {
		cfg.CSRFHeaderName = "X-Community-CSRF-Token"
	}
	if strings.TrimSpace(cfg.ProductHeader) == "" {
		cfg.ProductHeader = "X-Product-Code"
	}
	if strings.TrimSpace(cfg.ClientTypeHeader) == "" {
		cfg.ClientTypeHeader = "X-Client-Type"
	}
	if strings.TrimSpace(cfg.DefaultProduct) == "" {
		cfg.DefaultProduct = "platform"
	}
	if strings.TrimSpace(cfg.DefaultClient) == "" {
		cfg.DefaultClient = "community_web"
	}
}

func (cfg RuntimeConfig) AccessCookieName() string {
	return strings.TrimSpace(cfg.CookieNamePrefix) + "_access"
}

func (cfg RuntimeConfig) RefreshCookieName() string {
	return strings.TrimSpace(cfg.CookieNamePrefix) + "_refresh"
}

func (cfg RuntimeConfig) AuthMiddlewareConfig() middleware.AuthConfig {
	return middleware.AuthConfig{AccessCookieName: cfg.AccessCookieName()}
}

func (cfg RuntimeConfig) CSRFMiddlewareConfig() middleware.CSRFConfig {
	return middleware.CSRFConfig{Enabled: cfg.CSRFEnabled, CookieName: cfg.CSRFCookieName, HeaderName: cfg.CSRFHeaderName}
}

func (h *Handler) AuthMiddlewareConfig() middleware.AuthConfig {
	return h.config.AuthMiddlewareConfig()
}

func (h *Handler) CSRFMiddlewareConfig() middleware.CSRFConfig {
	return h.config.CSRFMiddlewareConfig()
}

func (h *Handler) UseSetupStatusProvider(provider SetupStatusProvider) {
	h.setupStatusProvider = provider
}

func (h *Handler) UseStatusEndpoints(endpoints []string) {
	h.statusEndpoints = append([]string(nil), endpoints...)
}

func (h *Handler) Status(c ports.HTTPContext) {
	status := h.service.CommunityStatus(c.RequestContext())
	status.Endpoints = append([]string(nil), h.statusEndpoints...)
	if h.setupStatusProvider == nil {
		if h.logger != nil {
			h.logger.Error("community setup status provider missing")
		}
		result.InternalError(c, result.MessageKeyInternalError)
		return
	}
	setup, err := h.setupStatusProvider.CommunitySetupStatus(c.RequestContext())
	if err != nil {
		if h.logger != nil {
			h.logger.Error("community setup status failed", "error", err)
		}
		result.InternalError(c, result.MessageKeyInternalError)
		return
	}
	status.Setup = setup
	result.OK(c, status)
}

func (h *Handler) AuthSignup(c ports.HTTPContext) {
	var req model.CommunitySignupRequest
	if !bind(c, &req) {
		return
	}
	productCode, clientType := h.requestSessionContext(c)
	snapshot, tokens, err := h.service.SignupCommunityAccount(c.RequestContext(), req, service.SessionIssueInput{
		UserAgent:   c.GetHeader("User-Agent"),
		IPAddress:   c.ClientIP(),
		ProductCode: productCode,
		ClientType:  clientType,
	})
	if err != nil {
		h.writeError(c, err)
		return
	}
	h.setAuthCookies(c, tokens, &snapshot)
	result.OK(c, model.CommunitySignupResult{Status: "authenticated", Session: &snapshot})
}

func (h *Handler) AuthLogin(c ports.HTTPContext) {
	var req model.CommunityLoginRequest
	if !bind(c, &req) {
		return
	}
	productCode, clientType := h.requestSessionContext(c)
	snapshot, tokens, err := h.service.LoginCommunityAccount(c.RequestContext(), req, service.SessionIssueInput{
		UserAgent:   c.GetHeader("User-Agent"),
		IPAddress:   c.ClientIP(),
		ProductCode: productCode,
		ClientType:  clientType,
	})
	if err != nil {
		h.writeError(c, err)
		return
	}
	h.setAuthCookies(c, tokens, &snapshot)
	result.OK(c, snapshot)
}

func (h *Handler) AuthSession(c ports.HTTPContext) {
	principal, ok := h.optionalPrincipal(c)
	if !ok {
		result.OK[*model.CommunityAuthSessionSnapshot](c, nil)
		return
	}
	snapshot, err := h.service.CommunityAuthSession(c.RequestContext(), principal)
	if err != nil {
		h.clearAuthCookies(c)
		h.writeError(c, err)
		return
	}
	h.ensureCSRFToken(c, &snapshot)
	result.OK(c, snapshot)
}

func (h *Handler) AuthLogout(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	err := h.service.LogoutCommunityAccount(c.RequestContext(), principal)
	h.clearAuthCookies(c)
	writeOK(c, map[string]bool{"loggedOut": true}, err, h.writeError)
}

func (h *Handler) AuthRefresh(c ports.HTTPContext) {
	refreshToken := ""
	if cookie, err := c.Cookie(h.config.RefreshCookieName()); err == nil {
		refreshToken = cookie
	}
	if strings.TrimSpace(refreshToken) == "" {
		h.clearAuthCookies(c)
		result.Unauthorized(c, result.MessageKeyUnauthorized)
		return
	}
	productCode, clientType := h.requestSessionContext(c)
	snapshot, tokens, err := h.service.RefreshCommunitySession(c.RequestContext(), refreshToken, service.SessionIssueInput{
		UserAgent:   c.GetHeader("User-Agent"),
		IPAddress:   c.ClientIP(),
		ProductCode: productCode,
		ClientType:  clientType,
	})
	if err != nil {
		h.clearAuthCookies(c)
		h.writeError(c, err)
		return
	}
	h.setAuthCookies(c, tokens, &snapshot)
	result.OK(c, snapshot)
}

func (h *Handler) AccountSessions(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.ListAccountSessions(c.RequestContext(), principal)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) RevokeAccountSession(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("sessionId"), 10, 64)
	if err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	err = h.service.RevokeAccountSession(c.RequestContext(), principal, id)
	writeOK(c, map[string]any{"success": err == nil}, err, h.writeError)
}

func (h *Handler) AccountAvatarUpload(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	req := c.Request()
	if err := req.ParseMultipartForm(8 << 20); err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	file, header, err := req.FormFile("file")
	if err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	defer file.Close()
	item, err := h.service.UploadAccountAvatar(c.RequestContext(), principal, service.UploadSourceInput{
		Filename:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Size:        header.Size,
		Reader:      file,
	})
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) AccountAvatarDelete(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	item, err := h.service.DeleteAccountAvatar(c.RequestContext(), principal)
	writeOK(c, item, err, h.writeError)
}



func (h *Handler) Home(c ports.HTTPContext) {
	payload, err := h.service.GetHomePayload(c.RequestContext())
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) Categories(c ports.HTTPContext) {
	categories, err := h.service.ListCategories(c.RequestContext())
	writeOK(c, categories, err, h.writeError)
}

func (h *Handler) Dynamics(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityDynamics(c.RequestContext(), model.CommunityDynamicFilter{
		ClientID: queryValue(c, "clientId"),
		Limit:    limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) CreateDynamic(c ports.HTTPContext) {
	var req model.CreateCommunityDynamicRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCommunityDynamic(c.RequestContext(), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) CreateAccountDynamic(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.CreateCommunityAccountDynamicRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCommunityAccountDynamic(c.RequestContext(), principal, req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) UpdateDynamic(c ports.HTTPContext) {
	var req model.UpdateCommunityDynamicRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.UpdateCommunityDynamic(c.RequestContext(), c.Param("dynamicId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) UpdateAccountDynamic(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.UpdateCommunityDynamicRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.UpdateCommunityAccountDynamic(c.RequestContext(), principal, c.Param("dynamicId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) DeleteDynamic(c ports.HTTPContext) {
	payload, err := h.service.DeleteCommunityDynamic(c.RequestContext(), c.Param("dynamicId"), queryValue(c, "clientId"))
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) DeleteAccountDynamic(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.DeleteCommunityAccountDynamic(c.RequestContext(), principal, c.Param("dynamicId"))
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) Submissions(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunitySubmissions(c.RequestContext(), model.CommunitySubmissionFilter{
		ClientID: queryValue(c, "clientId"),
		Limit:    limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) CreateSubmission(c ports.HTTPContext) {
	var req model.CreateCommunitySubmissionRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCommunitySubmission(c.RequestContext(), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) ReviewSubmissions(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityReviewSubmissions(c.RequestContext(), model.CommunitySubmissionFilter{
		Status: queryValue(c, "status"),
		Limit:  limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) ReviewSubmission(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.ReviewCommunitySubmissionRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.ReviewCommunitySubmission(c.RequestContext(), principal, c.Param("submissionId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) UploadAccountSubmissionSource(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	req := c.Request()
	if err := req.ParseMultipartForm(64 << 20); err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	file, header, err := req.FormFile("file")
	if err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	defer file.Close()
	item, err := h.service.UploadCommunityAccountSubmissionSource(c.RequestContext(), principal, service.UploadSourceInput{
		Filename:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Size:        header.Size,
		Reader:      file,
	})
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) TranscodeSubmission(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.CreateCommunityVideoJobRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCommunitySubmissionTranscodeJob(c.RequestContext(), principal, c.Param("submissionId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) VideoJobs(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityVideoJobs(c.RequestContext(), model.CommunityVideoJobFilter{
		Status: queryValue(c, "status"),
		Limit:  limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) VideoJob(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	item, err := h.service.GetCommunityVideoJob(c.RequestContext(), c.Param("jobId"))
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) RetryVideoJob(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	item, err := h.service.RetryCommunityVideoJob(c.RequestContext(), principal, c.Param("jobId"))
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) VideoJobCallback(c ports.HTTPContext) {
	body, err := io.ReadAll(io.LimitReader(c.Request().Body, 1<<20))
	if err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return
	}
	item, err := h.service.HandleCommunityVideoJobCallback(c.RequestContext(), c.Param("jobId"), service.VideoJobCallbackInput{
		Timestamp: c.GetHeader("X-Community-Video-Timestamp"),
		Signature: c.GetHeader("X-Community-Video-Signature"),
		Body:      body,
	})
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) VideoAsset(c ports.HTTPContext) {
	asset, err := h.service.GetCommunityVideoAsset(c.RequestContext(), c.Param("assetPath"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Data(http.StatusOK, asset.ContentType, asset.Data)
}

func (h *Handler) SourceAsset(c ports.HTTPContext) {
	asset, err := h.service.GetCommunitySourceAsset(c.RequestContext(), c.Param("assetId"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Data(http.StatusOK, asset.ContentType, asset.Data)
}

func (h *Handler) Accounts(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityAccounts(c.RequestContext(), model.CommunityAccountFilter{
		Keyword: queryValue(c, "keyword"),
		Role:    queryValue(c, "role"),
		Status:  queryValue(c, "status"),
		Limit:   limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) UpdateAccount(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	var req model.UpdateCommunityAccountRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.UpdateCommunityAccount(c.RequestContext(), c.Param("accountId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) Reports(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityReports(c.RequestContext(), model.CommunityReportFilter{
		Status: queryValue(c, "status"),
		Limit:  limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) ReviewReport(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.ReviewCommunityReportRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.ReviewCommunityReport(c.RequestContext(), principal, c.Param("reportId"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) AccountSubmissions(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.ListCommunityAccountSubmissions(c.RequestContext(), principal, limit)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) CreateAccountSubmission(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.CreateCommunityAccountSubmissionRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCommunityAccountSubmission(c.RequestContext(), principal, req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) Videos(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.ListVideos(c.RequestContext(), model.VideoFilter{
		Category: queryValue(c, "category"),
		Cursor:   queryValue(c, "cursor"),
		Limit:    limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) VideoDetail(c ports.HTTPContext) {
	video, err := h.service.GetVideoDetail(c.RequestContext(), c.Param("idOrSlug"))
	writeOK(c, video, err, h.writeError)
}

func (h *Handler) VideoDanmaku(c ports.HTTPContext) {
	payload, err := h.service.GetVideoDanmaku(c.RequestContext(), c.Param("idOrSlug"))
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) CreateVideoDanmaku(c ports.HTTPContext) {
	var req model.CreateVideoDanmakuRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateVideoDanmaku(c.RequestContext(), c.Param("idOrSlug"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) CreateVideoReport(c ports.HTTPContext) {
	var req model.CreateVideoReportRequest
	if !bind(c, &req) {
		return
	}
	receipt, err := h.service.CreateVideoReport(c.RequestContext(), c.Param("idOrSlug"), req)
	writeOK(c, receipt, err, h.writeError)
}

func (h *Handler) VideoComments(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.GetVideoComments(c.RequestContext(), c.Param("idOrSlug"), model.VideoCommentFilter{
		ClientID: queryValue(c, "clientId"),
		Limit:    limit,
		Sort:     queryValue(c, "sort"),
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) CreateVideoComment(c ports.HTTPContext) {
	var req model.CreateVideoCommentRequest
	if !bind(c, &req) {
		return
	}
	comment, err := h.service.CreateVideoComment(c.RequestContext(), c.Param("idOrSlug"), req)
	writeOK(c, comment, err, h.writeError)
}

func (h *Handler) UpdateVideoComment(c ports.HTTPContext) {
	var req model.UpdateVideoCommentRequest
	if !bind(c, &req) {
		return
	}
	comment, err := h.service.UpdateVideoComment(c.RequestContext(), c.Param("idOrSlug"), c.Param("commentId"), req)
	writeOK(c, comment, err, h.writeError)
}

func (h *Handler) UpdateAccountVideoComment(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.UpdateVideoCommentRequest
	if !bind(c, &req) {
		return
	}
	comment, err := h.service.UpdateAccountVideoComment(c.RequestContext(), principal, c.Param("idOrSlug"), c.Param("commentId"), req)
	writeOK(c, comment, err, h.writeError)
}

func (h *Handler) DeleteVideoComment(c ports.HTTPContext) {
	payload, err := h.service.DeleteVideoComment(c.RequestContext(), c.Param("idOrSlug"), c.Param("commentId"), queryValue(c, "clientId"))
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) DeleteAccountVideoComment(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.DeleteAccountVideoComment(c.RequestContext(), principal, c.Param("idOrSlug"), c.Param("commentId"))
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) VideoInteractionState(c ports.HTTPContext) {
	state, err := h.service.GetVideoInteractionState(c.RequestContext(), c.Param("idOrSlug"), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) AccountVideoInteractionState(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.GetAccountVideoInteractionState(c.RequestContext(), principal, c.Param("idOrSlug"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) SetVideoInteraction(c ports.HTTPContext) {
	var req model.VideoInteractionRequest
	if !bind(c, &req) {
		return
	}
	state, err := h.service.SetVideoInteraction(c.RequestContext(), c.Param("idOrSlug"), c.Param("kind"), req)
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) SetAccountVideoInteraction(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.SetAccountVideoInteraction(c.RequestContext(), principal, c.Param("idOrSlug"), c.Param("kind"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) UnsetVideoInteraction(c ports.HTTPContext) {
	state, err := h.service.UnsetVideoInteraction(c.RequestContext(), c.Param("idOrSlug"), c.Param("kind"), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) UnsetAccountVideoInteraction(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.UnsetAccountVideoInteraction(c.RequestContext(), principal, c.Param("idOrSlug"), c.Param("kind"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) RecordHistory(c ports.HTTPContext) {
	var req model.VideoHistoryRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.RecordVideoHistory(c.RequestContext(), c.Param("idOrSlug"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) RecordAccountHistory(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.RecordAccountVideoHistoryRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.RecordAccountVideoHistory(c.RequestContext(), principal, c.Param("idOrSlug"), req)
	writeOK(c, item, err, h.writeError)
}

func (h *Handler) Search(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 24)
	if !ok {
		return
	}
	payload, err := h.service.Search(c.RequestContext(), queryValue(c, "q"), limit)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) Creator(c ports.HTTPContext) {
	profile, err := h.service.GetCreatorProfile(c.RequestContext(), c.Param("handle"))
	writeOK(c, profile, err, h.writeError)
}

func (h *Handler) CreatorFollowState(c ports.HTTPContext) {
	state, err := h.service.GetCreatorFollowState(c.RequestContext(), c.Param("handle"), model.CreatorFollowRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) FollowCreator(c ports.HTTPContext) {
	var req model.CreatorFollowRequest
	if !bind(c, &req) {
		return
	}
	state, err := h.service.FollowCreator(c.RequestContext(), c.Param("handle"), req)
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) UnfollowCreator(c ports.HTTPContext) {
	state, err := h.service.UnfollowCreator(c.RequestContext(), c.Param("handle"), model.CreatorFollowRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) Following(c ports.HTTPContext) {
	payload, err := h.service.FollowingFeed(c.RequestContext(), model.CreatorFollowRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) AccountCreatorFollowState(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.GetAccountCreatorFollowState(c.RequestContext(), principal, c.Param("handle"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) FollowAccountCreator(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.FollowAccountCreator(c.RequestContext(), principal, c.Param("handle"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) UnfollowAccountCreator(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	state, err := h.service.UnfollowAccountCreator(c.RequestContext(), principal, c.Param("handle"))
	writeOK(c, state, err, h.writeError)
}

func (h *Handler) AccountFollowing(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.AccountFollowingFeed(c.RequestContext(), principal)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) Library(c ports.HTTPContext) {
	payload, err := h.service.VideoLibrary(c.RequestContext(), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) AccountLibrary(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.AccountVideoLibrary(c.RequestContext(), principal)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) History(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.VideoHistory(c.RequestContext(), model.VideoHistoryFilter{
		ClientID: queryValue(c, "clientId"),
		Limit:    limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) AccountHistory(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.AccountVideoHistory(c.RequestContext(), principal, limit)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) ClearHistory(c ports.HTTPContext) {
	var req model.VideoHistoryClearRequest
	if !bind(c, &req) {
		return
	}
	payload, err := h.service.ClearVideoHistory(c.RequestContext(), req)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) ClearAccountHistory(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.ClearAccountVideoHistory(c.RequestContext(), principal)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) Notifications(c ports.HTTPContext) {
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.CommunityNotifications(c.RequestContext(), model.CommunityNotificationFilter{
		ClientID: queryValue(c, "clientId"),
		Limit:    limit,
	})
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) MarkNotificationsRead(c ports.HTTPContext) {
	var req model.CommunityNotificationRequest
	if !bind(c, &req) {
		return
	}
	payload, err := h.service.MarkCommunityNotificationsRead(c.RequestContext(), req)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) AccountNotifications(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	limit, ok := parseIntQuery(c, "limit", 48)
	if !ok {
		return
	}
	payload, err := h.service.CommunityAccountNotifications(c.RequestContext(), principal, limit)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) MarkAccountNotificationsRead(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	payload, err := h.service.MarkCommunityAccountNotificationsRead(c.RequestContext(), principal)
	writeOK(c, payload, err, h.writeError)
}

func (h *Handler) requestSessionContext(c ports.HTTPContext) (string, string) {
	productCode := strings.TrimSpace(c.GetHeader(h.config.ProductHeader))
	if productCode == "" {
		productCode = h.config.DefaultProduct
	}
	clientType := strings.TrimSpace(c.GetHeader(h.config.ClientTypeHeader))
	if clientType == "" {
		clientType = h.config.DefaultClient
	}
	return productCode, clientType
}

func (h *Handler) optionalPrincipal(c ports.HTTPContext) (authtypes.Principal, bool) {
	token := bearerToken(c.GetHeader("Authorization"))
	if token == "" {
		if cookieValue, err := c.Cookie(h.config.AccessCookieName()); err == nil {
			token = strings.TrimSpace(cookieValue)
		}
	}
	if token == "" {
		return authtypes.Principal{}, false
	}
	principal, err := h.service.AuthenticateToken(c.RequestContext(), token)
	if err != nil {
		h.clearAuthCookies(c)
		return authtypes.Principal{}, false
	}
	return principal, true
}

func bearerToken(header string) string {
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func (h *Handler) setAuthCookies(c ports.HTTPContext, tokens service.SessionTokens, snapshot *model.CommunityAuthSessionSnapshot) {
	h.setCookie(c, h.config.AccessCookieName(), tokens.AccessToken, tokens.AccessExpiresAt, true)
	h.setCookie(c, h.config.RefreshCookieName(), tokens.RefreshToken, tokens.RefreshExpiresAt, true)
	if h.config.CSRFEnabled {
		token := newCSRFToken()
		h.setCookie(c, h.config.CSRFCookieName, token, tokens.RefreshExpiresAt, false)
		if snapshot != nil {
			snapshot.CSRFToken = &token
		}
	}
}

func (h *Handler) ensureCSRFToken(c ports.HTTPContext, snapshot *model.CommunityAuthSessionSnapshot) {
	if !h.config.CSRFEnabled || snapshot == nil {
		return
	}
	if cookieValue, err := c.Cookie(h.config.CSRFCookieName); err == nil && strings.TrimSpace(cookieValue) != "" {
		token := strings.TrimSpace(cookieValue)
		snapshot.CSRFToken = &token
		return
	}
	token := newCSRFToken()
	expiresAt := time.Now().UTC().Add(15 * time.Minute)
	if snapshot.ExpiresAt != nil {
		expiresAt = *snapshot.ExpiresAt
	}
	h.setCookie(c, h.config.CSRFCookieName, token, expiresAt, false)
	snapshot.CSRFToken = &token
}

func (h *Handler) clearAuthCookies(c ports.HTTPContext) {
	expired := time.Unix(0, 0).UTC()
	h.setCookie(c, h.config.AccessCookieName(), "", expired, true)
	h.setCookie(c, h.config.RefreshCookieName(), "", expired, true)
	if h.config.CSRFEnabled {
		h.setCookie(c, h.config.CSRFCookieName, "", expired, false)
	}
}

func (h *Handler) setCookie(c ports.HTTPContext, name string, value string, expires time.Time, httpOnly bool) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     h.config.CookiePath,
		Domain:   strings.TrimSpace(h.config.CookieDomain),
		Expires:  expires,
		HttpOnly: httpOnly,
		Secure:   h.config.CookieSecure,
		SameSite: cookieSameSite(h.config.CookieSameSite),
	}
	if value == "" || expires.Before(time.Now()) {
		cookie.MaxAge = -1
	} else if seconds := int(time.Until(expires).Seconds()); seconds > 0 {
		cookie.MaxAge = seconds
	}
	c.SetCookie(cookie)
}

func cookieSameSite(value string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func newCSRFToken() string {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return base64.RawURLEncoding.EncodeToString(raw)
}

func (h *Handler) writeError(c ports.HTTPContext, err error) {
	switch {
	case errors.Is(err, context.Canceled):
		result.Fail(c, http.StatusRequestTimeout, "api.common.requestCanceled")
	case errors.Is(err, service.ErrInvalidInput):
		result.BadRequest(c, result.MessageKeyInvalidRequest)
	case errors.Is(err, service.ErrDuplicate):
		result.BadRequest(c, result.MessageKeyInvalidRequest)
	case errors.Is(err, service.ErrUnauthorized):
		result.Unauthorized(c, result.MessageKeyUnauthorized)
	case errors.Is(err, service.ErrForbidden):
		result.Forbidden(c, result.MessageKeyForbidden)
	case errors.Is(err, service.ErrCooldownActive):
		result.Fail(c, http.StatusTooManyRequests, "api.community.cooldownActive")
	case errors.Is(err, service.ErrDataInconsistent):
		result.InternalError(c, result.MessageKeyInternalError)
	case errors.Is(err, service.ErrNotFound):
		result.NotFound(c, result.MessageKeyNotFound)
	case errors.Is(err, service.ErrStorageUnavailable):
		result.Fail(c, http.StatusServiceUnavailable, "api.common.notReady")
	default:
		if h.logger != nil {
			h.logger.Error("community request failed", "error", err)
		}
		result.InternalError(c, result.MessageKeyInternalError)
	}
}

func requirePrincipal(c ports.HTTPContext) (authtypes.Principal, bool) {
	principal, ok := middleware.GetPrincipal(c)
	if !ok {
		result.Unauthorized(c, "api.auth.missingPrincipal")
		return authtypes.Principal{}, false
	}
	return principal, true
}

func queryValue(c ports.HTTPContext, key string) string {
	return strings.TrimSpace(c.Request().URL.Query().Get(key))
}

func parseIntQuery(c ports.HTTPContext, name string, fallback int) (int, bool) {
	raw := c.Request().URL.Query().Get(name)
	if raw == "" {
		return fallback, true
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		result.BadRequest(c, "validation.common.invalid", map[string]any{"field": name})
		return 0, false
	}
	return value, true
}

func bind(c ports.HTTPContext, dest any) bool {
	if err := c.BindJSON(dest); err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return false
	}
	return true
}

func writeOK(c ports.HTTPContext, data any, err error, writeError func(ports.HTTPContext, error)) {
	if err != nil {
		writeError(c, err)
		return
	}
	result.OK(c, data)
}

// ── Account Profile Handlers ───────────────────────────────────────────────

// AccountProfile handles GET /public/community/account/profile
func (h *Handler) AccountProfile(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	profile, err := h.service.GetCommunityAccountProfile(c.RequestContext(), principal)
	writeOK(c, profile, err, h.writeError)
}

// UpdateAccountProfile handles PATCH /public/community/account/profile
func (h *Handler) UpdateAccountProfile(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.UpdateAccountProfileRequest
	if !bind(c, &req) {
		return
	}
	profile, err := h.service.UpdateCommunityAccountProfile(c.RequestContext(), principal, req)
	writeOK(c, profile, err, h.writeError)
}

// UpdateAccountCreatorProfile handles PATCH /public/community/account/creator-profile
func (h *Handler) UpdateAccountCreatorProfile(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.UpdateAccountCreatorProfileRequest
	if !bind(c, &req) {
		return
	}
	profile, err := h.service.UpdateCommunityAccountCreatorProfile(c.RequestContext(), principal, req)
	writeOK(c, profile, err, h.writeError)
}

// ChangeAccountPassword handles POST /public/community/account/change-password
func (h *Handler) ChangeAccountPassword(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	var req model.ChangeAccountPasswordRequest
	if !bind(c, &req) {
		return
	}
	err := h.service.ChangeAccountPassword(c.RequestContext(), principal, req)
	if err != nil {
		h.writeError(c, err)
		return
	}
	result.OK(c, map[string]bool{"changed": true})
}

// AccountSubmission handles GET /public/community/account/submissions/:submissionId
func (h *Handler) AccountSubmission(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	item, err := h.service.GetCommunityAccountSubmission(c.RequestContext(), principal, c.Param("submissionId"))
	writeOK(c, item, err, h.writeError)
}

// AccountSubmissionDelete handles DELETE /public/community/account/submissions/:submissionId
func (h *Handler) AccountSubmissionDelete(c ports.HTTPContext) {
	principal, ok := requirePrincipal(c)
	if !ok {
		return
	}
	res, err := h.service.DeleteCommunityAccountSubmission(c.RequestContext(), principal, c.Param("submissionId"))
	writeOK(c, res, err, h.writeError)
}
