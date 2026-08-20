package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/modules/announcements/model"
)

func TestCreateAnnouncementPublishesWhenRequested(t *testing.T) {
	now := time.Date(2026, 6, 22, 10, 0, 0, 0, time.UTC)
	repo := newMemoryRepo()
	svc := New(repo, fixedIDs{next: 100}, Config{Now: func() time.Time { return now }})

	announcement, err := svc.CreateAnnouncement(context.Background(), CreateAnnouncementInput{
		Content: "发布内容",
		Status:  model.AnnouncementStatusPublished,
		Summary: "摘要",
		Title:   "平台公告",
	})
	if err != nil {
		t.Fatalf("CreateAnnouncement() error = %v", err)
	}
	if announcement.ID != 101 || announcement.Status != model.AnnouncementStatusPublished {
		t.Fatalf("unexpected announcement: %#v", announcement)
	}
	if announcement.PublishedAt == nil || !announcement.PublishedAt.Equal(now) {
		t.Fatalf("PublishedAt = %#v, want %v", announcement.PublishedAt, now)
	}
	if len(repo.items) != 1 {
		t.Fatalf("repo items = %d, want 1", len(repo.items))
	}
}

func TestUpdateAnnouncementRejectsInvalidStatus(t *testing.T) {
	repo := newMemoryRepo()
	svc := New(repo, fixedIDs{}, Config{Now: func() time.Time { return time.Now().UTC() }})
	created, err := svc.CreateAnnouncement(context.Background(), CreateAnnouncementInput{Title: "标题", Content: "内容"})
	if err != nil {
		t.Fatalf("CreateAnnouncement() error = %v", err)
	}
	invalid := "online"
	if _, err := svc.UpdateAnnouncement(context.Background(), created.ID, UpdateAnnouncementInput{Status: &invalid}); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("UpdateAnnouncement() error = %v, want ErrInvalidInput", err)
	}
}

func TestPublishAndArchiveAnnouncement(t *testing.T) {
	current := time.Date(2026, 6, 22, 10, 0, 0, 0, time.UTC)
	repo := newMemoryRepo()
	svc := New(repo, nil, Config{Now: func() time.Time { return current }})
	created, err := svc.CreateAnnouncement(context.Background(), CreateAnnouncementInput{Title: "标题", Content: "内容"})
	if err != nil {
		t.Fatalf("CreateAnnouncement() error = %v", err)
	}

	current = current.Add(time.Hour)
	published, err := svc.PublishAnnouncement(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("PublishAnnouncement() error = %v", err)
	}
	if published.Status != model.AnnouncementStatusPublished || published.PublishedAt == nil {
		t.Fatalf("published announcement = %#v", published)
	}

	current = current.Add(time.Hour)
	archived, err := svc.ArchiveAnnouncement(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("ArchiveAnnouncement() error = %v", err)
	}
	if archived.Status != model.AnnouncementStatusArchived || archived.ArchivedAt == nil {
		t.Fatalf("archived announcement = %#v", archived)
	}
}

func TestListAnnouncementsStorageUnavailableReturnsError(t *testing.T) {
	svc := New(failingRepo{err: ErrStorageUnavailable}, fixedIDs{}, Config{})
	page, err := svc.ListAnnouncements(context.Background(), AnnouncementFilter{Page: 2, PageSize: 20})
	if !errors.Is(err, ErrStorageUnavailable) {
		t.Fatalf("ListAnnouncements() error = %v, want ErrStorageUnavailable", err)
	}
	if page.StorageStatus != "unavailable" || page.Page != 2 || page.PageSize != 20 || len(page.Items) != 0 {
		t.Fatalf("unexpected unavailable page: %#v", page)
	}
}

func TestPublicAnnouncementsOnlyExposePublishedItems(t *testing.T) {
	current := time.Date(2026, 6, 22, 10, 0, 0, 0, time.UTC)
	repo := newMemoryRepo()
	svc := New(repo, nil, Config{Now: func() time.Time { return current }})
	draft, err := svc.CreateAnnouncement(context.Background(), CreateAnnouncementInput{Title: "草稿", Content: "暂不公开"})
	if err != nil {
		t.Fatalf("CreateAnnouncement(draft) error = %v", err)
	}
	current = current.Add(time.Minute)
	published, err := svc.CreateAnnouncement(context.Background(), CreateAnnouncementInput{
		Content: "公开内容",
		Status:  model.AnnouncementStatusPublished,
		Summary: "公开摘要",
		Title:   "公开公告",
	})
	if err != nil {
		t.Fatalf("CreateAnnouncement(published) error = %v", err)
	}

	page, err := svc.ListPublishedAnnouncements(context.Background(), AnnouncementFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListPublishedAnnouncements() error = %v", err)
	}
	if page.Total != 1 || len(page.Items) != 1 || page.Items[0].ID != published.ID {
		t.Fatalf("public page = %#v, want only published %d", page, published.ID)
	}
	if page.Items[0].Content != "公开内容" || page.Items[0].PublishedAt == nil {
		t.Fatalf("public item = %#v", page.Items[0])
	}
	if _, err := svc.FindPublishedAnnouncement(context.Background(), draft.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("FindPublishedAnnouncement(draft) error = %v, want ErrNotFound", err)
	}
	detail, err := svc.FindPublishedAnnouncement(context.Background(), published.ID)
	if err != nil {
		t.Fatalf("FindPublishedAnnouncement(published) error = %v", err)
	}
	if detail.ID != published.ID || detail.Title != "公开公告" {
		t.Fatalf("public detail = %#v", detail)
	}
}

type fixedIDs struct {
	next int64
}

func (g fixedIDs) NextID() int64 {
	return g.next + 1
}

type memoryRepo struct {
	items map[int64]*model.Announcement
}

func newMemoryRepo() *memoryRepo {
	return &memoryRepo{items: map[int64]*model.Announcement{}}
}

func (r *memoryRepo) CreateAnnouncement(_ context.Context, announcement *model.Announcement) error {
	clone := *announcement
	r.items[clone.ID] = &clone
	return nil
}

func (r *memoryRepo) DeleteAnnouncement(_ context.Context, id int64, deletedAt time.Time) error {
	item, ok := r.items[id]
	if !ok || item.DeletedAt != nil {
		return ErrNotFound
	}
	item.DeletedAt = &deletedAt
	return nil
}

func (r *memoryRepo) FindAnnouncementByID(_ context.Context, id int64) (*model.Announcement, error) {
	item, ok := r.items[id]
	if !ok || item.DeletedAt != nil {
		return nil, ErrNotFound
	}
	clone := *item
	return &clone, nil
}

func (r *memoryRepo) ListAnnouncements(_ context.Context, filter model.AnnouncementFilter) ([]model.Announcement, int64, error) {
	items := make([]model.Announcement, 0, len(r.items))
	status := strings.TrimSpace(filter.Status)
	for _, item := range r.items {
		if item.DeletedAt == nil && (status == "" || item.Status == status) {
			items = append(items, *item)
		}
	}
	return items, int64(len(items)), nil
}

func (r *memoryRepo) SaveAnnouncement(_ context.Context, announcement *model.Announcement) error {
	if _, ok := r.items[announcement.ID]; !ok {
		return ErrNotFound
	}
	clone := *announcement
	r.items[announcement.ID] = &clone
	return nil
}

type failingRepo struct {
	err error
}

func (r failingRepo) CreateAnnouncement(context.Context, *model.Announcement) error {
	return r.err
}

func (r failingRepo) DeleteAnnouncement(context.Context, int64, time.Time) error {
	return r.err
}

func (r failingRepo) FindAnnouncementByID(context.Context, int64) (*model.Announcement, error) {
	return nil, r.err
}

func (r failingRepo) ListAnnouncements(context.Context, model.AnnouncementFilter) ([]model.Announcement, int64, error) {
	return nil, 0, r.err
}

func (r failingRepo) SaveAnnouncement(context.Context, *model.Announcement) error {
	return r.err
}
