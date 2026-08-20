package model

import "time"

const (
	AnnouncementStatusDraft     = "draft"
	AnnouncementStatusPublished = "published"
	AnnouncementStatusArchived  = "archived"
)

// AnnouncementPage 是公告模块的分页结果。
type AnnouncementPage struct {
	Items         []Announcement `json:"items"`
	Page          int            `json:"page"`
	PageSize      int            `json:"pageSize"`
	StorageStatus string         `json:"storageStatus"`
	Total         int64          `json:"total"`
}

// PublicAnnouncementPage 是公开产品线入口使用的公告分页结果。
type PublicAnnouncementPage struct {
	Items         []PublicAnnouncement `json:"items"`
	Page          int                  `json:"page"`
	PageSize      int                  `json:"pageSize"`
	StorageStatus string               `json:"storageStatus"`
	Total         int64                `json:"total"`
}

// AnnouncementFilter 描述公告列表过滤条件。
type AnnouncementFilter struct {
	EndCreatedAt   *time.Time
	Keyword        string
	Page           int
	PageSize       int
	StartCreatedAt *time.Time
	Status         string
}

// Announcement 是平台示例业务模块的公告领域模型。
type Announcement struct {
	ID          int64      `gorm:"column:id;primaryKey" json:"id,string"`
	Title       string     `gorm:"column:title;size:160;not null" json:"title"`
	Summary     string     `gorm:"column:summary;size:320;not null" json:"summary"`
	Content     string     `gorm:"column:content;type:text;not null" json:"content"`
	Status      string     `gorm:"column:status;size:32;not null;index" json:"status"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null;index" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	PublishedAt *time.Time `gorm:"column:published_at" json:"publishedAt,omitempty"`
	ArchivedAt  *time.Time `gorm:"column:archived_at" json:"archivedAt,omitempty"`
	DeletedAt   *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (Announcement) TableName() string { return "announcements" }

// PublicAnnouncement 是公开页面可读取的公告视图，不暴露后台管理状态字段。
type PublicAnnouncement struct {
	ID          int64      `json:"id,string"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	Content     string     `json:"content"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// ToPublicAnnouncement 把后台领域模型转换为公开只读视图。
func ToPublicAnnouncement(announcement Announcement) PublicAnnouncement {
	return PublicAnnouncement{
		ID:          announcement.ID,
		Title:       announcement.Title,
		Summary:     announcement.Summary,
		Content:     announcement.Content,
		PublishedAt: announcement.PublishedAt,
		UpdatedAt:   announcement.UpdatedAt,
	}
}
