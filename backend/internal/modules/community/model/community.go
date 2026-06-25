package model

import "time"

const (
	VideoSourceKindNative = "native"
	VideoSourceKindHLS    = "hls"
	VideoSourceKindDASH   = "dash"

	DanmakuModeScroll = "scroll"
	DanmakuModeTop    = "top"
	DanmakuModeBottom = "bottom"

	CommentStatusVisible = "visible"
	CommentSortNewest    = "newest"
	CommentSortOldest    = "oldest"
)

// UserSummary 是社区公开接口中展示创作者的最小视图。
type UserSummary struct {
	ID          string  `gorm:"column:id;primaryKey;size:96" json:"id"`
	Handle      string  `gorm:"column:handle;size:96;not null;uniqueIndex" json:"handle"`
	DisplayName string  `gorm:"column:display_name;size:120;not null" json:"displayName"`
	AvatarURL   *string `gorm:"column:avatar_url;size:512" json:"avatarUrl"`
}

// Creator 保存视频社区创作者资料。
type Creator struct {
	UserSummary
	Bio           *string    `gorm:"column:bio;size:640" json:"bio"`
	FollowerCount int64      `gorm:"column:follower_count;not null;default:0" json:"followerCount"`
	JoinedAt      time.Time  `gorm:"column:joined_at;not null" json:"joinedAt"`
	CreatedAt     time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt     time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt     *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (Creator) TableName() string { return "community_creators" }

// Category 是社区内容分类的扁平持久化模型。
type Category struct {
	ID          string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	Slug        string     `gorm:"column:slug;size:96;not null;uniqueIndex" json:"slug"`
	Name        string     `gorm:"column:name;size:120;not null" json:"name"`
	Description *string    `gorm:"column:description;size:320" json:"description"`
	AccentColor *string    `gorm:"column:accent_color;size:32" json:"accentColor"`
	ParentSlug  *string    `gorm:"column:parent_slug;size:96;index" json:"parentSlug"`
	Order       int        `gorm:"column:display_order;not null;default:0" json:"order"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt   *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (Category) TableName() string { return "community_categories" }

// CategoryTreeNode 是前端分类导航使用的树节点。
type CategoryTreeNode struct {
	Category
	Children []CategoryTreeNode `gorm:"-" json:"children"`
}

// Video 是社区视频的核心持久化模型。
type Video struct {
	ID              string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	Slug            string     `gorm:"column:slug;size:160;not null;uniqueIndex" json:"slug"`
	Title           string     `gorm:"column:title;size:240;not null" json:"title"`
	Description     *string    `gorm:"column:description;size:720" json:"description"`
	ThumbnailURL    string     `gorm:"column:thumbnail_url;size:512;not null" json:"thumbnailUrl"`
	DurationSeconds int        `gorm:"column:duration_seconds;not null" json:"durationSeconds"`
	ViewCount       int64      `gorm:"column:view_count;not null;default:0" json:"viewCount"`
	CommentCount    int64      `gorm:"column:comment_count;not null;default:0" json:"commentCount"`
	LikeCount       int64      `gorm:"column:like_count;not null;default:0" json:"likeCount"`
	SourceURL       string     `gorm:"column:source_url;size:512;not null" json:"sourceUrl"`
	PublishedAt     time.Time  `gorm:"column:published_at;not null;index" json:"publishedAt"`
	UploaderID      string     `gorm:"column:uploader_id;size:96;not null;index" json:"-"`
	CreatedAt       time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt       time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt       *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (Video) TableName() string { return "community_videos" }

// VideoCategory 维护视频到分类的多对多关系。
type VideoCategory struct {
	VideoID      string `gorm:"column:video_id;primaryKey;size:96"`
	CategorySlug string `gorm:"column:category_slug;primaryKey;size:96"`
}

func (VideoCategory) TableName() string { return "community_video_categories" }

// VideoTag 维护视频详情页展示的标签。
type VideoTag struct {
	VideoID string `gorm:"column:video_id;primaryKey;size:96"`
	Tag     string `gorm:"column:tag;primaryKey;size:96"`
	Order   int    `gorm:"column:display_order;not null;default:0"`
}

func (VideoTag) TableName() string { return "community_video_tags" }

// VideoSourceOption 描述播放器可选择的视频源。
type VideoSourceOption struct {
	ID           string  `gorm:"column:id;primaryKey;size:96" json:"id"`
	VideoID      string  `gorm:"column:video_id;size:96;not null;index" json:"-"`
	Src          string  `gorm:"column:src;size:512;not null" json:"src"`
	Kind         string  `gorm:"column:kind;size:32;not null" json:"kind"`
	Label        string  `gorm:"column:label;size:120;not null" json:"label"`
	MimeType     *string `gorm:"column:mime_type;size:120" json:"mimeType,omitempty"`
	QualityLabel *string `gorm:"column:quality_label;size:64" json:"qualityLabel,omitempty"`
	BitrateKbps  *int    `gorm:"column:bitrate_kbps" json:"bitrateKbps,omitempty"`
	IsDefault    bool    `gorm:"column:is_default;not null;default:false" json:"isDefault,omitempty"`
	Order        int     `gorm:"column:display_order;not null;default:0" json:"-"`
}

func (VideoSourceOption) TableName() string { return "community_video_sources" }

// VideoDanmakuItem 是播放器弹幕层的公开数据。
type VideoDanmakuItem struct {
	ID          string    `gorm:"column:id;primaryKey;size:96" json:"id"`
	VideoID     string    `gorm:"column:video_id;size:96;not null;index" json:"videoId"`
	Body        string    `gorm:"column:body;size:280;not null" json:"body"`
	TimeSeconds int       `gorm:"column:time_seconds;not null" json:"timeSeconds"`
	Mode        string    `gorm:"column:mode;size:24;not null" json:"mode"`
	Color       string    `gorm:"column:color;size:32;not null" json:"color"`
	AuthorName  string    `gorm:"column:author_name;size:120;not null" json:"authorName"`
	CreatedAt   time.Time `gorm:"column:created_at;not null" json:"createdAt"`
}

func (VideoDanmakuItem) TableName() string { return "community_video_danmaku" }

// VideoComment 保存视频社区公开讨论区评论。
type VideoComment struct {
	ID         string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	VideoID    string     `gorm:"column:video_id;size:96;not null;index" json:"videoId"`
	Body       string     `gorm:"column:body;size:500;not null" json:"body"`
	AuthorName string     `gorm:"column:author_name;size:120;not null" json:"authorName"`
	Status     string     `gorm:"column:status;size:32;not null;default:visible" json:"status"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (VideoComment) TableName() string { return "community_video_comments" }

type CreateVideoCommentRequest struct {
	AuthorName string `json:"authorName"`
	Body       string `json:"body"`
}

type Announcement struct {
	ID       string     `json:"id"`
	Title    string     `json:"title"`
	Body     string     `json:"body"`
	Href     *string    `json:"href"`
	Severity string     `json:"severity"`
	StartsAt time.Time  `json:"startsAt"`
	EndsAt   *time.Time `json:"endsAt"`
}

type PageResult[T any] struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"nextCursor"`
}

type VideoSummary struct {
	ID              string      `json:"id"`
	Slug            string      `json:"slug"`
	Title           string      `json:"title"`
	Description     *string     `json:"description"`
	ThumbnailURL    string      `json:"thumbnailUrl"`
	DurationSeconds int         `json:"durationSeconds"`
	ViewCount       int64       `json:"viewCount"`
	CommentCount    int64       `json:"commentCount"`
	PublishedAt     time.Time   `json:"publishedAt"`
	Uploader        UserSummary `json:"uploader"`
	Categories      []Category  `json:"categories"`
}

type VideoDetail struct {
	VideoSummary
	SourceURL string              `json:"sourceUrl"`
	Sources   []VideoSourceOption `json:"sources,omitempty"`
	LikeCount int64               `json:"likeCount"`
	Tags      []string            `json:"tags"`
	Related   []VideoSummary      `json:"related"`
}

type CreatorProfile struct {
	UserSummary
	Bio           *string                  `json:"bio"`
	FollowerCount int64                    `json:"followerCount"`
	VideoCount    int                      `json:"videoCount"`
	JoinedAt      time.Time                `json:"joinedAt"`
	Categories    []Category               `json:"categories"`
	Latest        PageResult[VideoSummary] `json:"latest"`
}

type HomePayload struct {
	Categories   []CategoryTreeNode       `json:"categories"`
	Announcement *Announcement            `json:"announcement"`
	Latest       PageResult[VideoSummary] `json:"latest"`
}

type FollowingFeedPayload struct {
	Authenticated bool                     `json:"authenticated"`
	Message       *string                  `json:"message"`
	Creators      []CreatorProfile         `json:"creators"`
	Latest        PageResult[VideoSummary] `json:"latest"`
}

type SearchPayload struct {
	Categories PageResult[Category]       `json:"categories"`
	Creators   PageResult[CreatorProfile] `json:"creators"`
	Query      string                     `json:"query"`
	TotalCount int                        `json:"totalCount"`
	Videos     PageResult[VideoSummary]   `json:"videos"`
}

type VideoDanmakuPayload struct {
	Items      []VideoDanmakuItem `json:"items"`
	NextCursor *string            `json:"nextCursor"`
	TotalCount int                `json:"totalCount"`
	VideoID    string             `json:"videoId"`
}

type VideoCommentPayload struct {
	Items      []VideoComment `json:"items"`
	NextCursor *string        `json:"nextCursor"`
	Sort       string         `json:"sort"`
	TotalCount int            `json:"totalCount"`
	VideoID    string         `json:"videoId"`
}

type APIStatus struct {
	Mode        string    `json:"mode"`
	BasePath    string    `json:"basePath"`
	GeneratedAt time.Time `json:"generatedAt"`
	LatencyMs   int       `json:"latencyMs"`
	Endpoints   []string  `json:"endpoints"`
}

type VideoFilter struct {
	Category string
	Cursor   string
	Limit    int
	Query    string
}

type VideoCommentFilter struct {
	Limit int
	Sort  string
}
