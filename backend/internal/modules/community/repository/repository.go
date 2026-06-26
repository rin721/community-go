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

func (r *repository) ListCategories(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.Find(ctx, &categories, alive(), database.Order("display_order ASC, slug ASC"))
	return categories, err
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

func (r *repository) FindCreatorByHandle(ctx context.Context, handle string) (*model.Creator, error) {
	var creator model.Creator
	err := r.db.First(ctx, &creator, database.Where("LOWER(handle) = ?", strings.ToLower(strings.TrimSpace(handle))), alive())
	if err != nil {
		return nil, err
	}
	return &creator, nil
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
	if category := strings.TrimSpace(filter.Category); category != "" && category != "home" {
		videoIDs, err := r.videoIDsForCategory(ctx, category)
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

func (r *repository) videoIDsForCategory(ctx context.Context, category string) ([]string, error) {
	categorySlugs, err := r.categorySelfAndChildren(ctx, category)
	if err != nil {
		return nil, err
	}
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

func (r *repository) categorySelfAndChildren(ctx context.Context, slug string) ([]string, error) {
	categories, err := r.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	var walk func(string)
	walk = func(current string) {
		if _, ok := seen[current]; ok {
			return
		}
		seen[current] = struct{}{}
		for _, category := range categories {
			if category.ParentSlug != nil && *category.ParentSlug == current {
				walk(category.Slug)
			}
		}
	}
	for _, category := range categories {
		if category.Slug == slug {
			walk(slug)
			break
		}
	}
	out := make([]string, 0, len(seen))
	for value := range seen {
		out = append(out, value)
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

func alive() database.QueryOption {
	return database.Where("deleted_at IS NULL")
}

func withDeleted() database.QueryOption {
	return func(q *database.Query) {
		q.WithDeleted = true
	}
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
