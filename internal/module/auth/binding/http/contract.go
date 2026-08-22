// Package httpbinding 通过项目 HTTP 边界发布 Auth 低敏审计查询能力。
package httpbinding

import (
	"errors"
	"net/http"
	"time"

	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	authservice "github.com/rin721/go-scaffold-template/internal/module/auth/service"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

const (
	// opAuditList 是审计只读查询的 operation ID。
	opAuditList = "auth.audit.list"
)

// Handler 是 Auth 审计查询的 typed HTTP handler。
type Handler struct {
	service *authservice.Service
}

func NewHandler(authService *authservice.Service) (*Handler, error) {
	if authService == nil {
		return nil, errors.New("auth HTTP service is nil")
	}
	return &Handler{service: authService}, nil
}

// auditEventViewResponse 是低敏审计事件视图；subject/resource 只暴露摘要。
type auditEventViewResponse struct {
	Operation    string               `json:"operation,omitempty"`
	Action       string               `json:"action,omitempty"`
	ActorKind    string               `json:"actorKind,omitempty"`
	SubjectHash  string               `json:"subjectHash,omitempty"`
	ResourceType string               `json:"resourceType,omitempty"`
	ResourceHash string               `json:"resourceHash,omitempty"`
	Decision     authmodel.DecisionReason `json:"decision"`
	Outcome      authmodel.AuditOutcome  `json:"outcome"`
	OccurredAt   time.Time            `json:"occurredAt"`
}

type auditEventListResponse struct {
	Items  []auditEventViewResponse `json:"items"`
	Offset int                      `json:"offset"`
	Limit  int                      `json:"limit"`
	Total  int64                    `json:"total"`
}

type auditListInput struct {
	Offset     int    `query:"offset" minimum:"0" default:"0"`
	Limit      int    `query:"limit" minimum:"1" maximum:"100" default:"20"`
	Operation  string `query:"operation"`
	Outcome    string `query:"outcome"`
	ActorKind  string `query:"actorKind"`
	SubjectHash string `query:"subjectHash"`
	Since      string `query:"since"`
	Until      string `query:"until"`
}

func serviceError(err error) error {
	return &httpx.StatusError{StatusCode: http.StatusInternalServerError, Code: "internal_server_error", Message: "internal_server_error", Err: err}
}

func parseOptionalTime(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, httpx.NewProtocolProblemError(nil, &httpx.StatusError{StatusCode: http.StatusBadRequest, Code: "invalid_argument", Message: "invalid_argument", Err: err})
	}
	return &parsed, nil
}

func (handler *Handler) queryFilter(input *auditListInput) (authservice.AuditQueryFilter, error) {
	var filter authservice.AuditQueryFilter
	filter.Operation = input.Operation
	filter.Outcome = input.Outcome
	filter.ActorKind = input.ActorKind
	filter.SubjectHash = input.SubjectHash
	since, err := parseOptionalTime(input.Since)
	if err != nil {
		return authservice.AuditQueryFilter{}, err
	}
	until, err := parseOptionalTime(input.Until)
	if err != nil {
		return authservice.AuditQueryFilter{}, err
	}
	filter.Since = since
	filter.Until = until
	return filter, nil
}