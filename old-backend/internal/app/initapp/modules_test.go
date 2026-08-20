package initapp

import (
	"context"
	"errors"
	"testing"
	"time"

	announcementmodel "github.com/open-console/console-platform/internal/modules/announcements/model"
	announcementservice "github.com/open-console/console-platform/internal/modules/announcements/service"
	communityservice "github.com/open-console/console-platform/internal/modules/community/service"
)

func TestCommunityHomeAnnouncementProviderMapsPublishedAnnouncement(t *testing.T) {
	publishedAt := time.Date(2026, 6, 27, 10, 0, 0, 0, time.UTC)
	updatedAt := publishedAt.Add(time.Minute)
	provider := communityHomeAnnouncementProvider{
		announcements: fakeAnnouncementService{page: announcementmodel.PublicAnnouncementPage{
			Items: []announcementmodel.PublicAnnouncement{{
				ID:          42,
				Title:       "平台公告",
				Summary:     "社区首页展示这条真实公告。",
				Content:     "完整公告正文",
				PublishedAt: &publishedAt,
				UpdatedAt:   updatedAt,
			}},
		}},
	}

	announcement, err := provider.HomeAnnouncement(context.Background())
	if err != nil {
		t.Fatalf("HomeAnnouncement() error = %v", err)
	}
	if announcement == nil {
		t.Fatal("expected announcement")
	}
	if announcement.ID != "42" || announcement.Title != "平台公告" || announcement.Body != "社区首页展示这条真实公告。" {
		t.Fatalf("unexpected announcement mapping: %#v", announcement)
	}
	if announcement.Href != nil || announcement.Severity != "info" || !announcement.StartsAt.Equal(publishedAt) || announcement.EndsAt != nil {
		t.Fatalf("unexpected announcement compatibility fields: %#v", announcement)
	}
}

func TestCommunityHomeAnnouncementProviderMapsStorageError(t *testing.T) {
	provider := communityHomeAnnouncementProvider{announcements: fakeAnnouncementService{err: announcementservice.ErrStorageUnavailable}}

	_, err := provider.HomeAnnouncement(context.Background())
	if !errors.Is(err, communityservice.ErrStorageUnavailable) {
		t.Fatalf("HomeAnnouncement() error = %v, want ErrStorageUnavailable", err)
	}
}

type fakeAnnouncementService struct {
	page announcementmodel.PublicAnnouncementPage
	err  error
}

func (s fakeAnnouncementService) ListPublishedAnnouncements(context.Context, announcementservice.AnnouncementFilter) (announcementmodel.PublicAnnouncementPage, error) {
	return s.page, s.err
}

func (fakeAnnouncementService) ArchiveAnnouncement(context.Context, int64) (*announcementmodel.Announcement, error) {
	return nil, nil
}

func (fakeAnnouncementService) CreateAnnouncement(context.Context, announcementservice.CreateAnnouncementInput) (*announcementmodel.Announcement, error) {
	return nil, nil
}

func (fakeAnnouncementService) DeleteAnnouncement(context.Context, int64) error {
	return nil
}

func (fakeAnnouncementService) FindAnnouncement(context.Context, int64) (*announcementmodel.Announcement, error) {
	return nil, nil
}

func (fakeAnnouncementService) FindPublishedAnnouncement(context.Context, int64) (*announcementmodel.PublicAnnouncement, error) {
	return nil, nil
}

func (fakeAnnouncementService) ListAnnouncements(context.Context, announcementservice.AnnouncementFilter) (announcementmodel.AnnouncementPage, error) {
	return announcementmodel.AnnouncementPage{}, nil
}

func (fakeAnnouncementService) PublishAnnouncement(context.Context, int64) (*announcementmodel.Announcement, error) {
	return nil, nil
}

func (fakeAnnouncementService) UpdateAnnouncement(context.Context, int64, announcementservice.UpdateAnnouncementInput) (*announcementmodel.Announcement, error) {
	return nil, nil
}
