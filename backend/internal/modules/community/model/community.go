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

	VideoInteractionKindLike       = "like"
	VideoInteractionKindFavorite   = "favorite"
	VideoInteractionKindWatchLater = "watch_later"

	CommunityReportTargetVideo      = "video"
	CommunityReportReasonSpam       = "spam"
	CommunityReportReasonAbuse      = "abuse"
	CommunityReportReasonCopyright  = "copyright"
	CommunityReportReasonMisleading = "misleading"
	CommunityReportReasonOther      = "other"
	CommunityReportStatusPending    = "pending"
	CommunityReportStatusResolved   = "resolved"
	CommunityReportStatusRejected   = "rejected"

	CommunityAccountRoleRegistered = "registered"
	CommunityAccountRoleCreator    = "creator"
	CommunityAccountStatusActive   = "active"
	CommunityAccountStatusDisabled = "disabled"

	CommunityNotificationKindComment     = "comment"
	CommunityNotificationKindDanmaku     = "danmaku"
	CommunityNotificationKindFollow      = "follow"
	CommunityNotificationKindInteraction = "interaction"
	CommunityNotificationKindReport      = "report"
	CommunityNotificationKindSubmission  = "submission"

	CommunityNotificationTargetVideo      = "video"
	CommunityNotificationTargetCreator    = "creator"
	CommunityNotificationTargetSubmission = "submission"

	CommunityDynamicKindText        = "text"
	CommunityDynamicKindVideoUpdate = "video_update"
	CommunityDynamicStatusVisible   = "visible"

	CommunitySubmissionStatusPendingReview = "pending_review"
	CommunitySubmissionStatusApproved      = "approved"
	CommunitySubmissionStatusRejected      = "rejected"
	CommunitySubmissionStatusPublished     = "published"
	CommunitySubmissionVisibilityPublic    = "public"
	CommunitySubmissionVisibilityUnlisted  = "unlisted"
	CommunitySubmissionVisibilityPrivate   = "private"

	CommunityVideoProviderLocal = "local"
	CommunityVideoProviderCloud = "cloud"

	CommunityVideoJobStatusQueued    = "queued"
	CommunityVideoJobStatusRunning   = "running"
	CommunityVideoJobStatusSucceeded = "succeeded"
	CommunityVideoJobStatusFailed    = "failed"
	CommunityVideoJobStatusCanceled  = "canceled"
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

// CreatorFollow 保存社区账号或匿名客户端对创作者的关注关系。
type CreatorFollow struct {
	ClientID   string     `gorm:"column:client_id;primaryKey;size:96" json:"clientId"`
	CreatorID  string     `gorm:"column:creator_id;primaryKey;size:96" json:"creatorId"`
	FollowedAt time.Time  `gorm:"column:followed_at;not null" json:"followedAt"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CreatorFollow) TableName() string { return "community_creator_follows" }

// VideoInteraction 保存社区账号或匿名客户端对视频的点赞、收藏和稍后看关系。
type VideoInteraction struct {
	ClientID     string     `gorm:"column:client_id;primaryKey;size:96" json:"clientId"`
	VideoID      string     `gorm:"column:video_id;primaryKey;size:96" json:"videoId"`
	Kind         string     `gorm:"column:kind;primaryKey;size:32" json:"kind"`
	InteractedAt time.Time  `gorm:"column:interacted_at;not null" json:"interactedAt"`
	CreatedAt    time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt    time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt    *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (VideoInteraction) TableName() string { return "community_video_interactions" }

// VideoHistory 保存社区账号或匿名客户端的视频观看进度和最近观看时间。
type VideoHistory struct {
	ClientID        string     `gorm:"column:client_id;primaryKey;size:96" json:"clientId"`
	VideoID         string     `gorm:"column:video_id;primaryKey;size:96" json:"videoId"`
	ProgressSeconds int        `gorm:"column:progress_seconds;not null;default:0" json:"progressSeconds"`
	LastViewedAt    time.Time  `gorm:"column:last_viewed_at;not null" json:"lastViewedAt"`
	CreatedAt       time.Time  `gorm:"column:created_at;not null" json:"-"`
	UpdatedAt       time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt       *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (VideoHistory) TableName() string { return "community_video_history" }

// CommunityAccount is the public community identity used by the Nuxt frontend.
// It is intentionally separate from IAM users and never grants console access.
type CommunityAccount struct {
	ID           int64      `gorm:"column:id;primaryKey" json:"id,string"`
	Handle       string     `gorm:"column:handle;size:96;not null;uniqueIndex" json:"handle"`
	Email        string     `gorm:"column:email;size:255;not null;uniqueIndex" json:"email"`
	PasswordHash string     `gorm:"column:password_hash;size:255;not null" json:"-"`
	DisplayName  string     `gorm:"column:display_name;size:120;not null" json:"displayName"`
	Role         string     `gorm:"column:role;size:32;not null;default:registered;index" json:"role"`
	Status       string     `gorm:"column:status;size:32;not null;default:active;index" json:"status"`
	LastLoginAt  *time.Time `gorm:"column:last_login_at" json:"lastLoginAt,omitempty"`
	CreatedAt    time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt    time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt    *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityAccount) TableName() string { return "community_accounts" }

// CommunitySession stores community-only access and refresh tokens.
type CommunitySession struct {
	ID               int64      `gorm:"column:id;primaryKey" json:"id,string"`
	AccountID        int64      `gorm:"column:account_id;not null;index" json:"accountId,string"`
	AccessTokenHash  string     `gorm:"column:access_token_hash;size:128;not null;uniqueIndex" json:"-"`
	RefreshTokenHash string     `gorm:"column:refresh_token_hash;size:128;not null;uniqueIndex" json:"-"`
	ProductCode      string     `gorm:"column:product_code;size:64;not null;default:'';index" json:"productCode"`
	ClientType       string     `gorm:"column:client_type;size:64;not null;default:'';index" json:"clientType"`
	IPAddress        string     `gorm:"column:ip_address;size:64;not null;default:''" json:"ipAddress"`
	UserAgent        string     `gorm:"column:user_agent;size:512;not null;default:''" json:"userAgent"`
	AccessExpiresAt  time.Time  `gorm:"column:access_expires_at;not null;index" json:"accessExpiresAt"`
	RefreshExpiresAt time.Time  `gorm:"column:refresh_expires_at;not null;index" json:"refreshExpiresAt"`
	RevokedAt        *time.Time `gorm:"column:revoked_at;index" json:"revokedAt,omitempty"`
	CreatedAt        time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt        time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt        *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunitySession) TableName() string { return "community_sessions" }

// CommunityReport 保存匿名客户端提交的社区内容举报记录。
type CommunityReport struct {
	ID         string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	TargetKind string     `gorm:"column:target_kind;size:32;not null;index" json:"targetKind"`
	TargetID   string     `gorm:"column:target_id;size:96;not null;index" json:"targetId"`
	VideoID    string     `gorm:"column:video_id;size:96;not null;index" json:"videoId"`
	ClientID   string     `gorm:"column:client_id;size:96;not null;index" json:"clientId"`
	Reason     string     `gorm:"column:reason;size:32;not null" json:"reason"`
	Detail     string     `gorm:"column:detail;size:500;not null" json:"detail"`
	Status     string     `gorm:"column:status;size:32;not null;default:pending" json:"status"`
	ReviewNote string     `gorm:"column:review_note;size:720;not null;default:''" json:"reviewNote"`
	ReviewerID string     `gorm:"column:reviewer_id;size:96;not null;default:'';index" json:"reviewerId"`
	ReviewedAt *time.Time `gorm:"column:reviewed_at;index" json:"reviewedAt"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityReport) TableName() string { return "community_reports" }

// CommunityNotification 保存社区账号或匿名客户端的轻量站内消息。
type CommunityNotification struct {
	ID         string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	ClientID   string     `gorm:"column:client_id;size:96;not null;index" json:"clientId"`
	Kind       string     `gorm:"column:kind;size:32;not null;index" json:"kind"`
	Title      string     `gorm:"column:title;size:160;not null" json:"title"`
	Body       string     `gorm:"column:body;size:500;not null" json:"body"`
	TargetKind string     `gorm:"column:target_kind;size:32;not null;index" json:"targetKind"`
	TargetID   string     `gorm:"column:target_id;size:96;not null;index" json:"targetId"`
	VideoID    string     `gorm:"column:video_id;size:96;not null;index" json:"videoId"`
	CreatorID  string     `gorm:"column:creator_id;size:96;not null;index" json:"creatorId"`
	Link       string     `gorm:"column:link;size:512;not null" json:"link"`
	ReadAt     *time.Time `gorm:"column:read_at" json:"readAt"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"-"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityNotification) TableName() string { return "community_notifications" }

// CommunityDynamic saves lightweight public timeline updates for the video community.
type CommunityDynamic struct {
	ID         string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	ClientID   string     `gorm:"column:client_id;size:96;not null;default:'';index" json:"clientId"`
	CreatorID  string     `gorm:"column:creator_id;size:96;not null;default:'';index" json:"creatorId"`
	VideoID    string     `gorm:"column:video_id;size:96;not null;default:'';index" json:"videoId"`
	AuthorName string     `gorm:"column:author_name;size:120;not null" json:"authorName"`
	Body       string     `gorm:"column:body;size:500;not null" json:"body"`
	Kind       string     `gorm:"column:kind;size:32;not null;default:text;index" json:"kind"`
	Status     string     `gorm:"column:status;size:32;not null;default:visible;index" json:"status"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityDynamic) TableName() string { return "community_dynamics" }

// CommunitySubmission saves community account or anonymous upload metadata for the review queue.
type CommunitySubmission struct {
	ID               string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	ClientID         string     `gorm:"column:client_id;size:96;not null;index" json:"clientId"`
	AuthorName       string     `gorm:"column:author_name;size:120;not null" json:"authorName"`
	Title            string     `gorm:"column:title;size:180;not null" json:"title"`
	Description      string     `gorm:"column:description;size:720;not null;default:''" json:"description"`
	CategorySlug     string     `gorm:"column:category_slug;size:96;not null;index" json:"categorySlug"`
	TagsJSON         string     `gorm:"column:tags_json;type:text;not null" json:"-"`
	Visibility       string     `gorm:"column:visibility;size:32;not null;default:public" json:"visibility"`
	SourceName       string     `gorm:"column:source_name;size:260;not null" json:"sourceName"`
	SourceSize       int64      `gorm:"column:source_size;not null;default:0" json:"sourceSize"`
	SourceType       string     `gorm:"column:source_type;size:120;not null;default:''" json:"sourceType"`
	AllowComments    bool       `gorm:"column:allow_comments;not null;default:true" json:"allowComments"`
	Sensitive        bool       `gorm:"column:sensitive;not null;default:false" json:"sensitive"`
	Status           string     `gorm:"column:status;size:32;not null;default:pending_review;index" json:"status"`
	ReviewNote       string     `gorm:"column:review_note;size:720;not null;default:''" json:"reviewNote"`
	ReviewerID       string     `gorm:"column:reviewer_id;size:96;not null;default:'';index" json:"reviewerId"`
	ReviewedAt       *time.Time `gorm:"column:reviewed_at;index" json:"reviewedAt"`
	MediaAssetID     int64      `gorm:"column:media_asset_id;not null;default:0;index" json:"mediaAssetId,string,omitempty"`
	PublishedVideoID string     `gorm:"column:published_video_id;size:96;not null;default:'';index" json:"publishedVideoId"`
	PublishedAt      *time.Time `gorm:"column:published_at;index" json:"publishedAt"`
	CreatedAt        time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt        time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt        *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunitySubmission) TableName() string { return "community_submissions" }

// CommunityMediaAsset is the minimal platform media projection needed by community review publishing.
type CommunityMediaAsset struct {
	ID                 int64      `gorm:"column:id;primaryKey" json:"id,string"`
	CategoryID         int64      `gorm:"column:category_id;not null;default:0" json:"categoryId,string,omitempty"`
	DisplayName        string     `gorm:"column:display_name;size:255;not null" json:"displayName"`
	OriginalName       string     `gorm:"column:original_name;size:255;not null" json:"originalName"`
	StorageKey         string     `gorm:"column:storage_key;size:512;not null" json:"storageKey"`
	URL                string     `gorm:"column:url;type:text;not null" json:"url"`
	MIMEType           string     `gorm:"column:mime_type;size:128;not null" json:"mimeType"`
	Extension          string     `gorm:"column:extension;size:32;not null" json:"extension"`
	SizeBytes          int64      `gorm:"column:size_bytes;not null" json:"sizeBytes"`
	Source             string     `gorm:"column:source;size:32;not null" json:"source"`
	External           bool       `gorm:"column:external;not null;default:false" json:"external"`
	UploadedBy         int64      `gorm:"column:uploaded_by;not null;default:0" json:"uploadedBy,string,omitempty"`
	UploadedByUsername string     `gorm:"column:uploaded_by_username;size:128;not null" json:"uploadedByUsername,omitempty"`
	CreatedAt          time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt          time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt          *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityMediaAsset) TableName() string { return "system_media_assets" }

type CommunityVideoJob struct {
	ID                 string     `gorm:"column:id;primaryKey;size:96" json:"id"`
	SubmissionID       string     `gorm:"column:submission_id;size:96;not null;index" json:"submissionId"`
	MediaAssetID       int64      `gorm:"column:media_asset_id;not null;default:0;index" json:"mediaAssetId,string,omitempty"`
	VideoID            string     `gorm:"column:video_id;size:96;not null;default:'';index" json:"videoId,omitempty"`
	Provider           string     `gorm:"column:provider;size:32;not null" json:"provider"`
	Status             string     `gorm:"column:status;size:32;not null;index" json:"status"`
	Progress           int        `gorm:"column:progress;not null;default:0" json:"progress"`
	Attempt            int        `gorm:"column:attempt;not null;default:0" json:"attempt"`
	MaxAttempts        int        `gorm:"column:max_attempts;not null;default:3" json:"maxAttempts"`
	LockedBy           string     `gorm:"column:locked_by;size:96;not null;default:''" json:"lockedBy,omitempty"`
	LockedAt           *time.Time `gorm:"column:locked_at" json:"lockedAt,omitempty"`
	HeartbeatAt        *time.Time `gorm:"column:heartbeat_at" json:"heartbeatAt,omitempty"`
	NextRunAt          *time.Time `gorm:"column:next_run_at" json:"nextRunAt,omitempty"`
	InputStorageKey    string     `gorm:"column:input_storage_key;size:512;not null;default:''" json:"inputStorageKey,omitempty"`
	OutputStorageKey   string     `gorm:"column:output_storage_key;size:512;not null;default:''" json:"outputStorageKey,omitempty"`
	OutputPublicURL    string     `gorm:"column:output_public_url;size:512;not null;default:''" json:"outputPublicUrl,omitempty"`
	RequestPayload     string     `gorm:"column:request_payload;size:4096;not null;default:''" json:"requestPayload,omitempty"`
	ProviderJobID      string     `gorm:"column:provider_job_id;size:160;not null;default:''" json:"providerJobId,omitempty"`
	CallbackReceivedAt *time.Time `gorm:"column:callback_received_at" json:"callbackReceivedAt,omitempty"`
	FailureCode        string     `gorm:"column:failure_code;size:96;not null;default:''" json:"failureCode,omitempty"`
	CancelRequestedAt  *time.Time `gorm:"column:cancel_requested_at" json:"cancelRequestedAt,omitempty"`
	ErrorMessage       string     `gorm:"column:error_message;type:text;not null" json:"errorMessage,omitempty"`
	StartedAt          *time.Time `gorm:"column:started_at" json:"startedAt,omitempty"`
	FinishedAt         *time.Time `gorm:"column:finished_at" json:"finishedAt,omitempty"`
	CreatedAt          time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt          time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt          *time.Time `gorm:"column:deleted_at" json:"-"`
}

func (CommunityVideoJob) TableName() string { return "community_video_jobs" }

type CommunityVideoRendition struct {
	ID           string    `gorm:"column:id;primaryKey;size:96" json:"id"`
	JobID        string    `gorm:"column:job_id;size:96;not null;index" json:"jobId"`
	VideoID      string    `gorm:"column:video_id;size:96;not null;index" json:"videoId"`
	QualityLabel string    `gorm:"column:quality_label;size:64;not null" json:"qualityLabel"`
	Width        int       `gorm:"column:width;not null" json:"width"`
	Height       int       `gorm:"column:height;not null" json:"height"`
	BitrateKbps  int       `gorm:"column:bitrate_kbps;not null;default:0" json:"bitrateKbps"`
	PlaylistURL  string    `gorm:"column:playlist_url;size:512;not null" json:"playlistUrl"`
	StorageKey   string    `gorm:"column:storage_key;size:512;not null" json:"storageKey"`
	CreatedAt    time.Time `gorm:"column:created_at;not null" json:"createdAt"`
}

func (CommunityVideoRendition) TableName() string { return "community_video_renditions" }

// Category 是社区内容分类的公开投影视图，生产数据由系统字典提供。
type Category struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	AccentColor *string `json:"accentColor"`
	ParentSlug  *string `json:"parentSlug"`
	Order       int     `json:"order"`
}

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
	ClientID   string     `gorm:"column:client_id;size:96;not null;default:'';index" json:"-"`
	Body       string     `gorm:"column:body;size:500;not null" json:"body"`
	AuthorName string     `gorm:"column:author_name;size:120;not null" json:"authorName"`
	Status     string     `gorm:"column:status;size:32;not null;default:visible" json:"status"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null" json:"updatedAt"`
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"-"`

	OwnedByCurrentClient bool `gorm:"-" json:"ownedByCurrentClient,omitempty"`
}

func (VideoComment) TableName() string { return "community_video_comments" }

type CreateVideoCommentRequest struct {
	AuthorName string `json:"authorName"`
	Body       string `json:"body"`
	ClientID   string `json:"clientId,omitempty"`
}

type UpdateVideoCommentRequest struct {
	Body     string `json:"body"`
	ClientID string `json:"clientId,omitempty"`
}

type DeleteVideoCommentResult struct {
	CommentID string `json:"commentId"`
	VideoID   string `json:"videoId"`
	ClientID  string `json:"clientId"`
	Deleted   bool   `json:"deleted"`
}

type CreateVideoDanmakuRequest struct {
	AuthorName  string `json:"authorName"`
	Body        string `json:"body"`
	TimeSeconds int    `json:"timeSeconds"`
	Mode        string `json:"mode"`
	Color       string `json:"color"`
	ClientID    string `json:"clientId,omitempty"`
}

type CreateVideoReportRequest struct {
	ClientID string `json:"clientId"`
	Reason   string `json:"reason"`
	Detail   string `json:"detail"`
}

type CreatorFollowRequest struct {
	ClientID string `json:"clientId"`
}

type VideoInteractionRequest struct {
	ClientID string `json:"clientId"`
}

type VideoHistoryRequest struct {
	ClientID        string `json:"clientId"`
	ProgressSeconds int    `json:"progressSeconds"`
}

type RecordAccountVideoHistoryRequest struct {
	ProgressSeconds int `json:"progressSeconds"`
}

type VideoHistoryClearRequest struct {
	ClientID string `json:"clientId"`
}

type CommunityNotificationRequest struct {
	ClientID string `json:"clientId"`
}

type CreateCommunityDynamicRequest struct {
	ClientID   string `json:"clientId"`
	AuthorName string `json:"authorName"`
	Body       string `json:"body"`
	VideoID    string `json:"videoId,omitempty"`
}

type CreateCommunityAccountDynamicRequest struct {
	Body    string `json:"body"`
	VideoID string `json:"videoId,omitempty"`
}

type UpdateCommunityDynamicRequest struct {
	Body     string `json:"body"`
	ClientID string `json:"clientId,omitempty"`
}

type DeleteCommunityDynamicResult struct {
	DynamicID string `json:"dynamicId"`
	ClientID  string `json:"clientId"`
	Deleted   bool   `json:"deleted"`
}

type CreateCommunitySubmissionRequest struct {
	ClientID      string   `json:"clientId"`
	AuthorName    string   `json:"authorName"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	CategorySlug  string   `json:"categorySlug"`
	Tags          []string `json:"tags"`
	Visibility    string   `json:"visibility"`
	SourceName    string   `json:"sourceName"`
	SourceSize    int64    `json:"sourceSize"`
	SourceType    string   `json:"sourceType"`
	MediaAssetID  int64    `json:"mediaAssetId,string,omitempty"`
	AllowComments bool     `json:"allowComments"`
	Sensitive     bool     `json:"sensitive"`
}

type CreateCommunityAccountSubmissionRequest struct {
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	CategorySlug  string   `json:"categorySlug"`
	Tags          []string `json:"tags"`
	Visibility    string   `json:"visibility"`
	SourceName    string   `json:"sourceName"`
	SourceSize    int64    `json:"sourceSize"`
	SourceType    string   `json:"sourceType"`
	MediaAssetID  int64    `json:"mediaAssetId,string,omitempty"`
	AllowComments bool     `json:"allowComments"`
	Sensitive     bool     `json:"sensitive"`
}

type CommunitySubmissionUploadResult struct {
	MediaAssetID int64  `json:"mediaAssetId,string"`
	DisplayName  string `json:"displayName"`
	OriginalName string `json:"originalName"`
	URL          string `json:"url"`
	MIMEType     string `json:"mimeType"`
	SizeBytes    int64  `json:"sizeBytes"`
}

type CreateCommunityVideoJobRequest struct {
	DurationSeconds int    `json:"durationSeconds,omitempty"`
	ThumbnailURL    string `json:"thumbnailUrl,omitempty"`
	Slug            string `json:"slug,omitempty"`
}

type CommunityVideoJobCallbackRequest struct {
	ProviderJobID    string                    `json:"providerJobId,omitempty"`
	Status           string                    `json:"status"`
	Progress         int                       `json:"progress,omitempty"`
	MasterURL        string                    `json:"masterUrl,omitempty"`
	ThumbnailURL     string                    `json:"thumbnailUrl,omitempty"`
	DurationSeconds  int                       `json:"durationSeconds,omitempty"`
	OutputStorageKey string                    `json:"outputStorageKey,omitempty"`
	Renditions       []CommunityVideoRendition `json:"renditions,omitempty"`
	ErrorMessage     string                    `json:"errorMessage,omitempty"`
	FailureCode      string                    `json:"failureCode,omitempty"`
}

type ReviewCommunitySubmissionRequest struct {
	Status           string `json:"status"`
	ReviewNote       string `json:"reviewNote"`
	PublishedVideoID string `json:"publishedVideoId,omitempty"`
	MediaAssetID     int64  `json:"mediaAssetId,string,omitempty"`
	SourceURL        string `json:"sourceUrl,omitempty"`
	ThumbnailURL     string `json:"thumbnailUrl,omitempty"`
	DurationSeconds  int    `json:"durationSeconds,omitempty"`
	Slug             string `json:"slug,omitempty"`
}

type CommunitySignupRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName,omitempty"`
}

type CommunityLoginRequest struct {
	Identifier string `json:"identifier"`
	Email      string `json:"email,omitempty"`
	Password   string `json:"password"`
}

type CommunityAccountSession struct {
	ID          string     `json:"id"`
	Handle      string     `json:"handle"`
	Email       string     `json:"email"`
	DisplayName string     `json:"displayName"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	LastLoginAt *time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type CommunityAuthSessionSnapshot struct {
	Authenticated    bool                     `json:"authenticated"`
	Account          *CommunityAccountSession `json:"account,omitempty"`
	User             *CommunityAccountSession `json:"user,omitempty"`
	UserID           *string                  `json:"userId,omitempty"`
	SessionID        *string                  `json:"sessionId,omitempty"`
	CSRFToken        *string                  `json:"csrfToken,omitempty"`
	ExpiresAt        *time.Time               `json:"expiresAt,omitempty"`
	AccessExpiresAt  *time.Time               `json:"accessExpiresAt,omitempty"`
	RefreshExpiresAt *time.Time               `json:"refreshExpiresAt,omitempty"`
	Message          *string                  `json:"message,omitempty"`
}

type CommunitySignupResult struct {
	Status                 string                        `json:"status"`
	Session                *CommunityAuthSessionSnapshot `json:"session,omitempty"`
	DebugVerificationToken string                        `json:"debugVerificationToken,omitempty"`
	DebugVerificationURL   string                        `json:"debugVerificationUrl,omitempty"`
}

type CommunityAccountFilter struct {
	Keyword string
	Role    string
	Status  string
	Limit   int
}

type CommunityAccountItem struct {
	ID          string     `json:"id"`
	Handle      string     `json:"handle"`
	Email       string     `json:"email"`
	DisplayName string     `json:"displayName"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	LastLoginAt *time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type CommunityAccountPayload struct {
	Items PageResult[CommunityAccountItem] `json:"items"`
}

type UpdateCommunityAccountRequest struct {
	Role   string `json:"role,omitempty"`
	Status string `json:"status,omitempty"`
}

type CommunityReportFilter struct {
	Status string
	Limit  int
}

type ReviewCommunityReportRequest struct {
	Status     string `json:"status"`
	ReviewNote string `json:"reviewNote"`
}

type CommunityDynamicFilter struct {
	ClientID   string
	CreatorIDs []string
	Limit      int
}

type CommunitySubmissionFilter struct {
	ClientID   string
	Status     string
	AllClients bool
	Limit      int
}

type CommunityVideoJobFilter struct {
	Status string
	Limit  int
}

type CommunitySubmissionVideoJobSummary struct {
	ID              string     `json:"id"`
	Status          string     `json:"status"`
	Progress        int        `json:"progress"`
	VideoID         string     `json:"videoId,omitempty"`
	FailureCode     string     `json:"failureCode,omitempty"`
	ErrorMessage    string     `json:"errorMessage,omitempty"`
	OutputPublicURL string     `json:"outputPublicUrl,omitempty"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	FinishedAt      *time.Time `json:"finishedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type CommunityDynamicItem struct {
	ID         string        `json:"id"`
	Kind       string        `json:"kind"`
	AuthorName string        `json:"authorName"`
	Author     *UserSummary  `json:"author,omitempty"`
	Body       string        `json:"body"`
	VideoID    string        `json:"videoId"`
	Video      *VideoSummary `json:"video,omitempty"`
	CreatedAt  time.Time     `json:"createdAt"`
	UpdatedAt  time.Time     `json:"updatedAt"`

	OwnedByCurrentClient bool `json:"ownedByCurrentClient,omitempty"`
}

type CommunityDynamicPayload struct {
	Authenticated bool                             `json:"authenticated"`
	ClientID      *string                          `json:"clientId,omitempty"`
	Message       *string                          `json:"message"`
	Items         PageResult[CommunityDynamicItem] `json:"items"`
}

type CommunitySubmissionItem struct {
	ID               string                              `json:"id"`
	ClientID         string                              `json:"clientId"`
	AuthorName       string                              `json:"authorName"`
	Title            string                              `json:"title"`
	Description      string                              `json:"description"`
	CategorySlug     string                              `json:"categorySlug"`
	Category         *Category                           `json:"category,omitempty"`
	Tags             []string                            `json:"tags"`
	Visibility       string                              `json:"visibility"`
	SourceName       string                              `json:"sourceName"`
	SourceSize       int64                               `json:"sourceSize"`
	SourceType       string                              `json:"sourceType"`
	AllowComments    bool                                `json:"allowComments"`
	Sensitive        bool                                `json:"sensitive"`
	Status           string                              `json:"status"`
	ReviewNote       string                              `json:"reviewNote,omitempty"`
	ReviewerID       string                              `json:"reviewerId,omitempty"`
	ReviewedAt       *time.Time                          `json:"reviewedAt,omitempty"`
	MediaAssetID     int64                               `json:"mediaAssetId,string,omitempty"`
	PublishedVideoID string                              `json:"publishedVideoId,omitempty"`
	PublishedAt      *time.Time                          `json:"publishedAt,omitempty"`
	LatestVideoJob   *CommunitySubmissionVideoJobSummary `json:"latestVideoJob,omitempty"`
	CreatedAt        time.Time                           `json:"createdAt"`
	UpdatedAt        time.Time                           `json:"updatedAt"`
}

type CommunitySubmissionPayload struct {
	Authenticated bool                                `json:"authenticated"`
	ClientID      *string                             `json:"clientId"`
	Message       *string                             `json:"message"`
	Items         PageResult[CommunitySubmissionItem] `json:"items"`
}

type CommunityVideoJobItem struct {
	ID                 string                    `json:"id"`
	SubmissionID       string                    `json:"submissionId"`
	MediaAssetID       int64                     `json:"mediaAssetId,string,omitempty"`
	VideoID            string                    `json:"videoId,omitempty"`
	Provider           string                    `json:"provider"`
	Status             string                    `json:"status"`
	Progress           int                       `json:"progress"`
	Attempt            int                       `json:"attempt"`
	MaxAttempts        int                       `json:"maxAttempts"`
	LockedBy           string                    `json:"lockedBy,omitempty"`
	LockedAt           *time.Time                `json:"lockedAt,omitempty"`
	HeartbeatAt        *time.Time                `json:"heartbeatAt,omitempty"`
	NextRunAt          *time.Time                `json:"nextRunAt,omitempty"`
	InputStorageKey    string                    `json:"inputStorageKey,omitempty"`
	OutputStorageKey   string                    `json:"outputStorageKey,omitempty"`
	OutputPublicURL    string                    `json:"outputPublicUrl,omitempty"`
	RequestPayload     string                    `json:"requestPayload,omitempty"`
	ProviderJobID      string                    `json:"providerJobId,omitempty"`
	CallbackReceivedAt *time.Time                `json:"callbackReceivedAt,omitempty"`
	FailureCode        string                    `json:"failureCode,omitempty"`
	CancelRequestedAt  *time.Time                `json:"cancelRequestedAt,omitempty"`
	ErrorMessage       string                    `json:"errorMessage,omitempty"`
	Renditions         []CommunityVideoRendition `json:"renditions,omitempty"`
	StartedAt          *time.Time                `json:"startedAt,omitempty"`
	FinishedAt         *time.Time                `json:"finishedAt,omitempty"`
	CreatedAt          time.Time                 `json:"createdAt"`
	UpdatedAt          time.Time                 `json:"updatedAt"`
}

type CommunityVideoJobPayload struct {
	Items PageResult[CommunityVideoJobItem] `json:"items"`
}

type CommunityNotificationFilter struct {
	ClientID string
	Limit    int
}

type VideoHistoryFilter struct {
	ClientID string
	Limit    int
}

type CommunityNotificationItem struct {
	ID         string     `json:"id"`
	Kind       string     `json:"kind"`
	Title      string     `json:"title"`
	Body       string     `json:"body"`
	TargetKind string     `json:"targetKind"`
	TargetID   string     `json:"targetId"`
	VideoID    string     `json:"videoId"`
	CreatorID  string     `json:"creatorId"`
	Link       string     `json:"link"`
	ReadAt     *time.Time `json:"readAt"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type CommunityNotificationPayload struct {
	Authenticated bool                                  `json:"authenticated"`
	ClientID      *string                               `json:"clientId"`
	UnreadCount   int                                   `json:"unreadCount"`
	Message       *string                               `json:"message"`
	Items         PageResult[CommunityNotificationItem] `json:"items"`
}

type CreatorFollowState struct {
	ClientID      string     `json:"clientId"`
	CreatorID     string     `json:"creatorId"`
	Handle        string     `json:"handle"`
	Following     bool       `json:"following"`
	FollowerCount int64      `json:"followerCount"`
	FollowedAt    *time.Time `json:"followedAt"`
}

type VideoInteractionState struct {
	ClientID   string `json:"clientId"`
	VideoID    string `json:"videoId"`
	Liked      bool   `json:"liked"`
	Favorited  bool   `json:"favorited"`
	WatchLater bool   `json:"watchLater"`
	LikeCount  int64  `json:"likeCount"`
}

type VideoHistoryItem struct {
	Video           VideoSummary `json:"video"`
	ProgressSeconds int          `json:"progressSeconds"`
	LastViewedAt    time.Time    `json:"lastViewedAt"`
}

type VideoHistoryPayload struct {
	Authenticated bool                         `json:"authenticated"`
	ClientID      *string                      `json:"clientId,omitempty"`
	HistoryCount  int                          `json:"historyCount"`
	Message       *string                      `json:"message"`
	Items         PageResult[VideoHistoryItem] `json:"items"`
}

type CommunityReportReceipt struct {
	ID         string    `json:"id"`
	TargetKind string    `json:"targetKind"`
	TargetID   string    `json:"targetId"`
	VideoID    string    `json:"videoId"`
	ClientID   string    `json:"clientId"`
	Reason     string    `json:"reason"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CommunityReportItem struct {
	ID         string     `json:"id"`
	TargetKind string     `json:"targetKind"`
	TargetID   string     `json:"targetId"`
	VideoID    string     `json:"videoId"`
	ClientID   string     `json:"clientId"`
	Reason     string     `json:"reason"`
	Detail     string     `json:"detail"`
	Status     string     `json:"status"`
	ReviewNote string     `json:"reviewNote,omitempty"`
	ReviewerID string     `json:"reviewerId,omitempty"`
	ReviewedAt *time.Time `json:"reviewedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type CommunityReportPayload struct {
	Items PageResult[CommunityReportItem] `json:"items"`
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
	FollowedAt    *time.Time               `json:"followedAt,omitempty"`
	VideoCount    int                      `json:"videoCount"`
	JoinedAt      time.Time                `json:"joinedAt"`
	Categories    []Category               `json:"categories"`
	Latest        PageResult[VideoSummary] `json:"latest"`
}

type HomePayload struct {
	Categories   []CategoryTreeNode               `json:"categories"`
	Announcement *Announcement                    `json:"announcement"`
	Latest       PageResult[VideoSummary]         `json:"latest"`
	Dynamics     PageResult[CommunityDynamicItem] `json:"dynamics"`
}

type FollowingFeedPayload struct {
	Authenticated  bool                             `json:"authenticated"`
	ClientID       *string                          `json:"clientId,omitempty"`
	FollowingCount int                              `json:"followingCount"`
	Message        *string                          `json:"message"`
	Creators       []CreatorProfile                 `json:"creators"`
	Latest         PageResult[VideoSummary]         `json:"latest"`
	Dynamics       PageResult[CommunityDynamicItem] `json:"dynamics"`
}

type VideoLibraryPayload struct {
	Authenticated   bool                     `json:"authenticated"`
	ClientID        *string                  `json:"clientId,omitempty"`
	FavoriteCount   int                      `json:"favoriteCount"`
	WatchLaterCount int                      `json:"watchLaterCount"`
	Message         *string                  `json:"message"`
	Favorites       PageResult[VideoSummary] `json:"favorites"`
	WatchLater      PageResult[VideoSummary] `json:"watchLater"`
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

type SetupStatus struct {
	Required    bool   `json:"required"`
	Completed   bool   `json:"completed"`
	CurrentStep string `json:"currentStep"`
}

type APIStatus struct {
	Mode        string      `json:"mode"`
	BasePath    string      `json:"basePath"`
	GeneratedAt time.Time   `json:"generatedAt"`
	LatencyMs   int         `json:"latencyMs"`
	Endpoints   []string    `json:"endpoints"`
	Setup       SetupStatus `json:"setup"`
}

type VideoFilter struct {
	Category      string
	CategorySlugs []string
	Cursor        string
	Limit         int
	Query         string
}

type VideoInteractionFilter struct {
	ClientID string
	Kind     string
	Limit    int
}

type VideoCommentFilter struct {
	ClientID string
	Limit    int
	Sort     string
}
