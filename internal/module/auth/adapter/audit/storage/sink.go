// Package auditstorage 把 Auth module 审计事件写入持久化低敏存储，
// 并提供只读查询视图。
package auditstorage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/module/auth/repo"
	"github.com/rin721/go-scaffold-template/internal/module/auth/service"
	"github.com/rin721/go-scaffold-template/pkg/clock"
)

// Sink 是持久化 AuditSink：只保存脱敏字段，查询接口返回同一视图。
type Sink struct {
	store *repo.Store
	clock clock.Clock
	// maxRecords 是受控保留上限（决策 4 首版：配置 + 显式上限，不自动归档）。
	maxRecords int64
}

// New 创建持久化审计 Sink；maxRecords<=0 表示不限制。
func New(store *repo.Store, currentClock clock.Clock, maxRecords int64) (*Sink, error) {
	if store == nil || currentClock == nil {
		return nil, fmt.Errorf("auth audit storage or clock is nil")
	}
	if maxRecords < 0 {
		return nil, fmt.Errorf("auth audit max records is invalid")
	}
	return &Sink{store: store, clock: currentClock, maxRecords: maxRecords}, nil
}

// Record 写入低敏审计事件；ctx 取消/超时被保留并优先返回。
func (s *Sink) Record(ctx context.Context, event authmodel.AuditEvent) error {
	if ctx == nil {
		return fmt.Errorf("auth audit storage context is nil")
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if event.Operation == "" && event.Action == "" || event.Outcome == "" {
		return fmt.Errorf("auth audit event is incomplete")
	}
	record := repo.AuditEventRecord{
		OccurredAt:    nowOrClock(s.clock, event),
		CorrelationID: correlationID(ctx, event.CorrelationID),
		Operation:     event.Operation,
		Action:        string(event.Action),
		ActorKind:     string(event.Principal.Kind),
		SubjectHash:   digest(event.Principal.Subject),
		ResourceType:  event.Resource.Type,
		ResourceHash:  digest(event.Resource.ID),
		Decision:      string(event.Decision.Reason),
		Outcome:       string(event.Outcome),
	}
	err := s.store.WithinTx(ctx, func(txCtx context.Context, unit *repo.Unit) error {
		if err := unit.CreateAuditEvent(txCtx, &record); err != nil {
			return err
		}
		if s.maxRecords > 0 {
			return s.trimToLimit(txCtx, unit)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("persist auth audit event: %w", err)
	}
	return nil
}

// trimToLimit 在写入后达到保留上限时删除最旧事件，保证表大小不超过上限；
// 首版不提供归档/导出语义（决策 4）。
func (s *Sink) trimToLimit(ctx context.Context, unit *repo.Unit) error {
	total, err := unit.CountAuditEvents(ctx, repo.AuditFilter{})
	if err != nil {
		return err
	}
	if total <= s.maxRecords {
		return nil
	}
	excess := total - s.maxRecords
	if excess < 1 {
		excess = 1
	}
	return unit.DeleteOldestAuditEvents(ctx, excess)
}

// List 返回低敏事件视图的只读分页查询。
func (s *Sink) List(ctx context.Context, filter service.AuditQueryFilter, offset, limit int) (service.AuditQueryResult, error) {
	if ctx == nil {
		return service.AuditQueryResult{}, fmt.Errorf("auth audit query context is nil")
	}
	if err := ctx.Err(); err != nil {
		return service.AuditQueryResult{}, err
	}
	repoFilter := repo.AuditFilter{
		CorrelationID: filter.CorrelationID, Operation: filter.Operation, Action: filter.Action, Outcome: filter.Outcome, ActorKind: filter.ActorKind,
		SubjectHash: filter.SubjectHash, ResourceType: filter.ResourceType, Since: filter.Since, Until: filter.Until,
	}
	var total int64
	var records []repo.AuditEventRecord
	err := s.store.Use(ctx, func(unit *repo.Unit) error {
		var listErr error
		total, listErr = unit.CountAuditEvents(ctx, repoFilter)
		if listErr != nil {
			return listErr
		}
		records, listErr = unit.ListAuditEvents(ctx, repoFilter, offset, limit)
		return listErr
	})
	if err != nil {
		return service.AuditQueryResult{}, err
	}
	items := make([]service.AuditEventView, len(records))
	for index, record := range records {
		items[index] = service.AuditEventView{
			EventID: record.ID, CorrelationID: record.CorrelationID,
			Operation: record.Operation, Action: modelAction(record.Action),
			ActorKind: modelActorKind(record.ActorKind), SubjectHash: record.SubjectHash,
			ResourceType: record.ResourceType, ResourceHash: record.ResourceHash,
			Decision: modelDecisionReason(record.Decision), Outcome: modelAuditOutcome(record.Outcome),
			OccurredAt: record.OccurredAt,
		}
	}
	return service.AuditQueryResult{Items: items, Offset: offset, Limit: limit, Total: total}, nil
}

func correlationID(ctx context.Context, explicit string) string {
	if explicit != "" {
		return explicit
	}
	if value, ok := authmodel.CorrelationIDFromContext(ctx); ok {
		return value
	}
	return ""
}

func nowOrClock(currentClock clock.Clock, event authmodel.AuditEvent) time.Time {
	if !event.Principal.AuthenticatedAt.IsZero() {
		// 事件时间以写入时刻为准，保证检索按真实发生顺序稳定。
		_ = event
	}
	return currentClock.Now().UTC()
}

func modelAction(value string) authmodel.Action { return authmodel.Action(value) }
func modelActorKind(value string) authmodel.ActorKind {
	switch value {
	case string(authmodel.ActorService):
		return authmodel.ActorService
	case string(authmodel.ActorCLI):
		return authmodel.ActorCLI
	case string(authmodel.ActorDevelopment):
		return authmodel.ActorDevelopment
	}
	return authmodel.ActorKind(value)
}
func modelDecisionReason(value string) authmodel.DecisionReason {
	switch value {
	case string(authmodel.ReasonAllowed):
		return authmodel.ReasonAllowed
	case string(authmodel.ReasonPublic):
		return authmodel.ReasonPublic
	case string(authmodel.ReasonUnauthenticated):
		return authmodel.ReasonUnauthenticated
	case string(authmodel.ReasonMissingPolicy):
		return authmodel.ReasonMissingPolicy
	case string(authmodel.ReasonMissingScope):
		return authmodel.ReasonMissingScope
	case string(authmodel.ReasonRBACDenied):
		return authmodel.ReasonRBACDenied
	case string(authmodel.ReasonOwnerMismatch):
		return authmodel.ReasonOwnerMismatch
	}
	return authmodel.DecisionReason(value)
}
func modelAuditOutcome(value string) authmodel.AuditOutcome {
	switch value {
	case string(authmodel.AuditSucceeded):
		return authmodel.AuditSucceeded
	case string(authmodel.AuditDenied):
		return authmodel.AuditDenied
	case string(authmodel.AuditFailed):
		return authmodel.AuditFailed
	}
	return authmodel.AuditOutcome(value)
}

func digest(value string) string {
	safe := strings.TrimSpace(value)
	if safe == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(safe))
	return hex.EncodeToString(sum[:8])
}

var _ service.AuditSink = (*Sink)(nil)
