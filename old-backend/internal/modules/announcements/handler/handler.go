package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/open-console/console-platform/internal/middleware"
	"github.com/open-console/console-platform/internal/modules/announcements/service"
	"github.com/open-console/console-platform/internal/ports"
	authtypes "github.com/open-console/console-platform/types/auth"
	"github.com/open-console/console-platform/types/result"
)

// Handler 是公告模块的 HTTP 适配器。
type Handler struct {
	logger  ports.Logger
	service service.Service
}

type CreateAnnouncementRequest struct {
	Content string `json:"content" binding:"required"`
	Status  string `json:"status"`
	Summary string `json:"summary"`
	Title   string `json:"title" binding:"required"`
}

type UpdateAnnouncementRequest struct {
	Content *string `json:"content"`
	Status  *string `json:"status"`
	Summary *string `json:"summary"`
	Title   *string `json:"title"`
}

func New(service service.Service, logger ports.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) ListAnnouncements(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	filter, ok := parseAnnouncementFilter(c)
	if !ok {
		return
	}
	pageResult, err := h.service.ListAnnouncements(c.RequestContext(), filter)
	writeOK(c, pageResult, err, h.writeError)
}

func (h *Handler) ListPublicAnnouncements(c ports.HTTPContext) {
	filter, ok := parseAnnouncementFilter(c)
	if !ok {
		return
	}
	pageResult, err := h.service.ListPublishedAnnouncements(c.RequestContext(), filter)
	writeOK(c, pageResult, err, h.writeError)
}

func (h *Handler) GetPublicAnnouncement(c ports.HTTPContext) {
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	announcement, err := h.service.FindPublishedAnnouncement(c.RequestContext(), id)
	writeOK(c, announcement, err, h.writeError)
}

func parseAnnouncementFilter(c ports.HTTPContext) (service.AnnouncementFilter, bool) {
	values := c.Request().URL.Query()
	page, ok := parseIntQuery(c, "page", 1)
	if !ok {
		return service.AnnouncementFilter{}, false
	}
	pageSize, ok := parseIntQuery(c, "pageSize", 10)
	if !ok {
		return service.AnnouncementFilter{}, false
	}
	startCreatedAt, ok := parseTimeQuery(c, "startCreatedAt", false)
	if !ok {
		return service.AnnouncementFilter{}, false
	}
	endCreatedAt, ok := parseTimeQuery(c, "endCreatedAt", true)
	if !ok {
		return service.AnnouncementFilter{}, false
	}
	return service.AnnouncementFilter{
		EndCreatedAt:   endCreatedAt,
		Keyword:        values.Get("keyword"),
		Page:           page,
		PageSize:       pageSize,
		StartCreatedAt: startCreatedAt,
		Status:         values.Get("status"),
	}, true
}

func (h *Handler) CreateAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	var req CreateAnnouncementRequest
	if !bind(c, &req) {
		return
	}
	announcement, err := h.service.CreateAnnouncement(c.RequestContext(), service.CreateAnnouncementInput{
		Content: req.Content,
		Status:  req.Status,
		Summary: req.Summary,
		Title:   req.Title,
	})
	writeCreated(c, announcement, err, h.writeError)
}

func (h *Handler) GetAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	announcement, err := h.service.FindAnnouncement(c.RequestContext(), id)
	writeOK(c, announcement, err, h.writeError)
}

func (h *Handler) UpdateAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	var req UpdateAnnouncementRequest
	if !bind(c, &req) {
		return
	}
	announcement, err := h.service.UpdateAnnouncement(c.RequestContext(), id, service.UpdateAnnouncementInput{
		Content: req.Content,
		Status:  req.Status,
		Summary: req.Summary,
		Title:   req.Title,
	})
	writeOK(c, announcement, err, h.writeError)
}

func (h *Handler) PublishAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	announcement, err := h.service.PublishAnnouncement(c.RequestContext(), id)
	writeOK(c, announcement, err, h.writeError)
}

func (h *Handler) ArchiveAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	announcement, err := h.service.ArchiveAnnouncement(c.RequestContext(), id)
	writeOK(c, announcement, err, h.writeError)
}

func (h *Handler) DeleteAnnouncement(c ports.HTTPContext) {
	if _, ok := requirePrincipal(c); !ok {
		return
	}
	id, ok := parseInt64Param(c, "announcementId")
	if !ok {
		return
	}
	writeOK(c, map[string]bool{"deleted": true}, h.service.DeleteAnnouncement(c.RequestContext(), id), h.writeError)
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
			h.logger.Error("announcement request failed", "error", err)
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

func bind(c ports.HTTPContext, dest any) bool {
	if err := c.BindJSON(dest); err != nil {
		result.BadRequest(c, result.MessageKeyInvalidRequest)
		return false
	}
	return true
}

func parseInt64Param(c ports.HTTPContext, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id <= 0 {
		result.BadRequest(c, "validation.common.invalid", map[string]any{"field": name})
		return 0, false
	}
	return id, true
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

func parseTimeQuery(c ports.HTTPContext, name string, endOfDay bool) (*time.Time, bool) {
	raw := c.Request().URL.Query().Get(name)
	if raw == "" {
		return nil, true
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		parsed, err = time.Parse("2006-01-02", raw)
		if err != nil {
			result.BadRequest(c, "validation.common.invalid", map[string]any{"field": name})
			return nil, false
		}
		if endOfDay {
			parsed = parsed.Add(24 * time.Hour)
		}
	}
	parsed = parsed.UTC()
	return &parsed, true
}

func writeOK(c ports.HTTPContext, data any, err error, writeError func(ports.HTTPContext, error)) {
	if err != nil {
		writeError(c, err)
		return
	}
	result.OK(c, data)
}

func writeCreated(c ports.HTTPContext, data any, err error, writeError func(ports.HTTPContext, error)) {
	if err != nil {
		writeError(c, err)
		return
	}
	result.Created(c, data)
}
