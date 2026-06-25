package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/modules/announcements/model"
	announcementservice "github.com/open-console/console-platform/internal/modules/announcements/service"
	database "github.com/open-console/console-platform/internal/ports"
)

type Repository = announcementservice.Repository

type repository struct {
	db database.Executor
}

func New(db database.Executor) Repository {
	return &repository{db: storageAwareExecutor{inner: db}}
}

type storageAwareExecutor struct {
	inner database.Executor
}

func (e storageAwareExecutor) Create(ctx context.Context, value any) error {
	return mapStorageError(e.inner.Create(ctx, value))
}

func (e storageAwareExecutor) Save(ctx context.Context, value any) error {
	return mapStorageError(e.inner.Save(ctx, value))
}

func (e storageAwareExecutor) First(ctx context.Context, dest any, opts ...database.QueryOption) error {
	return mapStorageError(e.inner.First(ctx, dest, opts...))
}

func (e storageAwareExecutor) Find(ctx context.Context, dest any, opts ...database.QueryOption) error {
	return mapStorageError(e.inner.Find(ctx, dest, opts...))
}

func (e storageAwareExecutor) Update(ctx context.Context, model any, values map[string]any, opts ...database.QueryOption) (database.Result, error) {
	result, err := e.inner.Update(ctx, model, values, opts...)
	return result, mapStorageError(err)
}

func (e storageAwareExecutor) Delete(ctx context.Context, model any, opts ...database.QueryOption) (database.Result, error) {
	result, err := e.inner.Delete(ctx, model, opts...)
	return result, mapStorageError(err)
}

func (e storageAwareExecutor) Exec(ctx context.Context, sql string, args ...any) (database.Result, error) {
	result, err := e.inner.Exec(ctx, sql, args...)
	return result, mapStorageError(err)
}

func (e storageAwareExecutor) Raw(ctx context.Context, dest any, sql string, args ...any) (database.Result, error) {
	result, err := e.inner.Raw(ctx, dest, sql, args...)
	return result, mapStorageError(err)
}

func (e storageAwareExecutor) Count(ctx context.Context, model any, opts ...database.QueryOption) (int64, error) {
	count, err := e.inner.Count(ctx, model, opts...)
	return count, mapStorageError(err)
}

func (e storageAwareExecutor) HasTable(ctx context.Context, model any) (bool, error) {
	ok, err := e.inner.HasTable(ctx, model)
	return ok, mapStorageError(err)
}

func (r *repository) CreateAnnouncement(ctx context.Context, announcement *model.Announcement) error {
	return r.db.Create(ctx, announcement)
}

func (r *repository) FindAnnouncementByID(ctx context.Context, id int64) (*model.Announcement, error) {
	var announcement model.Announcement
	if err := r.db.First(ctx, &announcement, database.Where("id = ?", id), alive()); err != nil {
		return nil, err
	}
	return &announcement, nil
}

func (r *repository) ListAnnouncements(ctx context.Context, filter model.AnnouncementFilter) ([]model.Announcement, int64, error) {
	opts := announcementOptions(filter)
	total, err := r.db.Count(ctx, &model.Announcement{}, opts...)
	if err != nil {
		return nil, 0, err
	}
	page := filter.Page
	pageSize := filter.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	opts = append(opts,
		database.Order("created_at DESC, id DESC"),
		database.Limit(pageSize),
		database.Offset((page-1)*pageSize),
	)
	var announcements []model.Announcement
	err = r.db.Find(ctx, &announcements, opts...)
	return announcements, total, err
}

func (r *repository) SaveAnnouncement(ctx context.Context, announcement *model.Announcement) error {
	return r.db.Save(ctx, announcement)
}

func (r *repository) DeleteAnnouncement(ctx context.Context, id int64, deletedAt time.Time) error {
	_, err := r.db.Update(ctx, &model.Announcement{}, map[string]any{
		"deleted_at": deletedAt,
		"updated_at": deletedAt,
	}, database.Where("id = ?", id), alive())
	return err
}

func alive() database.QueryOption {
	return database.Where("deleted_at IS NULL")
}

func announcementOptions(filter model.AnnouncementFilter) []database.QueryOption {
	opts := []database.QueryOption{alive()}
	if status := strings.TrimSpace(filter.Status); status != "" {
		opts = append(opts, database.Where("status = ?", strings.ToLower(status)))
	}
	if keyword := strings.TrimSpace(filter.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		opts = append(opts, database.Where("(title LIKE ? OR summary LIKE ? OR content LIKE ?)", like, like, like))
	}
	if filter.StartCreatedAt != nil {
		opts = append(opts, database.Where("created_at >= ?", *filter.StartCreatedAt))
	}
	if filter.EndCreatedAt != nil {
		opts = append(opts, database.Where("created_at < ?", *filter.EndCreatedAt))
	}
	return opts
}

func mapStorageError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, database.ErrNotFound) {
		return announcementservice.ErrNotFound
	}
	if errors.Is(err, announcementservice.ErrStorageUnavailable) {
		return err
	}
	if isStorageUnavailable(err) {
		return fmt.Errorf("%w: %v", announcementservice.ErrStorageUnavailable, err)
	}
	return err
}

func isStorageUnavailable(err error) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "no such table") ||
		strings.Contains(text, "doesn't exist") ||
		strings.Contains(text, "undefined_table") ||
		strings.Contains(text, "unknown table")
}
