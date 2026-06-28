package config

import (
	"fmt"
	"strings"
)

const (
	DefaultCommunityAuthAccessTokenTTLSeconds         = 900
	DefaultCommunityAuthRefreshTokenTTLSeconds        = 604800
	DefaultCommunityAuthCookieNamePrefix              = "community"
	DefaultCommunityAuthCookiePath                    = "/"
	DefaultCommunityAuthCookieSameSite                = "lax"
	DefaultCommunityAuthCSRFCookieName                = "community_csrf"
	DefaultCommunityAuthCSRFHeaderName                = "X-Community-CSRF-Token"
	DefaultCommunityAuthClientType                    = "community_web"
	DefaultCommunityVideoMode                         = "local"
	DefaultCommunityVideoLocalFFmpegPath              = "ffmpeg"
	DefaultCommunityVideoLocalFFprobePath             = "ffprobe"
	DefaultCommunityVideoLocalOutputRoot              = "community/hls"
	DefaultCommunityVideoLocalSourceRoot              = "community/sources"
	DefaultCommunityVideoLocalPublicBaseURL           = "/api/v1/public/community/hls"
	DefaultCommunityVideoHLSSegmentSeconds            = 6
	DefaultCommunityVideoWorkerPollSeconds            = 5
	DefaultCommunityVideoWorkerBatchSize              = 2
	DefaultCommunityVideoWorkerLeaseSeconds           = 1800
	DefaultCommunityVideoWorkerMaxAttempts            = 3
	DefaultCommunityVideoWorkerRetryDelaySeconds      = 60
	DefaultCommunityVideoWorkerExecutorPool           = "background"
	DefaultCommunityVideoWorkerDispatchTimeoutSeconds = 30
	DefaultCommunityVideoWorkerCallbackMaxSkewSeconds = 600
)

type CommunityConfig struct {
	Auth  CommunityAuthConfig  `mapstructure:"auth" json:"auth" yaml:"auth" toml:"auth"`
	Video CommunityVideoConfig `mapstructure:"video" json:"video" yaml:"video" toml:"video"`
}

type CommunityAuthConfig struct {
	AccessTokenTTLSeconds  int                       `mapstructure:"access_token_ttl_seconds" envname:"COMMUNITY_AUTH_ACCESS_TOKEN_TTL_SECONDS" json:"access_token_ttl_seconds" yaml:"access_token_ttl_seconds" toml:"access_token_ttl_seconds"`
	RefreshTokenTTLSeconds int                       `mapstructure:"refresh_token_ttl_seconds" envname:"COMMUNITY_AUTH_REFRESH_TOKEN_TTL_SECONDS" json:"refresh_token_ttl_seconds" yaml:"refresh_token_ttl_seconds" toml:"refresh_token_ttl_seconds"`
	Cookie                 CommunityAuthCookieConfig `mapstructure:"cookie" json:"cookie" yaml:"cookie" toml:"cookie"`
	CSRF                   CommunityAuthCSRFConfig   `mapstructure:"csrf" json:"csrf" yaml:"csrf" toml:"csrf"`
	DefaultClientType      string                    `mapstructure:"default_client_type" envname:"COMMUNITY_AUTH_DEFAULT_CLIENT_TYPE" json:"default_client_type" yaml:"default_client_type" toml:"default_client_type"`
}

type CommunityAuthCookieConfig struct {
	NamePrefix string `mapstructure:"name_prefix" envname:"COMMUNITY_AUTH_COOKIE_NAME_PREFIX" json:"name_prefix" yaml:"name_prefix" toml:"name_prefix"`
	Domain     string `mapstructure:"domain" envname:"COMMUNITY_AUTH_COOKIE_DOMAIN" json:"domain" yaml:"domain" toml:"domain"`
	Path       string `mapstructure:"path" envname:"COMMUNITY_AUTH_COOKIE_PATH" json:"path" yaml:"path" toml:"path"`
	SameSite   string `mapstructure:"same_site" envname:"COMMUNITY_AUTH_COOKIE_SAME_SITE" json:"same_site" yaml:"same_site" toml:"same_site"`
	Secure     bool   `mapstructure:"secure" envname:"COMMUNITY_AUTH_COOKIE_SECURE" json:"secure" yaml:"secure" toml:"secure"`
}

type CommunityAuthCSRFConfig struct {
	Enabled    *bool  `mapstructure:"enabled" envname:"COMMUNITY_AUTH_CSRF_ENABLED" json:"enabled" yaml:"enabled" toml:"enabled"`
	CookieName string `mapstructure:"cookie_name" envname:"COMMUNITY_AUTH_CSRF_COOKIE_NAME" json:"cookie_name" yaml:"cookie_name" toml:"cookie_name"`
	HeaderName string `mapstructure:"header_name" envname:"COMMUNITY_AUTH_CSRF_HEADER_NAME" json:"header_name" yaml:"header_name" toml:"header_name"`
}

type CommunityVideoConfig struct {
	Mode   string                     `mapstructure:"mode" envname:"COMMUNITY_VIDEO_MODE" json:"mode" yaml:"mode" toml:"mode"`
	Worker CommunityVideoWorkerConfig `mapstructure:"worker" json:"worker" yaml:"worker" toml:"worker"`
	Local  CommunityVideoLocalConfig  `mapstructure:"local" json:"local" yaml:"local" toml:"local"`
	HLS    CommunityVideoHLSConfig    `mapstructure:"hls" json:"hls" yaml:"hls" toml:"hls"`
	Cloud  CommunityVideoCloudConfig  `mapstructure:"cloud" json:"cloud" yaml:"cloud" toml:"cloud"`
}

type CommunityVideoWorkerConfig struct {
	Enabled                *bool  `mapstructure:"enabled" envname:"COMMUNITY_VIDEO_WORKER_ENABLED" json:"enabled" yaml:"enabled" toml:"enabled"`
	PollIntervalSeconds    int    `mapstructure:"pollIntervalSeconds" envname:"COMMUNITY_VIDEO_WORKER_POLL_INTERVAL_SECONDS" json:"pollIntervalSeconds" yaml:"pollIntervalSeconds" toml:"pollIntervalSeconds"`
	BatchSize              int    `mapstructure:"batchSize" envname:"COMMUNITY_VIDEO_WORKER_BATCH_SIZE" json:"batchSize" yaml:"batchSize" toml:"batchSize"`
	LeaseTimeoutSeconds    int    `mapstructure:"leaseTimeoutSeconds" envname:"COMMUNITY_VIDEO_WORKER_LEASE_TIMEOUT_SECONDS" json:"leaseTimeoutSeconds" yaml:"leaseTimeoutSeconds" toml:"leaseTimeoutSeconds"`
	MaxAttempts            int    `mapstructure:"maxAttempts" envname:"COMMUNITY_VIDEO_WORKER_MAX_ATTEMPTS" json:"maxAttempts" yaml:"maxAttempts" toml:"maxAttempts"`
	RetryDelaySeconds      int    `mapstructure:"retryDelaySeconds" envname:"COMMUNITY_VIDEO_WORKER_RETRY_DELAY_SECONDS" json:"retryDelaySeconds" yaml:"retryDelaySeconds" toml:"retryDelaySeconds"`
	ExecutorPool           string `mapstructure:"executorPool" envname:"COMMUNITY_VIDEO_WORKER_EXECUTOR_POOL" json:"executorPool" yaml:"executorPool" toml:"executorPool"`
	DispatchTimeoutSeconds int    `mapstructure:"dispatchTimeoutSeconds" envname:"COMMUNITY_VIDEO_WORKER_DISPATCH_TIMEOUT_SECONDS" json:"dispatchTimeoutSeconds" yaml:"dispatchTimeoutSeconds" toml:"dispatchTimeoutSeconds"`
	CallbackMaxSkewSeconds int    `mapstructure:"callbackMaxSkewSeconds" envname:"COMMUNITY_VIDEO_WORKER_CALLBACK_MAX_SKEW_SECONDS" json:"callbackMaxSkewSeconds" yaml:"callbackMaxSkewSeconds" toml:"callbackMaxSkewSeconds"`
}

type CommunityVideoLocalConfig struct {
	FFmpegPath    string `mapstructure:"ffmpegPath" envname:"COMMUNITY_VIDEO_LOCAL_FFMPEG_PATH" json:"ffmpegPath" yaml:"ffmpegPath" toml:"ffmpegPath"`
	FFprobePath   string `mapstructure:"ffprobePath" envname:"COMMUNITY_VIDEO_LOCAL_FFPROBE_PATH" json:"ffprobePath" yaml:"ffprobePath" toml:"ffprobePath"`
	OutputRoot    string `mapstructure:"outputRoot" envname:"COMMUNITY_VIDEO_LOCAL_OUTPUT_ROOT" json:"outputRoot" yaml:"outputRoot" toml:"outputRoot"`
	SourceRoot    string `mapstructure:"sourceRoot" envname:"COMMUNITY_VIDEO_LOCAL_SOURCE_ROOT" json:"sourceRoot" yaml:"sourceRoot" toml:"sourceRoot"`
	PublicBaseURL string `mapstructure:"publicBaseUrl" envname:"COMMUNITY_VIDEO_LOCAL_PUBLIC_BASE_URL" json:"publicBaseUrl" yaml:"publicBaseUrl" toml:"publicBaseUrl"`
}

type CommunityVideoHLSConfig struct {
	SegmentSeconds int                          `mapstructure:"segmentSeconds" envname:"COMMUNITY_VIDEO_HLS_SEGMENT_SECONDS" json:"segmentSeconds" yaml:"segmentSeconds" toml:"segmentSeconds"`
	Renditions     []CommunityVideoHLSRendition `mapstructure:"renditions" json:"renditions" yaml:"renditions" toml:"renditions"`
}

type CommunityVideoHLSRendition struct {
	Label     string `mapstructure:"label" json:"label" yaml:"label" toml:"label"`
	Width     int    `mapstructure:"width" json:"width" yaml:"width" toml:"width"`
	Height    int    `mapstructure:"height" json:"height" yaml:"height" toml:"height"`
	VideoKbps int    `mapstructure:"videoKbps" json:"videoKbps" yaml:"videoKbps" toml:"videoKbps"`
	AudioKbps int    `mapstructure:"audioKbps" json:"audioKbps" yaml:"audioKbps" toml:"audioKbps"`
}

type CommunityVideoCloudConfig struct {
	Provider        string `mapstructure:"provider" envname:"COMMUNITY_VIDEO_CLOUD_PROVIDER" json:"provider" yaml:"provider" toml:"provider"`
	ObjectStorage   string `mapstructure:"objectStorage" envname:"COMMUNITY_VIDEO_CLOUD_OBJECT_STORAGE" json:"objectStorage" yaml:"objectStorage" toml:"objectStorage"`
	Bucket          string `mapstructure:"bucket" envname:"COMMUNITY_VIDEO_CLOUD_BUCKET" json:"bucket" yaml:"bucket" toml:"bucket"`
	CDNBaseURL      string `mapstructure:"cdnBaseUrl" envname:"COMMUNITY_VIDEO_CLOUD_CDN_BASE_URL" json:"cdnBaseUrl" yaml:"cdnBaseUrl" toml:"cdnBaseUrl"`
	DispatchURL     string `mapstructure:"dispatchUrl" envname:"COMMUNITY_VIDEO_CLOUD_DISPATCH_URL" json:"dispatchUrl" yaml:"dispatchUrl" toml:"dispatchUrl"`
	DispatchSecret  string `mapstructure:"dispatchSecret" envname:"COMMUNITY_VIDEO_CLOUD_DISPATCH_SECRET" json:"dispatchSecret" yaml:"dispatchSecret" toml:"dispatchSecret"`
	CallbackBaseURL string `mapstructure:"callbackBaseUrl" envname:"COMMUNITY_VIDEO_CLOUD_CALLBACK_BASE_URL" json:"callbackBaseUrl" yaml:"callbackBaseUrl" toml:"callbackBaseUrl"`
	CallbackSecret  string `mapstructure:"callbackSecret" envname:"COMMUNITY_VIDEO_CLOUD_CALLBACK_SECRET" json:"callbackSecret" yaml:"callbackSecret" toml:"callbackSecret"`
}

func (c CommunityAuthCSRFConfig) EnabledValue() bool {
	if c.Enabled == nil {
		return true
	}
	return *c.Enabled
}

func (c CommunityVideoWorkerConfig) EnabledValue() bool {
	if c.Enabled == nil {
		return true
	}
	return *c.Enabled
}

func (c *CommunityConfig) ValidateName() string {
	return AppCommunityName
}

func (c *CommunityConfig) ValidateRequired() bool {
	return false
}

func (c *CommunityConfig) Validate() error {
	c.ApplyDefaults()
	if c.Auth.AccessTokenTTLSeconds <= 0 || c.Auth.RefreshTokenTTLSeconds <= 0 {
		return fmt.Errorf("auth token ttl values must be positive")
	}
	if strings.TrimSpace(c.Auth.Cookie.NamePrefix) == "" {
		return fmt.Errorf("auth.cookie.name_prefix is required")
	}
	if strings.TrimSpace(c.Auth.Cookie.Path) == "" {
		return fmt.Errorf("auth.cookie.path is required")
	}
	if !validCookieSameSite(c.Auth.Cookie.SameSite) {
		return fmt.Errorf("auth.cookie.same_site must be one of lax, strict, none")
	}
	if c.Auth.CSRF.EnabledValue() {
		if strings.TrimSpace(c.Auth.CSRF.CookieName) == "" || strings.TrimSpace(c.Auth.CSRF.HeaderName) == "" {
			return fmt.Errorf("auth.csrf cookie_name and header_name are required when csrf is enabled")
		}
	}
	if strings.TrimSpace(c.Auth.DefaultClientType) == "" {
		return fmt.Errorf("auth.default_client_type is required")
	}
	switch c.Video.Mode {
	case "local":
		if strings.TrimSpace(c.Video.Local.FFmpegPath) == "" || strings.TrimSpace(c.Video.Local.FFprobePath) == "" {
			return fmt.Errorf("video.local ffmpegPath and ffprobePath are required")
		}
		if strings.TrimSpace(c.Video.Local.OutputRoot) == "" || strings.TrimSpace(c.Video.Local.SourceRoot) == "" {
			return fmt.Errorf("video.local outputRoot and sourceRoot are required")
		}
		if strings.TrimSpace(c.Video.Local.PublicBaseURL) == "" {
			return fmt.Errorf("video.local.publicBaseUrl is required")
		}
	case "cloud":
		if strings.TrimSpace(c.Video.Cloud.Provider) == "" {
			return fmt.Errorf("video.cloud.provider is required when video.mode is cloud")
		}
		if strings.TrimSpace(c.Video.Cloud.DispatchURL) == "" {
			return fmt.Errorf("video.cloud.dispatchUrl is required when video.mode is cloud")
		}
		if strings.TrimSpace(c.Video.Cloud.DispatchSecret) == "" || strings.TrimSpace(c.Video.Cloud.CallbackSecret) == "" {
			return fmt.Errorf("video.cloud dispatchSecret and callbackSecret are required when video.mode is cloud")
		}
	default:
		return fmt.Errorf("video.mode must be one of: local, cloud")
	}
	if c.Video.Worker.PollIntervalSeconds <= 0 || c.Video.Worker.BatchSize <= 0 || c.Video.Worker.LeaseTimeoutSeconds <= 0 || c.Video.Worker.MaxAttempts <= 0 || c.Video.Worker.RetryDelaySeconds <= 0 || c.Video.Worker.DispatchTimeoutSeconds <= 0 || c.Video.Worker.CallbackMaxSkewSeconds <= 0 {
		return fmt.Errorf("video.worker numeric values must be positive")
	}
	if strings.TrimSpace(c.Video.Worker.ExecutorPool) == "" {
		return fmt.Errorf("video.worker.executorPool is required")
	}
	if c.Video.HLS.SegmentSeconds <= 0 {
		return fmt.Errorf("video.hls.segmentSeconds must be positive")
	}
	if len(c.Video.HLS.Renditions) == 0 {
		return fmt.Errorf("video.hls.renditions must not be empty")
	}
	for _, rendition := range c.Video.HLS.Renditions {
		if strings.TrimSpace(rendition.Label) == "" || rendition.Width <= 0 || rendition.Height <= 0 || rendition.VideoKbps <= 0 {
			return fmt.Errorf("video.hls.renditions entries require label, width, height and videoKbps")
		}
	}
	return nil
}

func (c *CommunityConfig) ApplyDefaults() {
	if c.Auth.AccessTokenTTLSeconds == 0 {
		c.Auth.AccessTokenTTLSeconds = DefaultCommunityAuthAccessTokenTTLSeconds
	}
	if c.Auth.RefreshTokenTTLSeconds == 0 {
		c.Auth.RefreshTokenTTLSeconds = DefaultCommunityAuthRefreshTokenTTLSeconds
	}
	if strings.TrimSpace(c.Auth.Cookie.NamePrefix) == "" {
		c.Auth.Cookie.NamePrefix = DefaultCommunityAuthCookieNamePrefix
	}
	if strings.TrimSpace(c.Auth.Cookie.Path) == "" {
		c.Auth.Cookie.Path = DefaultCommunityAuthCookiePath
	}
	if strings.TrimSpace(c.Auth.Cookie.SameSite) == "" {
		c.Auth.Cookie.SameSite = DefaultCommunityAuthCookieSameSite
	}
	c.Auth.Cookie.SameSite = strings.ToLower(strings.TrimSpace(c.Auth.Cookie.SameSite))
	if strings.TrimSpace(c.Auth.CSRF.CookieName) == "" {
		c.Auth.CSRF.CookieName = DefaultCommunityAuthCSRFCookieName
	}
	if strings.TrimSpace(c.Auth.CSRF.HeaderName) == "" {
		c.Auth.CSRF.HeaderName = DefaultCommunityAuthCSRFHeaderName
	}
	if strings.TrimSpace(c.Auth.DefaultClientType) == "" {
		c.Auth.DefaultClientType = DefaultCommunityAuthClientType
	}
	c.Video.Mode = strings.ToLower(strings.TrimSpace(c.Video.Mode))
	if c.Video.Mode == "" {
		c.Video.Mode = DefaultCommunityVideoMode
	}
	if c.Video.Worker.Enabled == nil {
		enabled := true
		c.Video.Worker.Enabled = &enabled
	}
	if c.Video.Worker.PollIntervalSeconds == 0 {
		c.Video.Worker.PollIntervalSeconds = DefaultCommunityVideoWorkerPollSeconds
	}
	if c.Video.Worker.BatchSize == 0 {
		c.Video.Worker.BatchSize = DefaultCommunityVideoWorkerBatchSize
	}
	if c.Video.Worker.LeaseTimeoutSeconds == 0 {
		c.Video.Worker.LeaseTimeoutSeconds = DefaultCommunityVideoWorkerLeaseSeconds
	}
	if c.Video.Worker.MaxAttempts == 0 {
		c.Video.Worker.MaxAttempts = DefaultCommunityVideoWorkerMaxAttempts
	}
	if c.Video.Worker.RetryDelaySeconds == 0 {
		c.Video.Worker.RetryDelaySeconds = DefaultCommunityVideoWorkerRetryDelaySeconds
	}
	if strings.TrimSpace(c.Video.Worker.ExecutorPool) == "" {
		c.Video.Worker.ExecutorPool = DefaultCommunityVideoWorkerExecutorPool
	}
	if c.Video.Worker.DispatchTimeoutSeconds == 0 {
		c.Video.Worker.DispatchTimeoutSeconds = DefaultCommunityVideoWorkerDispatchTimeoutSeconds
	}
	if c.Video.Worker.CallbackMaxSkewSeconds == 0 {
		c.Video.Worker.CallbackMaxSkewSeconds = DefaultCommunityVideoWorkerCallbackMaxSkewSeconds
	}
	if strings.TrimSpace(c.Video.Local.FFmpegPath) == "" {
		c.Video.Local.FFmpegPath = DefaultCommunityVideoLocalFFmpegPath
	}
	if strings.TrimSpace(c.Video.Local.FFprobePath) == "" {
		c.Video.Local.FFprobePath = DefaultCommunityVideoLocalFFprobePath
	}
	if strings.TrimSpace(c.Video.Local.OutputRoot) == "" {
		c.Video.Local.OutputRoot = DefaultCommunityVideoLocalOutputRoot
	}
	if strings.TrimSpace(c.Video.Local.SourceRoot) == "" {
		c.Video.Local.SourceRoot = DefaultCommunityVideoLocalSourceRoot
	}
	if strings.TrimSpace(c.Video.Local.PublicBaseURL) == "" {
		c.Video.Local.PublicBaseURL = DefaultCommunityVideoLocalPublicBaseURL
	}
	if c.Video.HLS.SegmentSeconds == 0 {
		c.Video.HLS.SegmentSeconds = DefaultCommunityVideoHLSSegmentSeconds
	}
	if len(c.Video.HLS.Renditions) == 0 {
		c.Video.HLS.Renditions = []CommunityVideoHLSRendition{
			{Label: "360p", Width: 640, Height: 360, VideoKbps: 800, AudioKbps: 96},
			{Label: "720p", Width: 1280, Height: 720, VideoKbps: 2800, AudioKbps: 128},
			{Label: "1080p", Width: 1920, Height: 1080, VideoKbps: 5000, AudioKbps: 160},
		}
	}
}
