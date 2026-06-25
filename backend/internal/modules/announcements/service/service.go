package service

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/open-console/console-platform/internal/modules/announcements/model"
)

var (
	ErrInvalidInput       = errors.New("invalid announcement input")
	ErrNotFound           = errors.New("announcement not found")
	ErrStorageUnavailable = errors.New("announcement storage unavailable")
)

// Service 定义公告模块对 handler 暴露的应用层能力。
type Service interface {
	ArchiveAnnouncement(context.Context, int64) (*model.Announcement, error)
	CreateAnnouncement(context.Context, CreateAnnouncementInput) (*model.Announcement, error)
	DeleteAnnouncement(context.Context, int64) error
	FindAnnouncement(context.Context, int64) (*model.Announcement, error)
	FindPublishedAnnouncement(context.Context, int64) (*model.PublicAnnouncement, error)
	ListAnnouncements(context.Context, AnnouncementFilter) (model.AnnouncementPage, error)
	ListPublishedAnnouncements(context.Context, AnnouncementFilter) (model.PublicAnnouncementPage, error)
	PublishAnnouncement(context.Context, int64) (*model.Announcement, error)
	UpdateAnnouncement(context.Context, int64, UpdateAnnouncementInput) (*model.Announcement, error)
}

// Repository 是公告服务需要的最小持久化端口。
type Repository interface {
	CreateAnnouncement(context.Context, *model.Announcement) error
	DeleteAnnouncement(context.Context, int64, time.Time) error
	FindAnnouncementByID(context.Context, int64) (*model.Announcement, error)
	ListAnnouncements(context.Context, model.AnnouncementFilter) ([]model.Announcement, int64, error)
	SaveAnnouncement(context.Context, *model.Announcement) error
}

// IDGenerator 为公告生成平台内唯一 ID。
type IDGenerator interface {
	NextID() int64
}

type Config struct {
	Now func() time.Time
}

type Option func(*service)

type CreateAnnouncementInput struct {
	Content string
	Status  string
	Summary string
	Title   string
}

type UpdateAnnouncementInput struct {
	Content *string
	Status  *string
	Summary *string
	Title   *string
}

type AnnouncementFilter = model.AnnouncementFilter

type service struct {
	cfg  Config
	ids  IDGenerator
	repo Repository
}

func New(repo Repository, ids IDGenerator, cfg Config, options ...Option) Service {
	s := &service{cfg: cfg, ids: ids, repo: repo}
	for _, option := range options {
		option(s)
	}
	if s.ids == nil {
		s.ids = &sequentialIDGenerator{}
	}
	if s.cfg.Now == nil {
		s.cfg.Now = func() time.Time { return time.Now().UTC() }
	}
	return s
}

type sequentialIDGenerator struct {
	mu   sync.Mutex
	next int64
}

func (g *sequentialIDGenerator) NextID() int64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.next++
	return g.next
}

// ListAnnouncements 分页查询公告。仓储不可用时返回 ErrStorageUnavailable，由 handler 统一映射响应。
func (s *service) ListAnnouncements(ctx context.Context, input AnnouncementFilter) (model.AnnouncementPage, error) {
	page := normalizePage(input.Page)
	pageSize := normalizePageSize(input.PageSize)
	result := model.AnnouncementPage{Page: page, PageSize: pageSize, StorageStatus: "unavailable"}
	if s.repo == nil {
		return result, ErrStorageUnavailable
	}
	if input.StartCreatedAt != nil && input.EndCreatedAt != nil && !input.StartCreatedAt.Before(*input.EndCreatedAt) {
		return result, ErrInvalidInput
	}
	status, err := normalizeAnnouncementStatus(input.Status, true)
	if err != nil {
		return result, err
	}
	items, total, err := s.repo.ListAnnouncements(ctx, model.AnnouncementFilter{
		EndCreatedAt:   input.EndCreatedAt,
		Keyword:        strings.TrimSpace(input.Keyword),
		Page:           page,
		PageSize:       pageSize,
		StartCreatedAt: input.StartCreatedAt,
		Status:         status,
	})
	if err != nil {
		if isStorageUnavailable(err) {
			return result, ErrStorageUnavailable
		}
		return result, err
	}
	result.Items = items
	result.StorageStatus = "persisted"
	result.Total = total
	return result, nil
}

// ListPublishedAnnouncements 查询公开产品线入口可展示的已发布公告。
func (s *service) ListPublishedAnnouncements(ctx context.Context, input AnnouncementFilter) (model.PublicAnnouncementPage, error) {
	page := normalizePage(input.Page)
	pageSize := normalizePageSize(input.PageSize)
	result := model.PublicAnnouncementPage{Page: page, PageSize: pageSize, StorageStatus: "unavailable"}
	if s.repo == nil {
		return result, ErrStorageUnavailable
	}
	if input.StartCreatedAt != nil && input.EndCreatedAt != nil && !input.StartCreatedAt.Before(*input.EndCreatedAt) {
		return result, ErrInvalidInput
	}
	items, total, err := s.repo.ListAnnouncements(ctx, model.AnnouncementFilter{
		EndCreatedAt:   input.EndCreatedAt,
		Keyword:        strings.TrimSpace(input.Keyword),
		Page:           page,
		PageSize:       pageSize,
		StartCreatedAt: input.StartCreatedAt,
		Status:         model.AnnouncementStatusPublished,
	})
	if err != nil {
		if isStorageUnavailable(err) {
			return result, ErrStorageUnavailable
		}
		return result, err
	}
	result.Items = make([]model.PublicAnnouncement, 0, len(items))
	for _, item := range items {
		if item.Status == model.AnnouncementStatusPublished {
			result.Items = append(result.Items, model.ToPublicAnnouncement(item))
		}
	}
	result.StorageStatus = "persisted"
	result.Total = total
	return result, nil
}

func (s *service) CreateAnnouncement(ctx context.Context, input CreateAnnouncementInput) (*model.Announcement, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)
	if title == "" || content == "" {
		return nil, ErrInvalidInput
	}
	status, err := normalizeAnnouncementStatus(input.Status, false)
	if err != nil {
		return nil, err
	}
	now := s.now()
	announcement := &model.Announcement{
		ID:        s.ids.NextID(),
		Content:   content,
		CreatedAt: now,
		Summary:   strings.TrimSpace(input.Summary),
		Status:    status,
		Title:     title,
		UpdatedAt: now,
	}
	if status == model.AnnouncementStatusPublished {
		announcement.PublishedAt = &now
	}
	if err := s.repo.CreateAnnouncement(ctx, announcement); err != nil {
		if isStorageUnavailable(err) {
			return nil, ErrStorageUnavailable
		}
		return nil, err
	}
	return announcement, nil
}

func (s *service) FindAnnouncement(ctx context.Context, id int64) (*model.Announcement, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	announcement, err := s.repo.FindAnnouncementByID(ctx, id)
	if err != nil {
		return nil, mapLookupError(err)
	}
	return announcement, nil
}

// FindPublishedAnnouncement 查询公开可读公告详情。未发布内容按不存在处理，避免泄露后台状态。
func (s *service) FindPublishedAnnouncement(ctx context.Context, id int64) (*model.PublicAnnouncement, error) {
	announcement, err := s.FindAnnouncement(ctx, id)
	if err != nil {
		return nil, err
	}
	if announcement.Status != model.AnnouncementStatusPublished {
		return nil, ErrNotFound
	}
	public := model.ToPublicAnnouncement(*announcement)
	return &public, nil
}

func (s *service) UpdateAnnouncement(ctx context.Context, id int64, input UpdateAnnouncementInput) (*model.Announcement, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	announcement, err := s.repo.FindAnnouncementByID(ctx, id)
	if err != nil {
		return nil, mapLookupError(err)
	}
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			return nil, ErrInvalidInput
		}
		announcement.Title = title
	}
	if input.Content != nil {
		content := strings.TrimSpace(*input.Content)
		if content == "" {
			return nil, ErrInvalidInput
		}
		announcement.Content = content
	}
	if input.Summary != nil {
		announcement.Summary = strings.TrimSpace(*input.Summary)
	}
	if input.Status != nil {
		now := s.now()
		if err := applyStatus(announcement, *input.Status, now); err != nil {
			return nil, err
		}
		announcement.UpdatedAt = now
	} else {
		announcement.UpdatedAt = s.now()
	}
	if err := s.repo.SaveAnnouncement(ctx, announcement); err != nil {
		if isStorageUnavailable(err) {
			return nil, ErrStorageUnavailable
		}
		return nil, err
	}
	return announcement, nil
}

func (s *service) PublishAnnouncement(ctx context.Context, id int64) (*model.Announcement, error) {
	return s.changeAnnouncementStatus(ctx, id, model.AnnouncementStatusPublished)
}

func (s *service) ArchiveAnnouncement(ctx context.Context, id int64) (*model.Announcement, error) {
	return s.changeAnnouncementStatus(ctx, id, model.AnnouncementStatusArchived)
}

func (s *service) DeleteAnnouncement(ctx context.Context, id int64) error {
	if s.repo == nil {
		return ErrStorageUnavailable
	}
	if _, err := s.repo.FindAnnouncementByID(ctx, id); err != nil {
		return mapLookupError(err)
	}
	if err := s.repo.DeleteAnnouncement(ctx, id, s.now()); err != nil {
		if isStorageUnavailable(err) {
			return ErrStorageUnavailable
		}
		return err
	}
	return nil
}

func (s *service) changeAnnouncementStatus(ctx context.Context, id int64, status string) (*model.Announcement, error) {
	if s.repo == nil {
		return nil, ErrStorageUnavailable
	}
	announcement, err := s.repo.FindAnnouncementByID(ctx, id)
	if err != nil {
		return nil, mapLookupError(err)
	}
	now := s.now()
	if err := applyStatus(announcement, status, now); err != nil {
		return nil, err
	}
	announcement.UpdatedAt = now
	if err := s.repo.SaveAnnouncement(ctx, announcement); err != nil {
		if isStorageUnavailable(err) {
			return nil, ErrStorageUnavailable
		}
		return nil, err
	}
	return announcement, nil
}

func applyStatus(announcement *model.Announcement, value string, now time.Time) error {
	status, err := normalizeAnnouncementStatus(value, false)
	if err != nil {
		return err
	}
	announcement.Status = status
	switch status {
	case model.AnnouncementStatusPublished:
		if announcement.PublishedAt == nil {
			publishedAt := now
			announcement.PublishedAt = &publishedAt
		}
		announcement.ArchivedAt = nil
	case model.AnnouncementStatusArchived:
		archivedAt := now
		announcement.ArchivedAt = &archivedAt
	case model.AnnouncementStatusDraft:
		announcement.PublishedAt = nil
		announcement.ArchivedAt = nil
	}
	return nil
}

func normalizeAnnouncementStatus(value string, allowEmpty bool) (string, error) {
	status := strings.ToLower(strings.TrimSpace(value))
	if status == "" {
		if allowEmpty {
			return "", nil
		}
		return model.AnnouncementStatusDraft, nil
	}
	switch status {
	case model.AnnouncementStatusDraft, model.AnnouncementStatusPublished, model.AnnouncementStatusArchived:
		return status, nil
	default:
		return "", ErrInvalidInput
	}
}

func (s *service) now() time.Time {
	return s.cfg.Now().UTC()
}

func mapLookupError(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return ErrNotFound
	case isStorageUnavailable(err):
		return ErrStorageUnavailable
	default:
		return err
	}
}

func isStorageUnavailable(err error) bool {
	return errors.Is(err, ErrStorageUnavailable)
}

func normalizePage(value int) int {
	if value < 1 {
		return 1
	}
	return value
}

func normalizePageSize(value int) int {
	if value < 1 {
		return 10
	}
	if value > 100 {
		return 100
	}
	return value
}
