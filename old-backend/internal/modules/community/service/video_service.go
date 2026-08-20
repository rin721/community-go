package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
	authtypes "github.com/open-console/console-platform/types/auth"
)

type MediaStorage interface {
	ReadFile(string) ([]byte, error)
	WriteFile(string, []byte, os.FileMode) error
	MkdirAll(string, os.FileMode) error
}

type VideoService interface {
	UploadSource(context.Context, authtypes.Principal, UploadSourceInput) (model.CommunitySubmissionUploadResult, error)
	CreateTranscodeJob(context.Context, authtypes.Principal, string, model.CreateCommunityVideoJobRequest) (model.CommunityVideoJobItem, error)
	ListJobs(context.Context, model.CommunityVideoJobFilter) (model.CommunityVideoJobPayload, error)
	GetJob(context.Context, string) (model.CommunityVideoJobItem, error)
	RetryJob(context.Context, authtypes.Principal, string) (model.CommunityVideoJobItem, error)
	ClaimJobs(context.Context, VideoJobClaimInput) ([]string, error)
	ProcessJob(context.Context, VideoJobProcessInput) error
	HandleCallback(context.Context, string, VideoJobCallbackInput) (model.CommunityVideoJobItem, error)
	GetAsset(context.Context, string) (VideoAsset, error)
	GetSourceAsset(context.Context, string) (VideoAsset, error)
}

type UploadSourceInput struct {
	Filename    string
	ContentType string
	Size        int64
	Reader      io.Reader
}

type VideoAsset struct {
	ContentType string
	Data        []byte
}

type VideoConfig struct {
	Mode          string
	LocalBasePath string
	LocalFSType   string
	Worker        VideoWorkerConfig
	Local         VideoLocalConfig
	HLS           VideoHLSConfig
	Cloud         VideoCloudConfig
}

type VideoWorkerConfig struct {
	Enabled         bool
	PollInterval    time.Duration
	BatchSize       int
	LeaseTimeout    time.Duration
	MaxAttempts     int
	RetryDelay      time.Duration
	ExecutorPool    string
	DispatchTimeout time.Duration
	CallbackMaxSkew time.Duration
}

type VideoLocalConfig struct {
	FFmpegPath    string
	FFprobePath   string
	OutputRoot    string
	SourceRoot    string
	PublicBaseURL string
}

type VideoHLSConfig struct {
	SegmentSeconds int
	Renditions     []VideoRenditionConfig
}

type VideoRenditionConfig struct {
	Label     string
	Width     int
	Height    int
	VideoKbps int
	AudioKbps int
}

type VideoCloudConfig struct {
	Provider        string
	ObjectStorage   string
	Bucket          string
	CDNBaseURL      string
	DispatchURL     string
	DispatchSecret  string
	CallbackBaseURL string
	CallbackSecret  string
}

type VideoJobClaimInput struct {
	WorkerID     string
	Limit        int
	LeaseTimeout time.Duration
}

type VideoJobProcessInput struct {
	WorkerID string
	JobID    string
}

type VideoJobCallbackInput struct {
	Timestamp string
	Signature string
	Body      []byte
}

type storedVideoJobRequest struct {
	Request    model.CreateCommunityVideoJobRequest `json:"request"`
	ReviewerID string                               `json:"reviewerId"`
}

type configuredVideoService struct {
	app      *service
	cfg      VideoConfig
	provider videoProvider
}

type videoProvider interface {
	Name() string
	Transcode(context.Context, model.CommunityVideoJob, model.CommunitySubmission, model.CommunityMediaAsset, model.CreateCommunityVideoJobRequest) (videoTranscodeResult, error)
}

type videoTranscodeResult struct {
	DurationSeconds  int
	ThumbnailURL     string
	MasterURL        string
	OutputStorageKey string
	Renditions       []model.CommunityVideoRendition
}

func newConfiguredVideoService(app *service, cfg VideoConfig) VideoService {
	cfg = normalizeVideoConfig(cfg)
	v := &configuredVideoService{app: app, cfg: cfg}
	switch cfg.Mode {
	case model.CommunityVideoProviderCloud:
		v.provider = cloudVideoProvider{cfg: cfg}
	default:
		v.provider = localVideoProvider{cfg: cfg, storage: app.cfg.Storage}
	}
	return v
}

func normalizeVideoConfig(cfg VideoConfig) VideoConfig {
	cfg.Mode = strings.ToLower(strings.TrimSpace(cfg.Mode))
	if cfg.Mode == "" {
		cfg.Mode = model.CommunityVideoProviderLocal
	}
	if cfg.Worker.PollInterval <= 0 {
		cfg.Worker.PollInterval = 5 * time.Second
	}
	if cfg.Worker.BatchSize <= 0 {
		cfg.Worker.BatchSize = 2
	}
	if cfg.Worker.LeaseTimeout <= 0 {
		cfg.Worker.LeaseTimeout = 30 * time.Minute
	}
	if cfg.Worker.MaxAttempts <= 0 {
		cfg.Worker.MaxAttempts = 3
	}
	if cfg.Worker.RetryDelay <= 0 {
		cfg.Worker.RetryDelay = time.Minute
	}
	if strings.TrimSpace(cfg.Worker.ExecutorPool) == "" {
		cfg.Worker.ExecutorPool = "background"
	}
	if cfg.Worker.DispatchTimeout <= 0 {
		cfg.Worker.DispatchTimeout = 30 * time.Second
	}
	if cfg.Worker.CallbackMaxSkew <= 0 {
		cfg.Worker.CallbackMaxSkew = 10 * time.Minute
	}
	if strings.TrimSpace(cfg.Local.FFmpegPath) == "" {
		cfg.Local.FFmpegPath = "ffmpeg"
	}
	if strings.TrimSpace(cfg.Local.FFprobePath) == "" {
		cfg.Local.FFprobePath = "ffprobe"
	}
	if strings.TrimSpace(cfg.Local.SourceRoot) == "" {
		cfg.Local.SourceRoot = "community/sources"
	}
	if strings.TrimSpace(cfg.Local.OutputRoot) == "" {
		cfg.Local.OutputRoot = "community/hls"
	}
	if strings.TrimSpace(cfg.Local.PublicBaseURL) == "" {
		cfg.Local.PublicBaseURL = "/api/v1/public/community/hls"
	}
	if cfg.HLS.SegmentSeconds <= 0 {
		cfg.HLS.SegmentSeconds = 6
	}
	if len(cfg.HLS.Renditions) == 0 {
		cfg.HLS.Renditions = []VideoRenditionConfig{
			{Label: "360p", Width: 640, Height: 360, VideoKbps: 800, AudioKbps: 96},
			{Label: "720p", Width: 1280, Height: 720, VideoKbps: 2800, AudioKbps: 128},
			{Label: "1080p", Width: 1920, Height: 1080, VideoKbps: 5000, AudioKbps: 160},
		}
	}
	return cfg
}

func (v *configuredVideoService) UploadSource(ctx context.Context, principal authtypes.Principal, input UploadSourceInput) (model.CommunitySubmissionUploadResult, error) {
	if v.app == nil || v.app.repo == nil || v.app.cfg.Storage == nil {
		return model.CommunitySubmissionUploadResult{}, ErrStorageUnavailable
	}
	if _, err := communityAccountClientID(principal); err != nil {
		return model.CommunitySubmissionUploadResult{}, err
	}
	filename := cleanUploadFilename(input.Filename)
	if filename == "" || input.Reader == nil {
		return model.CommunitySubmissionUploadResult{}, ErrInvalidInput
	}
	data, err := io.ReadAll(input.Reader)
	if err != nil {
		return model.CommunitySubmissionUploadResult{}, err
	}
	if len(data) == 0 {
		return model.CommunitySubmissionUploadResult{}, ErrInvalidInput
	}
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := normalizeUploadedVideoMIME(input.ContentType, data)
	isImage := strings.HasPrefix(contentType, "image/") || strings.HasPrefix(input.ContentType, "image/")
	if !isImage {
		if !strings.HasPrefix(contentType, "video/") {
			contentType = videoMIMEFromExtension(ext)
		}
		if !strings.HasPrefix(contentType, "video/") {
			return model.CommunitySubmissionUploadResult{}, ErrInvalidInput
		}
	}
	now := v.app.now()
	id := v.app.newMediaAssetID()
	if ext == "" {
		exts, _ := mime.ExtensionsByType(contentType)
		if len(exts) > 0 {
			ext = exts[0]
		}
	}
	if ext == "" {
		ext = ".bin"
	}
	storageKey := cleanStorageKey(v.cfg.Local.SourceRoot, strconv.FormatInt(id, 10)+ext)
	if err := v.app.cfg.Storage.MkdirAll(path.Dir(storageKey), 0755); err != nil {
		return model.CommunitySubmissionUploadResult{}, mapStorageError(err)
	}
	if err := v.app.cfg.Storage.WriteFile(storageKey, data, 0644); err != nil {
		return model.CommunitySubmissionUploadResult{}, mapStorageError(err)
	}
	asset := model.CommunityMediaAsset{
		ID:                 id,
		DisplayName:        filename,
		OriginalName:       filename,
		StorageKey:         storageKey,
		URL:                "/api/v1/public/community/source-assets/" + strconv.FormatInt(id, 10),
		MIMEType:           contentType,
		Extension:          strings.TrimPrefix(ext, "."),
		SizeBytes:          int64(len(data)),
		Source:             "upload",
		External:           false,
		UploadedByUsername: communityAccountAuthorName(principal),
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := v.app.repo.CreateMediaAsset(ctx, asset); err != nil {
		return model.CommunitySubmissionUploadResult{}, mapStorageError(err)
	}
	return model.CommunitySubmissionUploadResult{
		MediaAssetID: asset.ID,
		DisplayName:  asset.DisplayName,
		OriginalName: asset.OriginalName,
		URL:          asset.URL,
		MIMEType:     asset.MIMEType,
		SizeBytes:    asset.SizeBytes,
	}, nil
}

func (v *configuredVideoService) CreateTranscodeJob(ctx context.Context, principal authtypes.Principal, submissionID string, req model.CreateCommunityVideoJobRequest) (model.CommunityVideoJobItem, error) {
	if v.app == nil || v.app.repo == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	reviewerID, err := communityReviewPrincipalID(principal)
	if err != nil {
		return model.CommunityVideoJobItem{}, err
	}
	submissionID = strings.TrimSpace(submissionID)
	if submissionID == "" {
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
	submission, err := v.app.repo.FindCommunitySubmission(ctx, submissionID)
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	if submission.Status != model.CommunitySubmissionStatusApproved {
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
	if submission.MediaAssetID <= 0 {
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
	asset, err := v.app.repo.FindMediaAssetByID(ctx, submission.MediaAssetID)
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	now := v.app.now()
	payload := storedVideoJobRequest{Request: req, ReviewerID: reviewerID}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return model.CommunityVideoJobItem{}, err
	}
	job := model.CommunityVideoJob{
		ID:               v.app.newVideoJobID(),
		SubmissionID:     submission.ID,
		MediaAssetID:     asset.ID,
		Provider:         v.provider.Name(),
		Status:           model.CommunityVideoJobStatusQueued,
		Progress:         0,
		MaxAttempts:      v.cfg.Worker.MaxAttempts,
		NextRunAt:        &now,
		InputStorageKey:  asset.StorageKey,
		OutputStorageKey: cleanStorageKey(v.cfg.Local.OutputRoot, submissionVideoOutputDir(*submission)),
		RequestPayload:   string(rawPayload),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := v.app.repo.CreateCommunityVideoJob(ctx, job); err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	return v.decorateJob(ctx, job)
}

func (v *configuredVideoService) publishTranscodedSubmission(ctx context.Context, submission model.CommunitySubmission, asset model.CommunityMediaAsset, transcode videoTranscodeResult, req model.CreateCommunityVideoJobRequest, reviewerID string) (string, error) {
	now := v.app.now()
	durationSeconds := transcode.DurationSeconds
	if req.DurationSeconds > 0 {
		durationSeconds = normalizeSubmissionReviewDuration(req.DurationSeconds)
	}
	if durationSeconds <= 0 {
		durationSeconds = 1
	}
	videoID := submissionVideoID(submission)
	slug := submissionVideoSlug(submission, req.Slug)
	thumbnailURL := transcode.ThumbnailURL
	if strings.TrimSpace(req.ThumbnailURL) != "" {
		thumbnailURL = normalizeSubmissionReviewThumbnailURL(req.ThumbnailURL, slug)
	}
	if strings.TrimSpace(thumbnailURL) == "" {
		thumbnailURL = normalizeSubmissionReviewThumbnailURL("", slug)
	}
	description := trimRunes(submission.Description, 720)
	var descriptionPtr *string
	if description != "" {
		descriptionPtr = &description
	}
	creator, err := v.app.submissionVideoCreator(ctx, submission, now)
	if err != nil {
		return "", err
	}
	video := model.Video{
		ID:              videoID,
		Slug:            slug,
		Title:           trimRunes(submission.Title, 240),
		Description:     descriptionPtr,
		ThumbnailURL:    thumbnailURL,
		DurationSeconds: durationSeconds,
		SourceURL:       transcode.MasterURL,
		PublishedAt:     now,
		UploaderID:      creator.ID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	hlsMime := "application/vnd.apple.mpegurl"
	nativeMime := optionalSourceMimeType(asset.MIMEType)
	sources := []model.VideoSourceOption{
		{
			ID:           submissionVideoSourceID(videoID),
			VideoID:      videoID,
			Src:          transcode.MasterURL,
			Kind:         model.VideoSourceKindHLS,
			Label:        "HLS",
			MimeType:     &hlsMime,
			QualityLabel: stringPtr("auto"),
			IsDefault:    true,
			Order:        10,
		},
		{
			ID:        submissionVideoNativeSourceID(videoID),
			VideoID:   videoID,
			Src:       asset.URL,
			Kind:      model.VideoSourceKindNative,
			Label:     "MP4",
			MimeType:  nativeMime,
			IsDefault: false,
			Order:     20,
		},
	}
	categorySlugs := []string{}
	if strings.TrimSpace(submission.CategorySlug) != "" {
		categorySlugs = append(categorySlugs, strings.TrimSpace(submission.CategorySlug))
	}
	if err := v.app.repo.CreateVideoFromSubmissionSources(ctx, creator, video, sources, categorySlugs, decodeSubmissionTags(submission.TagsJSON)); err != nil {
		return "", mapStorageError(err)
	}
	if err := applySubmissionReview(&submission, model.CommunitySubmissionStatusPublished, submission.ReviewNote, reviewerID, videoID, asset.ID, now); err != nil {
		return "", err
	}
	if err := v.app.repo.UpdateCommunitySubmissionReview(ctx, submission); err != nil {
		return "", mapStorageError(err)
	}
	if err := v.app.createNotification(ctx, submissionReviewNotification(submission)); err != nil {
		return "", err
	}
	return videoID, nil
}

func (v *configuredVideoService) completeTranscodeJob(ctx context.Context, job model.CommunityVideoJob, submission model.CommunitySubmission, asset model.CommunityMediaAsset, transcode videoTranscodeResult, req model.CreateCommunityVideoJobRequest, reviewerID string) error {
	videoID, err := v.publishTranscodedSubmission(ctx, submission, asset, transcode, req, reviewerID)
	if err != nil {
		finished := v.app.now()
		job.Status = model.CommunityVideoJobStatusFailed
		job.Progress = 100
		job.ErrorMessage = trimRunes(err.Error(), 1200)
		job.FailureCode = "publish_failed"
		job.LockedBy = ""
		job.LockedAt = nil
		job.HeartbeatAt = nil
		job.FinishedAt = &finished
		job.UpdatedAt = finished
		if updateErr := v.app.repo.UpdateCommunityVideoJob(ctx, job); updateErr != nil {
			return mapStorageError(updateErr)
		}
		return err
	}
	for i := range transcode.Renditions {
		transcode.Renditions[i].JobID = job.ID
		transcode.Renditions[i].VideoID = videoID
	}
	if len(transcode.Renditions) > 0 {
		if err := v.app.repo.CreateCommunityVideoRenditions(ctx, transcode.Renditions); err != nil {
			return mapStorageError(err)
		}
	}
	finished := v.app.now()
	job.Status = model.CommunityVideoJobStatusSucceeded
	job.Progress = 100
	job.VideoID = videoID
	job.OutputStorageKey = firstNonEmpty(transcode.OutputStorageKey, job.OutputStorageKey)
	job.OutputPublicURL = transcode.MasterURL
	job.ErrorMessage = ""
	job.FailureCode = ""
	job.LockedBy = ""
	job.LockedAt = nil
	job.HeartbeatAt = nil
	job.FinishedAt = &finished
	job.UpdatedAt = finished
	return mapStorageError(v.app.repo.UpdateCommunityVideoJob(ctx, job))
}

func (v *configuredVideoService) failOrRetryJob(ctx context.Context, job model.CommunityVideoJob, code string, cause error) error {
	now := v.app.now()
	message := ""
	if cause != nil {
		message = cause.Error()
	}
	job.ErrorMessage = trimRunes(message, 1200)
	job.FailureCode = trimRunes(code, 96)
	job.LockedBy = ""
	job.LockedAt = nil
	job.HeartbeatAt = nil
	job.UpdatedAt = now
	if job.MaxAttempts <= 0 {
		job.MaxAttempts = v.cfg.Worker.MaxAttempts
	}
	if job.Attempt < job.MaxAttempts {
		next := now.Add(time.Duration(job.Attempt) * v.cfg.Worker.RetryDelay)
		job.Status = model.CommunityVideoJobStatusQueued
		job.Progress = 0
		job.NextRunAt = &next
		job.FinishedAt = nil
	} else {
		job.Status = model.CommunityVideoJobStatusFailed
		job.Progress = 100
		job.FinishedAt = &now
	}
	if err := v.app.repo.UpdateCommunityVideoJob(ctx, job); err != nil {
		return mapStorageError(err)
	}
	return cause
}

func (v *configuredVideoService) dispatchCloudJob(ctx context.Context, job model.CommunityVideoJob, submission model.CommunitySubmission, asset model.CommunityMediaAsset, req model.CreateCommunityVideoJobRequest) error {
	dispatchURL := strings.TrimSpace(v.cfg.Cloud.DispatchURL)
	secret := strings.TrimSpace(v.cfg.Cloud.DispatchSecret)
	if dispatchURL == "" || secret == "" {
		return ErrStorageUnavailable
	}
	callbackPath := publicURL("/api/v1/public/community/video-jobs", job.ID+"/callback")
	callbackURL := callbackPath
	if base := strings.TrimSpace(v.cfg.Cloud.CallbackBaseURL); base != "" {
		callbackURL = publicURL(base, "api/v1/public/community/video-jobs/"+job.ID+"/callback")
	}
	payload := map[string]any{
		"jobId":            job.ID,
		"submissionId":     submission.ID,
		"mediaAssetId":     asset.ID,
		"provider":         v.cfg.Cloud.Provider,
		"sourceUrl":        asset.URL,
		"sourceStorageKey": asset.StorageKey,
		"outputStorageKey": job.OutputStorageKey,
		"callbackPath":     callbackPath,
		"callbackUrl":      callbackURL,
		"durationSeconds":  req.DurationSeconds,
		"thumbnailUrl":     req.ThumbnailURL,
		"slug":             req.Slug,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	timeout := v.cfg.Worker.DispatchTimeout
	dispatchCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	httpReq, err := http.NewRequestWithContext(dispatchCtx, http.MethodPost, dispatchURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	timestamp := strconv.FormatInt(v.app.now().Unix(), 10)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Community-Video-Timestamp", timestamp)
	httpReq.Header.Set("X-Community-Video-Signature", signVideoWebhook(timestamp, body, secret))
	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if readErr != nil {
		return readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("cloud dispatch returned HTTP %d: %s", resp.StatusCode, trimRunes(string(respBody), 600))
	}
	var dispatchResp struct {
		ProviderJobID string `json:"providerJobId"`
		Status        string `json:"status"`
		Progress      int    `json:"progress"`
	}
	if len(strings.TrimSpace(string(respBody))) > 0 {
		if err := json.Unmarshal(respBody, &dispatchResp); err != nil {
			return err
		}
	}
	now := v.app.now()
	job.ProviderJobID = strings.TrimSpace(dispatchResp.ProviderJobID)
	job.Status = model.CommunityVideoJobStatusRunning
	job.Progress = clampProgress(dispatchResp.Progress, 10, 99)
	job.HeartbeatAt = &now
	job.UpdatedAt = now
	return mapStorageError(v.app.repo.UpdateCommunityVideoJob(ctx, job))
}

func (v *configuredVideoService) ListJobs(ctx context.Context, filter model.CommunityVideoJobFilter) (model.CommunityVideoJobPayload, error) {
	if v.app == nil || v.app.repo == nil {
		return model.CommunityVideoJobPayload{}, ErrStorageUnavailable
	}
	filter.Status = strings.TrimSpace(filter.Status)
	filter.Limit = normalizeLimit(filter.Limit, 48)
	jobs, err := v.app.repo.ListCommunityVideoJobs(ctx, filter)
	if err != nil {
		return model.CommunityVideoJobPayload{}, mapStorageError(err)
	}
	items := make([]model.CommunityVideoJobItem, 0, len(jobs))
	for _, job := range jobs {
		item, err := v.decorateJob(ctx, job)
		if err != nil {
			return model.CommunityVideoJobPayload{}, err
		}
		items = append(items, item)
	}
	return model.CommunityVideoJobPayload{Items: model.PageResult[model.CommunityVideoJobItem]{Items: items}}, nil
}

func (v *configuredVideoService) GetJob(ctx context.Context, jobID string) (model.CommunityVideoJobItem, error) {
	if v.app == nil || v.app.repo == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	job, err := v.app.repo.FindCommunityVideoJob(ctx, strings.TrimSpace(jobID))
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	return v.decorateJob(ctx, *job)
}

func (v *configuredVideoService) RetryJob(ctx context.Context, principal authtypes.Principal, jobID string) (model.CommunityVideoJobItem, error) {
	job, err := v.app.repo.FindCommunityVideoJob(ctx, strings.TrimSpace(jobID))
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	if job.Status != model.CommunityVideoJobStatusFailed {
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
	return v.CreateTranscodeJob(ctx, principal, job.SubmissionID, model.CreateCommunityVideoJobRequest{})
}

func (v *configuredVideoService) ClaimJobs(ctx context.Context, input VideoJobClaimInput) ([]string, error) {
	if v.app == nil || v.app.repo == nil {
		return nil, ErrStorageUnavailable
	}
	workerID := strings.TrimSpace(input.WorkerID)
	if workerID == "" {
		return nil, ErrInvalidInput
	}
	limit := input.Limit
	if limit <= 0 {
		limit = v.cfg.Worker.BatchSize
	}
	leaseTimeout := input.LeaseTimeout
	if leaseTimeout <= 0 {
		leaseTimeout = v.cfg.Worker.LeaseTimeout
	}
	jobs, err := v.app.repo.ClaimCommunityVideoJobs(ctx, workerID, v.app.now(), leaseTimeout, limit)
	if err != nil {
		return nil, mapStorageError(err)
	}
	ids := make([]string, 0, len(jobs))
	for _, job := range jobs {
		ids = append(ids, job.ID)
	}
	return ids, nil
}

func (v *configuredVideoService) ProcessJob(ctx context.Context, input VideoJobProcessInput) error {
	if v.app == nil || v.app.repo == nil {
		return ErrStorageUnavailable
	}
	workerID := strings.TrimSpace(input.WorkerID)
	jobID := strings.TrimSpace(input.JobID)
	if workerID == "" || jobID == "" {
		return ErrInvalidInput
	}
	job, err := v.app.repo.FindCommunityVideoJob(ctx, jobID)
	if err != nil {
		return mapStorageError(err)
	}
	if job.Status != model.CommunityVideoJobStatusQueued || job.LockedBy != workerID {
		return nil
	}
	payload, err := decodeStoredVideoJobRequest(job.RequestPayload)
	if err != nil {
		return v.failOrRetryJob(ctx, *job, "invalid_request_payload", err)
	}
	submission, err := v.app.repo.FindCommunitySubmission(ctx, job.SubmissionID)
	if err != nil {
		return v.failOrRetryJob(ctx, *job, "submission_unavailable", mapStorageError(err))
	}
	if submission.Status != model.CommunitySubmissionStatusApproved && submission.Status != model.CommunitySubmissionStatusPublished {
		return v.failOrRetryJob(ctx, *job, "submission_not_approved", ErrInvalidInput)
	}
	asset, err := v.app.repo.FindMediaAssetByID(ctx, job.MediaAssetID)
	if err != nil {
		return v.failOrRetryJob(ctx, *job, "asset_unavailable", mapStorageError(err))
	}
	now := v.app.now()
	job.Status = model.CommunityVideoJobStatusRunning
	job.Progress = 5
	job.LockedBy = workerID
	job.LockedAt = &now
	job.HeartbeatAt = &now
	job.StartedAt = firstTimePtr(job.StartedAt, now)
	job.FinishedAt = nil
	job.ErrorMessage = ""
	job.FailureCode = ""
	job.UpdatedAt = now
	if err := v.app.repo.UpdateCommunityVideoJob(ctx, *job); err != nil {
		return mapStorageError(err)
	}
	if v.provider.Name() == model.CommunityVideoProviderCloud {
		if err := v.dispatchCloudJob(ctx, *job, *submission, *asset, payload.Request); err != nil {
			return v.failOrRetryJob(ctx, *job, "cloud_dispatch_failed", err)
		}
		return nil
	}
	transcode, err := v.provider.Transcode(ctx, *job, *submission, *asset, payload.Request)
	if err != nil {
		return v.failOrRetryJob(ctx, *job, "local_transcode_failed", err)
	}
	return v.completeTranscodeJob(ctx, *job, *submission, *asset, transcode, payload.Request, payload.ReviewerID)
}

func (v *configuredVideoService) HandleCallback(ctx context.Context, jobID string, input VideoJobCallbackInput) (model.CommunityVideoJobItem, error) {
	if v.app == nil || v.app.repo == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	if err := v.verifyCallbackSignature(input); err != nil {
		return model.CommunityVideoJobItem{}, err
	}
	var req model.CommunityVideoJobCallbackRequest
	if err := json.Unmarshal(input.Body, &req); err != nil {
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
	job, err := v.app.repo.FindCommunityVideoJob(ctx, strings.TrimSpace(jobID))
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	payload, err := decodeStoredVideoJobRequest(job.RequestPayload)
	if err != nil {
		return model.CommunityVideoJobItem{}, err
	}
	now := v.app.now()
	job.CallbackReceivedAt = &now
	if strings.TrimSpace(req.ProviderJobID) != "" {
		job.ProviderJobID = strings.TrimSpace(req.ProviderJobID)
	}
	switch strings.ToLower(strings.TrimSpace(req.Status)) {
	case model.CommunityVideoJobStatusQueued, model.CommunityVideoJobStatusRunning:
		job.Status = model.CommunityVideoJobStatusRunning
		job.Progress = clampProgress(req.Progress, 10, 99)
		job.HeartbeatAt = &now
		job.UpdatedAt = now
		if err := v.app.repo.UpdateCommunityVideoJob(ctx, *job); err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		return v.decorateJob(ctx, *job)
	case model.CommunityVideoJobStatusSucceeded:
		if job.Status == model.CommunityVideoJobStatusSucceeded {
			job.CallbackReceivedAt = &now
			if strings.TrimSpace(req.ProviderJobID) != "" {
				job.ProviderJobID = strings.TrimSpace(req.ProviderJobID)
			}
			job.UpdatedAt = now
			if err := v.app.repo.UpdateCommunityVideoJob(ctx, *job); err != nil {
				return model.CommunityVideoJobItem{}, mapStorageError(err)
			}
			return v.decorateJob(ctx, *job)
		}
		submission, err := v.app.repo.FindCommunitySubmission(ctx, job.SubmissionID)
		if err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		asset, err := v.app.repo.FindMediaAssetByID(ctx, job.MediaAssetID)
		if err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		transcode := videoTranscodeResult{
			DurationSeconds:  req.DurationSeconds,
			ThumbnailURL:     req.ThumbnailURL,
			MasterURL:        req.MasterURL,
			OutputStorageKey: req.OutputStorageKey,
			Renditions:       req.Renditions,
		}
		if strings.TrimSpace(transcode.MasterURL) == "" {
			return model.CommunityVideoJobItem{}, ErrInvalidInput
		}
		if err := v.completeTranscodeJob(ctx, *job, *submission, *asset, transcode, payload.Request, payload.ReviewerID); err != nil {
			return model.CommunityVideoJobItem{}, err
		}
		updated, err := v.app.repo.FindCommunityVideoJob(ctx, job.ID)
		if err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		updated.CallbackReceivedAt = &now
		if strings.TrimSpace(req.ProviderJobID) != "" {
			updated.ProviderJobID = strings.TrimSpace(req.ProviderJobID)
		}
		updated.UpdatedAt = now
		if err := v.app.repo.UpdateCommunityVideoJob(ctx, *updated); err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		return v.decorateJob(ctx, *updated)
	case model.CommunityVideoJobStatusFailed, model.CommunityVideoJobStatusCanceled:
		job.Status = strings.ToLower(strings.TrimSpace(req.Status))
		job.Progress = 100
		job.ErrorMessage = trimRunes(req.ErrorMessage, 1200)
		job.FailureCode = trimRunes(req.FailureCode, 96)
		job.LockedBy = ""
		job.LockedAt = nil
		job.HeartbeatAt = nil
		job.FinishedAt = &now
		job.UpdatedAt = now
		if err := v.app.repo.UpdateCommunityVideoJob(ctx, *job); err != nil {
			return model.CommunityVideoJobItem{}, mapStorageError(err)
		}
		return v.decorateJob(ctx, *job)
	default:
		return model.CommunityVideoJobItem{}, ErrInvalidInput
	}
}

func (v *configuredVideoService) GetAsset(_ context.Context, assetPath string) (VideoAsset, error) {
	if v.app == nil || v.app.cfg.Storage == nil {
		return VideoAsset{}, ErrStorageUnavailable
	}
	assetPath = strings.TrimPrefix(path.Clean("/"+strings.TrimSpace(assetPath)), "/")
	if assetPath == "" || strings.Contains(assetPath, "..") {
		return VideoAsset{}, ErrInvalidInput
	}
	key := cleanStorageKey(v.cfg.Local.OutputRoot, assetPath)
	data, err := v.app.cfg.Storage.ReadFile(key)
	if err != nil {
		return VideoAsset{}, mapStorageError(err)
	}
	return VideoAsset{ContentType: communityVideoAssetMIME(key), Data: data}, nil
}

func (v *configuredVideoService) GetSourceAsset(ctx context.Context, assetID string) (VideoAsset, error) {
	if v.app == nil || v.app.repo == nil || v.app.cfg.Storage == nil {
		return VideoAsset{}, ErrStorageUnavailable
	}
	id, err := strconv.ParseInt(strings.TrimSpace(assetID), 10, 64)
	if err != nil || id <= 0 {
		return VideoAsset{}, ErrInvalidInput
	}
	asset, err := v.app.repo.FindMediaAssetByID(ctx, id)
	if err != nil {
		return VideoAsset{}, mapStorageError(err)
	}
	data, err := v.app.cfg.Storage.ReadFile(asset.StorageKey)
	if err != nil {
		return VideoAsset{}, mapStorageError(err)
	}
	return VideoAsset{ContentType: firstNonEmpty(asset.MIMEType, communityVideoAssetMIME(asset.StorageKey)), Data: data}, nil
}

func (v *configuredVideoService) decorateJob(ctx context.Context, job model.CommunityVideoJob) (model.CommunityVideoJobItem, error) {
	renditions, err := v.app.repo.ListCommunityVideoRenditions(ctx, job.ID)
	if err != nil {
		return model.CommunityVideoJobItem{}, mapStorageError(err)
	}
	return model.CommunityVideoJobItem{
		ID:                 job.ID,
		SubmissionID:       job.SubmissionID,
		MediaAssetID:       job.MediaAssetID,
		VideoID:            job.VideoID,
		Provider:           job.Provider,
		Status:             job.Status,
		Progress:           job.Progress,
		Attempt:            job.Attempt,
		MaxAttempts:        job.MaxAttempts,
		LockedBy:           job.LockedBy,
		LockedAt:           job.LockedAt,
		HeartbeatAt:        job.HeartbeatAt,
		NextRunAt:          job.NextRunAt,
		InputStorageKey:    job.InputStorageKey,
		OutputStorageKey:   job.OutputStorageKey,
		OutputPublicURL:    job.OutputPublicURL,
		RequestPayload:     job.RequestPayload,
		ProviderJobID:      job.ProviderJobID,
		CallbackReceivedAt: job.CallbackReceivedAt,
		FailureCode:        job.FailureCode,
		CancelRequestedAt:  job.CancelRequestedAt,
		ErrorMessage:       job.ErrorMessage,
		Renditions:         renditions,
		StartedAt:          job.StartedAt,
		FinishedAt:         job.FinishedAt,
		CreatedAt:          job.CreatedAt,
		UpdatedAt:          job.UpdatedAt,
	}, nil
}

type localVideoProvider struct {
	cfg     VideoConfig
	storage MediaStorage
}

func (p localVideoProvider) Name() string { return model.CommunityVideoProviderLocal }

func (p localVideoProvider) Transcode(ctx context.Context, job model.CommunityVideoJob, submission model.CommunitySubmission, asset model.CommunityMediaAsset, req model.CreateCommunityVideoJobRequest) (videoTranscodeResult, error) {
	if p.storage == nil {
		return videoTranscodeResult{}, ErrStorageUnavailable
	}
	ffmpeg, err := resolveExecutable(p.cfg.Local.FFmpegPath)
	if err != nil {
		return videoTranscodeResult{}, fmt.Errorf("ffmpeg executable unavailable: %w", err)
	}
	ffprobe, err := resolveExecutable(p.cfg.Local.FFprobePath)
	if err != nil {
		return videoTranscodeResult{}, fmt.Errorf("ffprobe executable unavailable: %w", err)
	}
	inputPath, cleanup, err := p.localReadablePath(asset.StorageKey)
	if err != nil {
		return videoTranscodeResult{}, err
	}
	if cleanup != nil {
		defer cleanup()
	}
	outputName := submissionVideoOutputDir(submission)
	outputKey := cleanStorageKey(p.cfg.Local.OutputRoot, outputName)
	outputDir := p.localPath(outputKey)
	if err := os.RemoveAll(outputDir); err != nil {
		return videoTranscodeResult{}, err
	}
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return videoTranscodeResult{}, err
	}
	duration := req.DurationSeconds
	if duration <= 0 {
		duration = probeDurationSeconds(ctx, ffprobe, inputPath)
	}
	coverPath := filepath.Join(outputDir, "cover.jpg")
	if err := runCommand(ctx, ffmpeg, "-y", "-ss", "00:00:01", "-i", inputPath, "-frames:v", "1", coverPath); err != nil {
		return videoTranscodeResult{}, fmt.Errorf("generate cover.jpg: %w", err)
	}
	renditions := make([]model.CommunityVideoRendition, 0, len(p.cfg.HLS.Renditions))
	for index, rendition := range p.cfg.HLS.Renditions {
		label := safeRenditionLabel(rendition.Label, index)
		renditionDir := filepath.Join(outputDir, label)
		if err := os.MkdirAll(renditionDir, 0755); err != nil {
			return videoTranscodeResult{}, err
		}
		segmentPattern := filepath.Join(renditionDir, "segment_%03d.ts")
		playlistPath := filepath.Join(renditionDir, "index.m3u8")
		// scale to target dimensions while preserving aspect ratio, then pad to
		// even width/height so libx264 never hits "width/height not divisible by 2".
		filter := fmt.Sprintf(
			"scale=w=%d:h=%d:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
			rendition.Width, rendition.Height,
		)
		if err := runCommand(ctx, ffmpeg,
			"-y",
			"-i", inputPath,
			// map video; use optional audio mapping so files without an audio
			// stream still succeed instead of failing with "no streams".
			"-map", "0:v:0",
			"-map", "0:a?",
			"-vf", filter,
			"-c:v", "libx264",
			"-preset", "veryfast",
			"-b:v", strconv.Itoa(rendition.VideoKbps)+"k",
			"-c:a", "aac",
			"-ac", "2",
			"-b:a", strconv.Itoa(firstPositive(rendition.AudioKbps, 128))+"k",
			"-f", "hls",
			"-hls_time", strconv.Itoa(p.cfg.HLS.SegmentSeconds),
			"-hls_playlist_type", "vod",
			"-hls_segment_filename", segmentPattern,
			playlistPath,
		); err != nil {
			return videoTranscodeResult{}, fmt.Errorf("generate %s rendition: %w", label, err)
		}

		playlistKey := cleanStorageKey(outputKey, label, "index.m3u8")
		renditions = append(renditions, model.CommunityVideoRendition{
			ID:           "rendition-" + shortHash(job.ID+":"+label),
			QualityLabel: label,
			Width:        rendition.Width,
			Height:       rendition.Height,
			BitrateKbps:  rendition.VideoKbps,
			PlaylistURL:  publicURL(p.cfg.Local.PublicBaseURL, path.Join(outputName, label, "index.m3u8")),
			StorageKey:   playlistKey,
			CreatedAt:    time.Now().UTC(),
		})
	}
	master := buildMasterPlaylist(p.cfg.HLS.Renditions)
	if err := os.WriteFile(filepath.Join(outputDir, "master.m3u8"), []byte(master), 0644); err != nil {
		return videoTranscodeResult{}, err
	}
	return videoTranscodeResult{
		DurationSeconds:  firstPositive(duration, 1),
		ThumbnailURL:     publicURL(p.cfg.Local.PublicBaseURL, path.Join(outputName, "cover.jpg")),
		MasterURL:        publicURL(p.cfg.Local.PublicBaseURL, path.Join(outputName, "master.m3u8")),
		OutputStorageKey: outputKey,
		Renditions:       renditions,
	}, nil
}

func (p localVideoProvider) localReadablePath(storageKey string) (string, func(), error) {
	localPath := p.localPath(storageKey)
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil, nil
	}
	data, err := p.storage.ReadFile(storageKey)
	if err != nil {
		return "", nil, mapStorageError(err)
	}
	tmp, err := os.CreateTemp("", "community-video-source-*"+filepath.Ext(storageKey))
	if err != nil {
		return "", nil, err
	}
	cleanup := func() { cleanupTempVideoSource(tmp.Name()) }
	if _, err := tmp.Write(data); err != nil {
		closeErr := tmp.Close()
		cleanup()
		return "", nil, errors.Join(err, closeErr)
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return "", nil, err
	}
	return tmp.Name(), cleanup, nil
}

func cleanupTempVideoSource(name string) {
	if err := os.Remove(name); err != nil && !errors.Is(err, os.ErrNotExist) {
		// Temporary source files are best-effort cleanup for transcoding cache misses.
		return
	}
}

func (p localVideoProvider) localPath(storageKey string) string {
	storageKey = filepath.FromSlash(strings.TrimPrefix(path.Clean("/"+storageKey), "/"))
	base := strings.TrimSpace(p.cfg.LocalBasePath)
	if strings.TrimSpace(p.cfg.LocalFSType) == "basepath" && base != "" {
		return filepath.Join(base, storageKey)
	}
	if base != "" {
		return filepath.Join(base, storageKey)
	}
	return storageKey
}

type cloudVideoProvider struct {
	cfg VideoConfig
}

func (p cloudVideoProvider) Name() string { return model.CommunityVideoProviderCloud }

func (p cloudVideoProvider) Transcode(context.Context, model.CommunityVideoJob, model.CommunitySubmission, model.CommunityMediaAsset, model.CreateCommunityVideoJobRequest) (videoTranscodeResult, error) {
	provider := strings.TrimSpace(p.cfg.Cloud.Provider)
	if provider == "" {
		provider = "cloud"
	}
	return videoTranscodeResult{}, fmt.Errorf("cloud video provider %q is configured but no VOD adapter is installed", provider)
}

func cleanUploadFilename(value string) string {
	value = strings.TrimSpace(filepath.Base(value))
	value = strings.ReplaceAll(value, "\x00", "")
	if value == "." || value == string(filepath.Separator) {
		return ""
	}
	return trimRunes(value, 240)
}

func normalizeUploadedVideoMIME(contentType string, data []byte) string {
	contentType = strings.TrimSpace(strings.Split(contentType, ";")[0])
	if strings.HasPrefix(strings.ToLower(contentType), "video/") || contentType == "application/vnd.apple.mpegurl" {
		return contentType
	}
	detected := http.DetectContentType(data)
	if strings.HasPrefix(strings.ToLower(detected), "video/") {
		return detected
	}
	return contentType
}

func videoMIMEFromExtension(ext string) string {
	switch strings.ToLower(strings.TrimSpace(ext)) {
	case ".mp4", ".m4v":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".webm":
		return "video/webm"
	case ".mkv":
		return "video/x-matroska"
	default:
		return ""
	}
}

func cleanStorageKey(parts ...string) string {
	joined := path.Join(parts...)
	joined = strings.TrimPrefix(path.Clean("/"+joined), "/")
	if joined == "." || strings.HasPrefix(joined, "../") {
		return ""
	}
	return joined
}

func resolveExecutable(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", ErrInvalidInput
	}
	if strings.ContainsAny(value, `/\`) {
		if _, err := os.Stat(value); err != nil {
			return "", err
		}
		return value, nil
	}
	return exec.LookPath(value)
}

func runCommand(ctx context.Context, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message != "" {
			// FFmpeg prints version/build info first; real error is at the end.
			// Keep the tail (up to 1600 runes) so the actual failure reason is visible.
			runes := []rune(message)
			const maxRunes = 1600
			if len(runes) > maxRunes {
				message = "..." + string(runes[len(runes)-maxRunes:])
			}
			return fmt.Errorf("%w: %s", err, message)
		}
		return err
	}
	return nil
}

func probeDurationSeconds(ctx context.Context, ffprobe string, inputPath string) int {
	cmd := exec.CommandContext(ctx, ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", inputPath)
	raw, err := cmd.Output()
	if err != nil {
		return 0
	}
	value, err := strconv.ParseFloat(strings.TrimSpace(string(raw)), 64)
	if err != nil || value <= 0 {
		return 0
	}
	return int(value + 0.5)
}

func safeRenditionLabel(value string, index int) string {
	label := safeASCIIIdentifier(value)
	if label == "" {
		label = strconv.Itoa(index+1) + "p"
	}
	return label
}

func buildMasterPlaylist(renditions []VideoRenditionConfig) string {
	var builder strings.Builder
	builder.WriteString("#EXTM3U\n#EXT-X-VERSION:3\n")
	for index, rendition := range renditions {
		label := safeRenditionLabel(rendition.Label, index)
		bandwidth := (rendition.VideoKbps + firstPositive(rendition.AudioKbps, 128)) * 1000
		builder.WriteString("#EXT-X-STREAM-INF:BANDWIDTH=")
		builder.WriteString(strconv.Itoa(bandwidth))
		builder.WriteString(",RESOLUTION=")
		builder.WriteString(strconv.Itoa(rendition.Width))
		builder.WriteString("x")
		builder.WriteString(strconv.Itoa(rendition.Height))
		builder.WriteString("\n")
		builder.WriteString(label)
		builder.WriteString("/index.m3u8\n")
	}
	return builder.String()
}

func publicURL(base string, subpath string) string {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	subpath = strings.TrimLeft(path.Clean("/"+subpath), "/")
	if base == "" {
		return "/" + subpath
	}
	return base + "/" + subpath
}

func decodeStoredVideoJobRequest(raw string) (storedVideoJobRequest, error) {
	var payload storedVideoJobRequest
	if strings.TrimSpace(raw) == "" {
		return payload, nil
	}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		var req model.CreateCommunityVideoJobRequest
		if legacyErr := json.Unmarshal([]byte(raw), &req); legacyErr != nil {
			return payload, err
		}
		payload.Request = req
	}
	return payload, nil
}

func firstTimePtr(value *time.Time, fallback time.Time) *time.Time {
	if value != nil {
		return value
	}
	return &fallback
}

func clampProgress(value int, minimum int, maximum int) int {
	if value < minimum {
		return minimum
	}
	if value > maximum {
		return maximum
	}
	return value
}

func signVideoWebhook(timestamp string, body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strings.TrimSpace(timestamp)))
	mac.Write([]byte("."))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func (v *configuredVideoService) verifyCallbackSignature(input VideoJobCallbackInput) error {
	secret := strings.TrimSpace(v.cfg.Cloud.CallbackSecret)
	if secret == "" {
		return ErrStorageUnavailable
	}
	timestamp := strings.TrimSpace(input.Timestamp)
	signature := strings.TrimSpace(input.Signature)
	if timestamp == "" || signature == "" || len(input.Body) == 0 {
		return ErrForbidden
	}
	unixSeconds, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrForbidden
	}
	sentAt := time.Unix(unixSeconds, 0)
	now := v.app.now()
	maxSkew := v.cfg.Worker.CallbackMaxSkew
	if maxSkew <= 0 {
		maxSkew = 10 * time.Minute
	}
	if sentAt.Before(now.Add(-maxSkew)) || sentAt.After(now.Add(maxSkew)) {
		return ErrForbidden
	}
	expected := signVideoWebhook(timestamp, input.Body, secret)
	signature = strings.TrimPrefix(signature, "sha256=")
	expected = strings.TrimPrefix(expected, "sha256=")
	expectedBytes, err := hex.DecodeString(expected)
	if err != nil {
		return ErrForbidden
	}
	actualBytes, err := hex.DecodeString(signature)
	if err != nil {
		return ErrForbidden
	}
	if !hmac.Equal(expectedBytes, actualBytes) {
		return ErrForbidden
	}
	return nil
}

func communityVideoAssetMIME(key string) string {
	switch strings.ToLower(path.Ext(key)) {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".mp4":
		return "video/mp4"
	default:
		return "application/octet-stream"
	}
}

func firstPositive(values ...int) int {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}

func stringPtr(value string) *string {
	return &value
}

func submissionVideoOutputDir(submission model.CommunitySubmission) string {
	raw := strings.TrimPrefix(submissionVideoID(submission), "video-")
	raw = safeASCIIIdentifier(raw)
	if raw == "" {
		raw = shortHash(submission.ID)
	}
	return trimRunes("video_"+raw, 96)
}

func submissionVideoNativeSourceID(videoID string) string {
	raw := strings.TrimPrefix(strings.TrimSpace(videoID), "video-")
	raw = safeASCIIIdentifier(raw)
	if raw == "" {
		raw = shortHash(videoID)
	}
	return trimRunes("source-"+raw+"-native", 96)
}

func (s *service) newMediaAssetID() int64 {
	if s.cfg.NewIntID == nil {
		return s.now().UnixNano()
	}
	if id := s.cfg.NewIntID(); id > 0 {
		return id
	}
	return s.now().UnixNano()
}

func (s *service) newVideoJobID() string {
	raw := strings.TrimSpace(s.cfg.NewID())
	if raw == "" {
		raw = strconv.FormatInt(s.now().UnixNano(), 10)
	}
	if strings.HasPrefix(raw, "video-job-") {
		return raw
	}
	return "video-job-" + raw
}

func (s *service) UploadCommunityAccountSubmissionSource(ctx context.Context, principal authtypes.Principal, input UploadSourceInput) (model.CommunitySubmissionUploadResult, error) {
	if s.video == nil {
		return model.CommunitySubmissionUploadResult{}, ErrStorageUnavailable
	}
	return s.video.UploadSource(ctx, principal, input)
}

func (s *service) CreateCommunitySubmissionTranscodeJob(ctx context.Context, principal authtypes.Principal, submissionID string, req model.CreateCommunityVideoJobRequest) (model.CommunityVideoJobItem, error) {
	if s.video == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	return s.video.CreateTranscodeJob(ctx, principal, submissionID, req)
}

func (s *service) ListCommunityVideoJobs(ctx context.Context, filter model.CommunityVideoJobFilter) (model.CommunityVideoJobPayload, error) {
	if s.video == nil {
		return model.CommunityVideoJobPayload{}, ErrStorageUnavailable
	}
	return s.video.ListJobs(ctx, filter)
}

func (s *service) GetCommunityVideoJob(ctx context.Context, jobID string) (model.CommunityVideoJobItem, error) {
	if s.video == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	return s.video.GetJob(ctx, jobID)
}

func (s *service) RetryCommunityVideoJob(ctx context.Context, principal authtypes.Principal, jobID string) (model.CommunityVideoJobItem, error) {
	if s.video == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	return s.video.RetryJob(ctx, principal, jobID)
}

func (s *service) ClaimCommunityVideoJobs(ctx context.Context, input VideoJobClaimInput) ([]string, error) {
	if s.video == nil {
		return nil, ErrStorageUnavailable
	}
	return s.video.ClaimJobs(ctx, input)
}

func (s *service) ProcessCommunityVideoJob(ctx context.Context, input VideoJobProcessInput) error {
	if s.video == nil {
		return ErrStorageUnavailable
	}
	return s.video.ProcessJob(ctx, input)
}

func (s *service) HandleCommunityVideoJobCallback(ctx context.Context, jobID string, input VideoJobCallbackInput) (model.CommunityVideoJobItem, error) {
	if s.video == nil {
		return model.CommunityVideoJobItem{}, ErrStorageUnavailable
	}
	return s.video.HandleCallback(ctx, jobID, input)
}

func (s *service) GetCommunityVideoAsset(ctx context.Context, assetPath string) (VideoAsset, error) {
	if s.video == nil {
		return VideoAsset{}, ErrStorageUnavailable
	}
	return s.video.GetAsset(ctx, assetPath)
}

func (s *service) GetCommunitySourceAsset(ctx context.Context, assetID string) (VideoAsset, error) {
	if s.video == nil {
		return VideoAsset{}, ErrStorageUnavailable
	}
	return s.video.GetSourceAsset(ctx, assetID)
}
