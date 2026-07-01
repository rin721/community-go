package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/modules/community/model"
	communityservice "github.com/open-console/console-platform/internal/modules/community/service"
	database "github.com/open-console/console-platform/internal/ports"
)

type Repository = communityservice.Repository

type repository struct {
	db database.Executor
}

func New(db database.Executor) Repository {
	return &repository{db: communityExecutor{inner: db}}
}

type communityExecutor struct {
	inner database.Executor
}

func (e communityExecutor) Create(ctx context.Context, value any) error {
	return mapStorageError(e.inner.Create(ctx, value))
}

func (e communityExecutor) Save(ctx context.Context, value any) error {
	return mapStorageError(e.inner.Save(ctx, value))
}

func (e communityExecutor) First(ctx context.Context, dest any, opts ...database.QueryOption) error {
	return mapStorageError(e.inner.First(ctx, dest, opts...))
}

func (e communityExecutor) Find(ctx context.Context, dest any, opts ...database.QueryOption) error {
	return mapStorageError(e.inner.Find(ctx, dest, opts...))
}

func (e communityExecutor) Update(ctx context.Context, model any, values map[string]any, opts ...database.QueryOption) (database.Result, error) {
	result, err := e.inner.Update(ctx, model, values, opts...)
	return result, mapStorageError(err)
}

func (e communityExecutor) Delete(ctx context.Context, model any, opts ...database.QueryOption) (database.Result, error) {
	result, err := e.inner.Delete(ctx, model, opts...)
	return result, mapStorageError(err)
}

func (e communityExecutor) Exec(ctx context.Context, sql string, args ...any) (database.Result, error) {
	result, err := e.inner.Exec(ctx, sql, args...)
	return result, mapStorageError(err)
}

func (e communityExecutor) Raw(ctx context.Context, dest any, sql string, args ...any) (database.Result, error) {
	result, err := e.inner.Raw(ctx, dest, sql, args...)
	return result, mapStorageError(err)
}

func (e communityExecutor) Count(ctx context.Context, model any, opts ...database.QueryOption) (int64, error) {
	count, err := e.inner.Count(ctx, model, opts...)
	return count, mapStorageError(err)
}

func (e communityExecutor) HasTable(ctx context.Context, model any) (bool, error) {
	ok, err := e.inner.HasTable(ctx, model)
	return ok, mapStorageError(err)
}

func (e communityExecutor) WithTx(ctx context.Context, fn database.TxFunc) error {
	tx, ok := e.inner.(interface {
		WithTx(context.Context, database.TxFunc) error
	})
	if !ok {
		return fn(ctx, e)
	}
	return mapStorageError(tx.WithTx(ctx, func(ctx context.Context, executor database.Executor) error {
		return fn(ctx, communityExecutor{inner: executor})
	}))
}

func (r *repository) ListCreators(ctx context.Context, limit int) ([]model.Creator, error) {
	opts := []database.QueryOption{alive(), database.Order("follower_count DESC, joined_at ASC")}
	if limit > 0 {
		opts = append(opts, database.Limit(limit))
	}
	var creators []model.Creator
	err := r.db.Find(ctx, &creators, opts...)
	return creators, err
}

func (r *repository) CreateCommunityAccount(ctx context.Context, account model.CommunityAccount) error {
	return r.db.Create(ctx, &account)
}

func (r *repository) FindCommunityAccountByID(ctx context.Context, id int64) (*model.CommunityAccount, error) {
	var account model.CommunityAccount
	err := r.db.First(ctx, &account, database.Where("id = ?", id), alive())
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *repository) FindCommunityAccountByHandle(ctx context.Context, handle string) (*model.CommunityAccount, error) {
	var account model.CommunityAccount
	err := r.db.First(ctx, &account, database.Where("LOWER(handle) = ?", strings.ToLower(strings.TrimSpace(handle))), alive())
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *repository) FindCommunityAccountByEmail(ctx context.Context, email string) (*model.CommunityAccount, error) {
	var account model.CommunityAccount
	err := r.db.First(ctx, &account, database.Where("LOWER(email) = ?", strings.ToLower(strings.TrimSpace(email))), alive())
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *repository) FindCommunityAccountByHandleOrEmail(ctx context.Context, identifier string) (*model.CommunityAccount, error) {
	identifier = strings.ToLower(strings.TrimSpace(identifier))
	var account model.CommunityAccount
	err := r.db.First(ctx, &account, database.Where("LOWER(handle) = ? OR LOWER(email) = ?", identifier, identifier), alive())
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *repository) UpdateCommunityAccount(ctx context.Context, account model.CommunityAccount) error {
	result, err := r.db.Update(ctx, &model.CommunityAccount{}, map[string]any{
		"display_name":  account.DisplayName,
		"role":          account.Role,
		"status":        account.Status,
		"last_login_at": account.LastLoginAt,
		"updated_at":    account.UpdatedAt,
	}, database.Where("id = ?", account.ID), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) ListCommunityAccounts(ctx context.Context, filter model.CommunityAccountFilter) ([]model.CommunityAccount, error) {
	opts := []database.QueryOption{alive(), database.Order("created_at DESC, id DESC")}
	if keyword := strings.ToLower(strings.TrimSpace(filter.Keyword)); keyword != "" {
		like := "%" + keyword + "%"
		opts = append(opts, database.Where("(LOWER(handle) LIKE ? OR LOWER(email) LIKE ? OR LOWER(display_name) LIKE ?)", like, like, like))
	}
	if role := strings.TrimSpace(filter.Role); role != "" {
		opts = append(opts, database.Where("role = ?", role))
	}
	if status := strings.TrimSpace(filter.Status); status != "" {
		opts = append(opts, database.Where("status = ?", status))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var accounts []model.CommunityAccount
	err := r.db.Find(ctx, &accounts, opts...)
	return accounts, err
}

func (r *repository) CreateCommunitySession(ctx context.Context, session model.CommunitySession) error {
	return r.db.Create(ctx, &session)
}

func (r *repository) FindCommunitySessionByAccessTokenHash(ctx context.Context, tokenHash string, now time.Time) (*model.CommunitySession, error) {
	var session model.CommunitySession
	err := r.db.First(ctx, &session,
		database.Where("access_token_hash = ? AND revoked_at IS NULL AND access_expires_at > ?", strings.TrimSpace(tokenHash), now),
		alive(),
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *repository) FindCommunitySessionByRefreshTokenHash(ctx context.Context, tokenHash string, now time.Time) (*model.CommunitySession, error) {
	var session model.CommunitySession
	err := r.db.First(ctx, &session,
		database.Where("refresh_token_hash = ? AND revoked_at IS NULL AND refresh_expires_at > ?", strings.TrimSpace(tokenHash), now),
		alive(),
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *repository) FindCommunitySessionByID(ctx context.Context, id int64) (*model.CommunitySession, error) {
	var session model.CommunitySession
	err := r.db.First(ctx, &session, database.Where("id = ? AND revoked_at IS NULL", id), alive())
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *repository) RevokeCommunitySession(ctx context.Context, sessionID int64, now time.Time) error {
	result, err := r.db.Update(ctx, &model.CommunitySession{}, map[string]any{
		"revoked_at": now,
		"updated_at": now,
	}, database.Where("id = ? AND revoked_at IS NULL", sessionID), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) ListCommunitySessionsByAccountID(ctx context.Context, accountID int64, limit int) ([]model.CommunitySession, error) {
	opts := []database.QueryOption{
		database.Where("account_id = ? AND revoked_at IS NULL", accountID),
		alive(),
		database.Order("created_at DESC"),
	}
	if limit > 0 {
		opts = append(opts, database.Limit(limit))
	}
	var sessions []model.CommunitySession
	err := r.db.Find(ctx, &sessions, opts...)
	return sessions, err
}


func (r *repository) FindCreatorByHandle(ctx context.Context, handle string) (*model.Creator, error) {
	var creator model.Creator
	err := r.db.First(ctx, &creator, database.Where("LOWER(handle) = ?", strings.ToLower(strings.TrimSpace(handle))), alive())
	if err != nil {
		return nil, err
	}
	return &creator, nil
}

func (r *repository) CreateCreator(ctx context.Context, creator model.Creator) error {
	return r.db.Create(ctx, &creator)
}

func (r *repository) UpdateCreator(ctx context.Context, creator model.Creator) error {
	result, err := r.db.Update(ctx, &model.Creator{}, map[string]any{
		"display_name": creator.UserSummary.DisplayName,
		"avatar_url":   creator.UserSummary.AvatarURL,
		"bio":          creator.Bio,
		"updated_at":   creator.UpdatedAt,
	}, database.Where("handle = ?", creator.UserSummary.Handle), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) FindCreatorFollow(ctx context.Context, creatorID string, clientID string) (*model.CreatorFollow, error) {
	var follow model.CreatorFollow
	err := r.db.First(ctx, &follow, database.Where("creator_id = ? AND client_id = ?", creatorID, clientID), alive())
	if err != nil {
		return nil, err
	}
	return &follow, nil
}

func (r *repository) FindVideoInteraction(ctx context.Context, videoID string, clientID string, kind string) (*model.VideoInteraction, error) {
	var interaction model.VideoInteraction
	err := r.db.First(ctx, &interaction, database.Where("video_id = ? AND client_id = ? AND kind = ?", videoID, clientID, kind), alive())
	if err != nil {
		return nil, err
	}
	return &interaction, nil
}

func (r *repository) ListCreatorFollows(ctx context.Context, clientID string, limit int) ([]model.CreatorFollow, error) {
	opts := []database.QueryOption{
		database.Where("client_id = ?", strings.TrimSpace(clientID)),
		alive(),
		database.Order("followed_at DESC, creator_id ASC"),
	}
	if limit > 0 {
		opts = append(opts, database.Limit(limit))
	}
	var follows []model.CreatorFollow
	err := r.db.Find(ctx, &follows, opts...)
	return follows, err
}

func (r *repository) FollowCreator(ctx context.Context, follow model.CreatorFollow) error {
	existing, err := r.findCreatorFollowAny(ctx, follow.CreatorID, follow.ClientID)
	if err != nil && !errors.Is(err, communityservice.ErrNotFound) {
		return err
	}
	if existing == nil {
		if err := r.db.Create(ctx, &follow); err != nil {
			return err
		}
		return r.incrementFollowerCount(ctx, follow.CreatorID, follow.UpdatedAt)
	}
	values := map[string]any{
		"followed_at": follow.FollowedAt,
		"updated_at":  follow.UpdatedAt,
		"deleted_at":  nil,
	}
	if _, err := r.db.Update(ctx, &model.CreatorFollow{}, values, database.Where("creator_id = ? AND client_id = ?", follow.CreatorID, follow.ClientID), withDeleted()); err != nil {
		return err
	}
	if existing.DeletedAt == nil {
		return nil
	}
	return r.incrementFollowerCount(ctx, follow.CreatorID, follow.UpdatedAt)
}

func (r *repository) SetVideoInteraction(ctx context.Context, interaction model.VideoInteraction) error {
	existing, err := r.findVideoInteractionAny(ctx, interaction.VideoID, interaction.ClientID, interaction.Kind)
	if err != nil && !errors.Is(err, communityservice.ErrNotFound) {
		return err
	}
	if existing == nil {
		if err := r.db.Create(ctx, &interaction); err != nil {
			return err
		}
		return r.incrementLikeCountForInteraction(ctx, interaction)
	}
	values := map[string]any{
		"interacted_at": interaction.InteractedAt,
		"updated_at":    interaction.UpdatedAt,
		"deleted_at":    nil,
	}
	if _, err := r.db.Update(ctx, &model.VideoInteraction{}, values, videoInteractionWhere(interaction.VideoID, interaction.ClientID, interaction.Kind), withDeleted()); err != nil {
		return err
	}
	if existing.DeletedAt == nil {
		return nil
	}
	return r.incrementLikeCountForInteraction(ctx, interaction)
}

func (r *repository) SetVideoHistory(ctx context.Context, history model.VideoHistory) error {
	existing, err := r.findVideoHistoryAny(ctx, history.VideoID, history.ClientID)
	if err != nil && !errors.Is(err, communityservice.ErrNotFound) {
		return err
	}
	if existing == nil {
		return r.db.Create(ctx, &history)
	}
	values := map[string]any{
		"progress_seconds": history.ProgressSeconds,
		"last_viewed_at":   history.LastViewedAt,
		"updated_at":       history.UpdatedAt,
		"deleted_at":       nil,
	}
	_, err = r.db.Update(ctx, &model.VideoHistory{}, values, videoHistoryWhere(history.VideoID, history.ClientID), withDeleted())
	return err
}

func (r *repository) UnsetVideoInteraction(ctx context.Context, videoID string, clientID string, kind string, now time.Time) error {
	existing, err := r.FindVideoInteraction(ctx, videoID, clientID, kind)
	if err != nil {
		if errors.Is(err, communityservice.ErrNotFound) {
			return nil
		}
		return err
	}
	values := map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}
	if _, err := r.db.Update(ctx, &model.VideoInteraction{}, values, videoInteractionWhere(existing.VideoID, existing.ClientID, existing.Kind)); err != nil {
		return err
	}
	if kind != model.VideoInteractionKindLike {
		return nil
	}
	_, err = r.db.Exec(ctx, "UPDATE community_videos SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?", now, videoID)
	return err
}

func (r *repository) ClearVideoHistory(ctx context.Context, clientID string, now time.Time) error {
	_, err := r.db.Update(ctx, &model.VideoHistory{}, map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}, database.Where("client_id = ?", strings.TrimSpace(clientID)), alive())
	return err
}

func (r *repository) UnfollowCreator(ctx context.Context, creatorID string, clientID string, now time.Time) error {
	existing, err := r.FindCreatorFollow(ctx, creatorID, clientID)
	if err != nil {
		if errors.Is(err, communityservice.ErrNotFound) {
			return nil
		}
		return err
	}
	values := map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}
	if _, err := r.db.Update(ctx, &model.CreatorFollow{}, values, database.Where("creator_id = ? AND client_id = ?", existing.CreatorID, existing.ClientID)); err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, "UPDATE community_creators SET follower_count = CASE WHEN follower_count > 0 THEN follower_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?", now, creatorID)
	return err
}

func (r *repository) ListVideos(ctx context.Context, filter model.VideoFilter) ([]model.Video, error) {
	opts := []database.QueryOption{alive(), database.Order("published_at DESC, id DESC")}
	if query := strings.TrimSpace(filter.Query); query != "" {
		like := "%" + strings.ToLower(query) + "%"
		opts = append(opts, database.Where("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(slug) LIKE ?)", like, like, like))
	}
	if strings.TrimSpace(filter.UploaderID) != "" {
		opts = append(opts, database.Where("uploader_id = ?", strings.TrimSpace(filter.UploaderID)))
	}
	if len(filter.CategorySlugs) > 0 {
		videoIDs, err := r.videoIDsForCategorySlugs(ctx, filter.CategorySlugs)
		if err != nil {
			return nil, err
		}
		if len(videoIDs) == 0 {
			return []model.Video{}, nil
		}
		opts = append(opts, database.Where("id IN ?", videoIDs))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var videos []model.Video
	err := r.db.Find(ctx, &videos, opts...)
	return videos, err
}

func (r *repository) ListVideosByIDs(ctx context.Context, ids []string) ([]model.Video, error) {
	if len(ids) == 0 {
		return []model.Video{}, nil
	}
	var videos []model.Video
	err := r.db.Find(ctx, &videos, database.Where("id IN ?", ids), alive())
	return videos, err
}

func (r *repository) FindVideoByIDOrSlug(ctx context.Context, idOrSlug string) (*model.Video, error) {
	var video model.Video
	err := r.db.First(ctx, &video, database.Where("(id = ? OR slug = ?)", idOrSlug, idOrSlug), alive())
	if err != nil {
		return nil, err
	}
	return &video, nil
}

func (r *repository) FindVideoComment(ctx context.Context, videoID string, commentID string) (*model.VideoComment, error) {
	var comment model.VideoComment
	err := r.db.First(ctx, &comment, database.Where("video_id = ? AND id = ? AND status = ?", strings.TrimSpace(videoID), strings.TrimSpace(commentID), model.CommentStatusVisible), alive())
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *repository) ListSources(ctx context.Context, videoID string) ([]model.VideoSourceOption, error) {
	var sources []model.VideoSourceOption
	err := r.db.Find(ctx, &sources, database.Where("video_id = ?", videoID), database.Order("display_order ASC, id ASC"))
	return sources, err
}

func (r *repository) ListTags(ctx context.Context, videoID string) ([]string, error) {
	var tags []model.VideoTag
	if err := r.db.Find(ctx, &tags, database.Where("video_id = ?", videoID), database.Order("display_order ASC, tag ASC")); err != nil {
		return nil, err
	}
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		out = append(out, tag.Tag)
	}
	return out, nil
}

func (r *repository) ListCategorySlugs(ctx context.Context, videoID string) ([]string, error) {
	var links []model.VideoCategory
	if err := r.db.Find(ctx, &links, database.Where("video_id = ?", videoID)); err != nil {
		return nil, err
	}
	out := make([]string, 0, len(links))
	for _, link := range links {
		out = append(out, link.CategorySlug)
	}
	return out, nil
}

func (r *repository) ListDanmaku(ctx context.Context, videoID string) ([]model.VideoDanmakuItem, error) {
	var items []model.VideoDanmakuItem
	err := r.db.Find(ctx, &items, database.Where("video_id = ?", videoID), database.Order("time_seconds ASC, created_at ASC"))
	return items, err
}

func (r *repository) CreateVideoDanmaku(ctx context.Context, item model.VideoDanmakuItem) error {
	return r.db.Create(ctx, &item)
}

func (r *repository) CreateCommunityReport(ctx context.Context, report model.CommunityReport) error {
	return r.db.Create(ctx, &report)
}

func (r *repository) ListCommunityReports(ctx context.Context, filter model.CommunityReportFilter) ([]model.CommunityReport, error) {
	opts := []database.QueryOption{alive(), database.Order("created_at DESC, id DESC")}
	if status := strings.TrimSpace(filter.Status); status != "" {
		opts = append(opts, database.Where("status = ?", status))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var reports []model.CommunityReport
	err := r.db.Find(ctx, &reports, opts...)
	return reports, err
}

func (r *repository) FindCommunityReport(ctx context.Context, reportID string) (*model.CommunityReport, error) {
	var report model.CommunityReport
	err := r.db.First(ctx, &report, database.Where("id = ?", strings.TrimSpace(reportID)), alive())
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func (r *repository) UpdateCommunityReportReview(ctx context.Context, report model.CommunityReport) error {
	result, err := r.db.Update(ctx, &model.CommunityReport{}, map[string]any{
		"status":      report.Status,
		"review_note": report.ReviewNote,
		"reviewer_id": report.ReviewerID,
		"reviewed_at": report.ReviewedAt,
		"updated_at":  report.UpdatedAt,
	}, database.Where("id = ?", strings.TrimSpace(report.ID)), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) CreateCommunityNotification(ctx context.Context, notification model.CommunityNotification) error {
	return r.db.Create(ctx, &notification)
}

func (r *repository) CreateCommunityDynamic(ctx context.Context, dynamic model.CommunityDynamic) error {
	return r.db.Create(ctx, &dynamic)
}

func (r *repository) FindCommunityDynamic(ctx context.Context, dynamicID string) (*model.CommunityDynamic, error) {
	var dynamic model.CommunityDynamic
	err := r.db.First(ctx, &dynamic, database.Where("id = ? AND status = ?", strings.TrimSpace(dynamicID), model.CommunityDynamicStatusVisible), alive())
	if err != nil {
		return nil, err
	}
	return &dynamic, nil
}

func (r *repository) UpdateCommunityDynamic(ctx context.Context, dynamic model.CommunityDynamic) error {
	result, err := r.db.Update(ctx, &model.CommunityDynamic{}, map[string]any{
		"body":       dynamic.Body,
		"updated_at": dynamic.UpdatedAt,
	}, communityDynamicWhere(dynamic.ID, dynamic.ClientID), alive(), database.Where("status = ?", model.CommunityDynamicStatusVisible))
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) DeleteCommunityDynamic(ctx context.Context, dynamicID string, clientID string, now time.Time) error {
	result, err := r.db.Update(ctx, &model.CommunityDynamic{}, map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}, communityDynamicWhere(dynamicID, clientID), alive(), database.Where("status = ?", model.CommunityDynamicStatusVisible))
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) DeleteCommunitySubmission(ctx context.Context, submissionID string, clientID string, now time.Time) error {
	result, err := r.db.Update(ctx, &model.CommunitySubmission{}, map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}, database.Where("id = ? AND client_id = ?", submissionID, clientID), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) CreateCommunitySubmission(ctx context.Context, submission model.CommunitySubmission) error {
	return r.db.Create(ctx, &submission)
}

func (r *repository) CreateVideoFromSubmission(ctx context.Context, creator model.Creator, video model.Video, source model.VideoSourceOption, categorySlugs []string, tags []string) error {
	return r.CreateVideoFromSubmissionSources(ctx, creator, video, []model.VideoSourceOption{source}, categorySlugs, tags)
}

func (r *repository) CreateVideoFromSubmissionSources(ctx context.Context, creator model.Creator, video model.Video, sources []model.VideoSourceOption, categorySlugs []string, tags []string) error {
	return r.withTx(ctx, func(ctx context.Context, exec database.Executor) error {
		if err := upsertSubmissionCreator(ctx, exec, creator); err != nil {
			return err
		}
		if err := exec.Create(ctx, &video); err != nil {
			return err
		}
		for _, source := range sources {
			if err := exec.Create(ctx, &source); err != nil {
				return err
			}
		}
		for _, slug := range categorySlugs {
			slug = strings.TrimSpace(slug)
			if slug == "" {
				continue
			}
			if err := exec.Create(ctx, &model.VideoCategory{
				VideoID:      video.ID,
				CategorySlug: slug,
			}); err != nil {
				return err
			}
		}
		for index, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag == "" {
				continue
			}
			if err := exec.Create(ctx, &model.VideoTag{
				VideoID: video.ID,
				Tag:     tag,
				Order:   (index + 1) * 10,
			}); err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) CreateMediaAsset(ctx context.Context, asset model.CommunityMediaAsset) error {
	return r.db.Create(ctx, &asset)
}

func (r *repository) FindCommunitySubmission(ctx context.Context, submissionID string) (*model.CommunitySubmission, error) {
	var submission model.CommunitySubmission
	err := r.db.First(ctx, &submission, database.Where("id = ?", strings.TrimSpace(submissionID)), alive())
	if err != nil {
		return nil, err
	}
	return &submission, nil
}

func (r *repository) FindMediaAssetByID(ctx context.Context, id int64) (*model.CommunityMediaAsset, error) {
	var asset model.CommunityMediaAsset
	err := r.db.First(ctx, &asset, database.Where("id = ?", id), alive())
	if err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *repository) CreateCommunityVideoJob(ctx context.Context, job model.CommunityVideoJob) error {
	return r.db.Create(ctx, &job)
}

func (r *repository) UpdateCommunityVideoJob(ctx context.Context, job model.CommunityVideoJob) error {
	result, err := r.db.Update(ctx, &model.CommunityVideoJob{}, map[string]any{
		"video_id":             job.VideoID,
		"status":               job.Status,
		"progress":             job.Progress,
		"attempt":              job.Attempt,
		"max_attempts":         job.MaxAttempts,
		"locked_by":            job.LockedBy,
		"locked_at":            job.LockedAt,
		"heartbeat_at":         job.HeartbeatAt,
		"next_run_at":          job.NextRunAt,
		"input_storage_key":    job.InputStorageKey,
		"output_storage_key":   job.OutputStorageKey,
		"output_public_url":    job.OutputPublicURL,
		"request_payload":      job.RequestPayload,
		"provider_job_id":      job.ProviderJobID,
		"callback_received_at": job.CallbackReceivedAt,
		"failure_code":         job.FailureCode,
		"cancel_requested_at":  job.CancelRequestedAt,
		"error_message":        job.ErrorMessage,
		"started_at":           job.StartedAt,
		"finished_at":          job.FinishedAt,
		"updated_at":           job.UpdatedAt,
	}, database.Where("id = ?", strings.TrimSpace(job.ID)), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) ClaimCommunityVideoJobs(ctx context.Context, workerID string, now time.Time, leaseTimeout time.Duration, limit int) ([]model.CommunityVideoJob, error) {
	workerID = strings.TrimSpace(workerID)
	if workerID == "" {
		return nil, communityservice.ErrInvalidInput
	}
	if limit <= 0 {
		limit = 1
	}
	if leaseTimeout <= 0 {
		leaseTimeout = time.Hour
	}
	staleBefore := now.Add(-leaseTimeout)
	if _, err := r.db.Update(ctx, &model.CommunityVideoJob{}, map[string]any{
		"status":       model.CommunityVideoJobStatusQueued,
		"progress":     0,
		"locked_by":    "",
		"locked_at":    nil,
		"heartbeat_at": nil,
		"next_run_at":  now,
		"updated_at":   now,
	}, database.Where("status = ? AND provider_job_id = '' AND (heartbeat_at IS NULL OR heartbeat_at <= ?) AND (max_attempts = 0 OR attempt < max_attempts)", model.CommunityVideoJobStatusRunning, staleBefore), alive()); err != nil {
		return nil, err
	}
	opts := []database.QueryOption{
		database.Where("status = ?", model.CommunityVideoJobStatusQueued),
		database.Where("(next_run_at IS NULL OR next_run_at <= ?)", now),
		alive(),
		database.Order("next_run_at ASC, created_at ASC, id ASC"),
		database.Limit(limit),
	}
	var candidates []model.CommunityVideoJob
	if err := r.db.Find(ctx, &candidates, opts...); err != nil {
		return nil, err
	}
	claimed := make([]model.CommunityVideoJob, 0, len(candidates))
	for _, job := range candidates {
		attempt := job.Attempt + 1
		if job.MaxAttempts <= 0 {
			job.MaxAttempts = 3
		}
		result, err := r.db.Update(ctx, &model.CommunityVideoJob{}, map[string]any{
			"attempt":      attempt,
			"max_attempts": job.MaxAttempts,
			"locked_by":    workerID,
			"locked_at":    now,
			"heartbeat_at": now,
			"updated_at":   now,
		}, database.Where("id = ? AND status = ? AND (locked_at IS NULL OR locked_at <= ? OR locked_by = '')", job.ID, model.CommunityVideoJobStatusQueued, staleBefore), alive())
		if err != nil {
			return nil, err
		}
		if result.RowsAffected == 0 {
			continue
		}
		job.Attempt = attempt
		job.LockedBy = workerID
		job.LockedAt = &now
		job.HeartbeatAt = &now
		job.UpdatedAt = now
		claimed = append(claimed, job)
	}
	return claimed, nil
}

func (r *repository) FindCommunityVideoJob(ctx context.Context, jobID string) (*model.CommunityVideoJob, error) {
	var job model.CommunityVideoJob
	err := r.db.First(ctx, &job, database.Where("id = ?", strings.TrimSpace(jobID)), alive())
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *repository) ListCommunityVideoJobs(ctx context.Context, filter model.CommunityVideoJobFilter) ([]model.CommunityVideoJob, error) {
	opts := []database.QueryOption{
		alive(),
		database.Order("created_at DESC, id DESC"),
	}
	if strings.TrimSpace(filter.Status) != "" {
		opts = append(opts, database.Where("status = ?", strings.TrimSpace(filter.Status)))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var jobs []model.CommunityVideoJob
	err := r.db.Find(ctx, &jobs, opts...)
	return jobs, err
}

func (r *repository) ListLatestCommunityVideoJobsBySubmissionIDs(ctx context.Context, submissionIDs []string) ([]model.CommunityVideoJob, error) {
	ids := compactStrings(submissionIDs)
	if len(ids) == 0 {
		return []model.CommunityVideoJob{}, nil
	}
	var jobs []model.CommunityVideoJob
	err := r.db.Find(
		ctx,
		&jobs,
		database.Where("submission_id IN ?", ids),
		alive(),
		database.Order("submission_id ASC, created_at DESC, id DESC"),
	)
	if err != nil {
		return nil, err
	}
	latest := make([]model.CommunityVideoJob, 0, len(ids))
	seen := make(map[string]struct{}, len(ids))
	for _, job := range jobs {
		if _, ok := seen[job.SubmissionID]; ok {
			continue
		}
		seen[job.SubmissionID] = struct{}{}
		latest = append(latest, job)
	}
	return latest, nil
}

func (r *repository) CreateCommunityVideoRenditions(ctx context.Context, renditions []model.CommunityVideoRendition) error {
	for _, rendition := range renditions {
		if err := r.db.Create(ctx, &rendition); err != nil {
			return err
		}
	}
	return nil
}

func (r *repository) ListCommunityVideoRenditions(ctx context.Context, jobID string) ([]model.CommunityVideoRendition, error) {
	opts := []database.QueryOption{
		database.Where("job_id = ?", strings.TrimSpace(jobID)),
		database.Order("height ASC, quality_label ASC"),
	}
	var renditions []model.CommunityVideoRendition
	err := r.db.Find(ctx, &renditions, opts...)
	return renditions, err
}

func (r *repository) UpdateCommunitySubmissionReview(ctx context.Context, submission model.CommunitySubmission) error {
	result, err := r.db.Update(ctx, &model.CommunitySubmission{}, map[string]any{
		"status":             submission.Status,
		"review_note":        submission.ReviewNote,
		"reviewer_id":        submission.ReviewerID,
		"reviewed_at":        submission.ReviewedAt,
		"media_asset_id":     submission.MediaAssetID,
		"published_video_id": submission.PublishedVideoID,
		"published_at":       submission.PublishedAt,
		"updated_at":         submission.UpdatedAt,
	}, database.Where("id = ?", strings.TrimSpace(submission.ID)), alive())
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) ListCommunityNotifications(ctx context.Context, filter model.CommunityNotificationFilter) ([]model.CommunityNotification, error) {
	opts := []database.QueryOption{
		database.Where("client_id = ?", strings.TrimSpace(filter.ClientID)),
		alive(),
		database.Order("created_at DESC, id DESC"),
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var notifications []model.CommunityNotification
	err := r.db.Find(ctx, &notifications, opts...)
	return notifications, err
}

func (r *repository) ListCommunityDynamics(ctx context.Context, filter model.CommunityDynamicFilter) ([]model.CommunityDynamic, error) {
	opts := []database.QueryOption{
		database.Where("status = ?", model.CommunityDynamicStatusVisible),
		alive(),
		database.Order("created_at DESC, id DESC"),
	}
	if len(filter.CreatorIDs) > 0 {
		opts = append(opts, database.Where("creator_id IN ?", filter.CreatorIDs))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var dynamics []model.CommunityDynamic
	err := r.db.Find(ctx, &dynamics, opts...)
	return dynamics, err
}

func (r *repository) ListCommunitySubmissions(ctx context.Context, filter model.CommunitySubmissionFilter) ([]model.CommunitySubmission, error) {
	opts := []database.QueryOption{
		alive(),
		database.Order("created_at DESC, id DESC"),
	}
	if !filter.AllClients {
		opts = append(opts, database.Where("client_id = ?", strings.TrimSpace(filter.ClientID)))
	}
	if strings.TrimSpace(filter.Status) != "" {
		opts = append(opts, database.Where("status = ?", strings.TrimSpace(filter.Status)))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var submissions []model.CommunitySubmission
	err := r.db.Find(ctx, &submissions, opts...)
	return submissions, err
}

func (r *repository) MarkCommunityNotificationsRead(ctx context.Context, clientID string, now time.Time) error {
	_, err := r.db.Update(ctx, &model.CommunityNotification{}, map[string]any{
		"read_at":    now,
		"updated_at": now,
	}, database.Where("client_id = ? AND read_at IS NULL", strings.TrimSpace(clientID)), alive())
	return err
}

func (r *repository) ListVideoComments(ctx context.Context, videoID string, filter model.VideoCommentFilter) ([]model.VideoComment, error) {
	order := "created_at DESC, id DESC"
	if filter.Sort == model.CommentSortOldest {
		order = "created_at ASC, id ASC"
	}
	opts := []database.QueryOption{
		database.Where("video_id = ? AND status = ?", videoID, model.CommentStatusVisible),
		alive(),
		database.Order(order),
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var comments []model.VideoComment
	err := r.db.Find(ctx, &comments, opts...)
	return comments, err
}

func (r *repository) ListVideoInteractions(ctx context.Context, filter model.VideoInteractionFilter) ([]model.VideoInteraction, error) {
	opts := []database.QueryOption{
		database.Where("client_id = ?", strings.TrimSpace(filter.ClientID)),
		alive(),
		database.Order("interacted_at DESC, video_id ASC, kind ASC"),
	}
	if kind := strings.TrimSpace(filter.Kind); kind != "" {
		opts = append(opts, database.Where("kind = ?", kind))
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var interactions []model.VideoInteraction
	err := r.db.Find(ctx, &interactions, opts...)
	return interactions, err
}

func (r *repository) ListVideoHistory(ctx context.Context, filter model.VideoHistoryFilter) ([]model.VideoHistory, error) {
	opts := []database.QueryOption{
		database.Where("client_id = ?", strings.TrimSpace(filter.ClientID)),
		alive(),
		database.Order("last_viewed_at DESC, video_id ASC"),
	}
	if filter.Limit > 0 {
		opts = append(opts, database.Limit(filter.Limit))
	}
	var histories []model.VideoHistory
	err := r.db.Find(ctx, &histories, opts...)
	return histories, err
}

func (r *repository) CountVideoComments(ctx context.Context, videoID string) (int, error) {
	count, err := r.db.Count(ctx, &model.VideoComment{}, database.Where("video_id = ? AND status = ?", videoID, model.CommentStatusVisible), alive())
	return int(count), err
}

func (r *repository) CreateVideoComment(ctx context.Context, comment model.VideoComment) error {
	if err := r.db.Create(ctx, &comment); err != nil {
		return err
	}
	_, err := r.db.Exec(ctx, "UPDATE community_videos SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?", comment.UpdatedAt, comment.VideoID)
	return err
}

func (r *repository) UpdateVideoComment(ctx context.Context, comment model.VideoComment) error {
	result, err := r.db.Update(ctx, &model.VideoComment{}, map[string]any{
		"body":       comment.Body,
		"updated_at": comment.UpdatedAt,
	}, videoCommentWhere(comment.VideoID, comment.ID, comment.ClientID), alive(), database.Where("status = ?", model.CommentStatusVisible))
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	return nil
}

func (r *repository) DeleteVideoComment(ctx context.Context, videoID string, commentID string, clientID string, now time.Time) error {
	result, err := r.db.Update(ctx, &model.VideoComment{}, map[string]any{
		"updated_at": now,
		"deleted_at": now,
	}, videoCommentWhere(videoID, commentID, clientID), alive(), database.Where("status = ?", model.CommentStatusVisible))
	if err != nil {
		return err
	}
	if result.RowsAffected == 0 {
		return communityservice.ErrNotFound
	}
	_, err = r.db.Exec(ctx, "UPDATE community_videos SET comment_count = CASE WHEN comment_count > 0 THEN comment_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?", now, videoID)
	return err
}

func (r *repository) videoIDsForCategorySlugs(ctx context.Context, categorySlugs []string) ([]string, error) {
	if len(categorySlugs) == 0 {
		return []string{}, nil
	}
	var links []model.VideoCategory
	if err := r.db.Find(ctx, &links, database.Where("category_slug IN ?", categorySlugs)); err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(links))
	for _, link := range links {
		if _, ok := seen[link.VideoID]; ok {
			continue
		}
		seen[link.VideoID] = struct{}{}
		out = append(out, link.VideoID)
	}
	return out, nil
}

func (r *repository) findCreatorFollowAny(ctx context.Context, creatorID string, clientID string) (*model.CreatorFollow, error) {
	var follow model.CreatorFollow
	err := r.db.First(ctx, &follow, database.Where("creator_id = ? AND client_id = ?", creatorID, clientID), withDeleted())
	if err != nil {
		return nil, err
	}
	return &follow, nil
}

func (r *repository) findVideoInteractionAny(ctx context.Context, videoID string, clientID string, kind string) (*model.VideoInteraction, error) {
	var interaction model.VideoInteraction
	err := r.db.First(ctx, &interaction, videoInteractionWhere(videoID, clientID, kind), withDeleted())
	if err != nil {
		return nil, err
	}
	return &interaction, nil
}

func (r *repository) findVideoHistoryAny(ctx context.Context, videoID string, clientID string) (*model.VideoHistory, error) {
	var history model.VideoHistory
	err := r.db.First(ctx, &history, videoHistoryWhere(videoID, clientID), withDeleted())
	if err != nil {
		return nil, err
	}
	return &history, nil
}

func (r *repository) incrementFollowerCount(ctx context.Context, creatorID string, now time.Time) error {
	_, err := r.db.Exec(ctx, "UPDATE community_creators SET follower_count = follower_count + 1, updated_at = ? WHERE id = ?", now, creatorID)
	return err
}

func (r *repository) incrementLikeCountForInteraction(ctx context.Context, interaction model.VideoInteraction) error {
	if interaction.Kind != model.VideoInteractionKindLike {
		return nil
	}
	_, err := r.db.Exec(ctx, "UPDATE community_videos SET like_count = like_count + 1, updated_at = ? WHERE id = ?", interaction.UpdatedAt, interaction.VideoID)
	return err
}

func videoInteractionWhere(videoID string, clientID string, kind string) database.QueryOption {
	return database.Where("video_id = ? AND client_id = ? AND kind = ?", videoID, clientID, kind)
}

func videoHistoryWhere(videoID string, clientID string) database.QueryOption {
	return database.Where("video_id = ? AND client_id = ?", videoID, clientID)
}

func videoCommentWhere(videoID string, commentID string, clientID string) database.QueryOption {
	return database.Where("video_id = ? AND id = ? AND client_id = ?", strings.TrimSpace(videoID), strings.TrimSpace(commentID), strings.TrimSpace(clientID))
}

func communityDynamicWhere(dynamicID string, clientID string) database.QueryOption {
	return database.Where("id = ? AND client_id = ?", strings.TrimSpace(dynamicID), strings.TrimSpace(clientID))
}

func alive() database.QueryOption {
	return database.Where("deleted_at IS NULL")
}

func compactStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func withDeleted() database.QueryOption {
	return func(q *database.Query) {
		q.WithDeleted = true
	}
}

func (r *repository) withTx(ctx context.Context, fn database.TxFunc) error {
	tx, ok := r.db.(interface {
		WithTx(context.Context, database.TxFunc) error
	})
	if !ok {
		return fn(ctx, r.db)
	}
	return tx.WithTx(ctx, fn)
}

func upsertSubmissionCreator(ctx context.Context, exec database.Executor, creator model.Creator) error {
	var existing model.Creator
	err := exec.First(ctx, &existing, database.Where("id = ?", strings.TrimSpace(creator.ID)), alive())
	if err == nil {
		_, updateErr := exec.Update(ctx, &model.Creator{}, map[string]any{
			"display_name": creator.DisplayName,
			"bio":          creator.Bio,
			"updated_at":   creator.UpdatedAt,
		}, database.Where("id = ?", strings.TrimSpace(creator.ID)), alive())
		return updateErr
	}
	if !errors.Is(err, communityservice.ErrNotFound) {
		return err
	}
	return exec.Create(ctx, &creator)
}

func mapStorageError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, database.ErrNotFound) {
		return communityservice.ErrNotFound
	}
	if errors.Is(err, communityservice.ErrStorageUnavailable) {
		return err
	}
	if isStorageUnavailable(err) {
		return fmt.Errorf("%w: %v", communityservice.ErrStorageUnavailable, err)
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
