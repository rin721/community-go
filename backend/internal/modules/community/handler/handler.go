package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/open-console/console-platform/internal/modules/community/model"
	"github.com/open-console/console-platform/internal/modules/community/service"
	"github.com/open-console/console-platform/internal/ports"
	"github.com/open-console/console-platform/types/result"
)

// Handler 是视频社区公开 API 的 HTTP 适配器。
type Handler struct {
	logger  ports.Logger
	service service.Service
}

func New(service service.Service, logger ports.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Status(c ports.HTTPContext) {
	result.OK(c, h.service.CommunityStatus(c.RequestContext()))
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
		Limit: limit,
		Sort:  queryValue(c, "sort"),
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

func (h *Handler) VideoInteractionState(c ports.HTTPContext) {
	state, err := h.service.GetVideoInteractionState(c.RequestContext(), c.Param("idOrSlug"), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
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

func (h *Handler) UnsetVideoInteraction(c ports.HTTPContext) {
	state, err := h.service.UnsetVideoInteraction(c.RequestContext(), c.Param("idOrSlug"), c.Param("kind"), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
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

func (h *Handler) Library(c ports.HTTPContext) {
	payload, err := h.service.VideoLibrary(c.RequestContext(), model.VideoInteractionRequest{
		ClientID: queryValue(c, "clientId"),
	})
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

func (h *Handler) ClearHistory(c ports.HTTPContext) {
	var req model.VideoHistoryClearRequest
	if !bind(c, &req) {
		return
	}
	payload, err := h.service.ClearVideoHistory(c.RequestContext(), req)
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

func (h *Handler) writeError(c ports.HTTPContext, err error) {
	switch {
	case errors.Is(err, context.Canceled):
		result.Fail(c, http.StatusRequestTimeout, "api.common.requestCanceled")
	case errors.Is(err, service.ErrInvalidInput):
		result.BadRequest(c, result.MessageKeyInvalidRequest)
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
