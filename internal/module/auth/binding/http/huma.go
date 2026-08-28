package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	authservice "github.com/rin721/go-scaffold-template/internal/module/auth/service"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

// auditListOutput 是审计查询的 HTTP 响应 envelope。
type auditListOutput struct {
	CacheControl string `header:"Cache-Control"`
	Body         auditEventListResponse
}

type auditDetailOutput struct {
	CacheControl string `header:"Cache-Control"`
	Body         auditEventViewResponse
}

func auditEventResponse(item authservice.AuditEventView) auditEventViewResponse {
	return auditEventViewResponse{
		EventID: item.EventID, CorrelationID: item.CorrelationID,
		Operation: item.Operation, Action: string(item.Action), ActorKind: string(item.ActorKind),
		SubjectHash: item.SubjectHash, ResourceType: item.ResourceType, ResourceHash: item.ResourceHash,
		Decision: item.Decision, Outcome: item.Outcome, OccurredAt: item.OccurredAt,
	}
}

// RegisterHuma 注册 Auth 低敏审计查询的 typed HTTP 契约。
func RegisterHuma(api huma.API, handler *Handler) {
	operation := humabinding.JSONDefinition(huma.Operation{
		OperationID: opAuditList, Method: http.MethodGet, Path: "/api/v1/auth/audit",
		Tags: []string{"Auth"},
	}, humabinding.Definition{
		ID: opAuditList, Method: http.MethodGet, Path: "/api/v1/auth/audit",
		Security: humabinding.SecurityWebUISession, Policy: humabinding.PolicyProtected,
		Scope: string(authmodel.ScopeAuditRead), Action: "list",
	})
	huma.Register(api, operation, func(ctx context.Context, in *auditListInput) (*auditListOutput, error) {
		filter, err := handler.queryFilter(in)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, err)
		}
		result, err := handler.service.ListAuditEvents(ctx, filter, in.Offset, in.Limit)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, serviceError(err))
		}
		items := make([]auditEventViewResponse, len(result.Items))
		for index, item := range result.Items {
			items[index] = auditEventResponse(item)
		}
		return &auditListOutput{
			CacheControl: "no-store",
			Body:         auditEventListResponse{Items: items, Offset: result.Offset, Limit: result.Limit, Total: result.Total},
		}, nil
	})

	detail := humabinding.JSONDefinition(huma.Operation{
		OperationID: opAuditRead, Method: http.MethodGet, Path: "/api/v1/auth/audit/{eventId}", Tags: []string{"Auth"},
	}, humabinding.Definition{
		ID: opAuditRead, Method: http.MethodGet, Path: "/api/v1/auth/audit/{eventId}",
		Security: humabinding.SecurityWebUISession, Policy: humabinding.PolicyProtected,
		Scope: string(authmodel.ScopeAuditRead), Action: "read",
	})
	huma.Register(api, detail, func(ctx context.Context, in *auditReadInput) (*auditDetailOutput, error) {
		item, err := handler.service.AuditEvent(ctx, in.EventID)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, serviceError(err))
		}
		return &auditDetailOutput{CacheControl: "no-store", Body: auditEventResponse(item)}, nil
	})
}

func HumaRegistration(handler *Handler) humabinding.Registration {
	return func(api huma.API) { RegisterHuma(api, handler) }
}
