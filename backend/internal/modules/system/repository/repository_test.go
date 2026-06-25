package repository

import (
	"context"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/app/adapters"
	"github.com/open-console/console-platform/internal/modules/system/model"
	"github.com/open-console/console-platform/pkg/database"
	"github.com/open-console/console-platform/pkg/sqlgen"
)

func TestListMediaUploadSessionsForCleanupSelectsOnlyChunkResidueCandidates(t *testing.T) {
	db := setupSystemRepositoryTestDB(t, &model.MediaUploadSession{}, &model.MediaUploadChunk{})
	repo := New(adapters.NewDatabase(db))
	ctx := context.Background()
	now := time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC)

	sessions := []model.MediaUploadSession{
		{
			ID:        1,
			Status:    model.MediaUploadStatusActive,
			ExpiresAt: now.Add(-time.Minute),
			CreatedAt: now.Add(-4 * time.Hour),
			UpdatedAt: now.Add(-4 * time.Hour),
		},
		{
			ID:        2,
			Status:    model.MediaUploadStatusCompleted,
			ExpiresAt: now.Add(time.Hour),
			CreatedAt: now.Add(-3 * time.Hour),
			UpdatedAt: now.Add(-3 * time.Hour),
		},
		{
			ID:        3,
			Status:    model.MediaUploadStatusActive,
			ExpiresAt: now.Add(time.Hour),
			CreatedAt: now.Add(-2 * time.Hour),
			UpdatedAt: now.Add(-2 * time.Hour),
		},
		{
			ID:        4,
			Status:    model.MediaUploadStatusExpired,
			ExpiresAt: now.Add(-time.Hour),
			CreatedAt: now.Add(-time.Hour),
			UpdatedAt: now.Add(-time.Hour),
		},
	}
	for i := range sessions {
		if err := repo.CreateMediaUploadSession(ctx, &sessions[i]); err != nil {
			t.Fatalf("CreateMediaUploadSession(%d) error = %v", sessions[i].ID, err)
		}
	}
	for _, chunk := range []model.MediaUploadChunk{
		{ID: 101, SessionID: 1, ChunkIndex: 0, CreatedAt: now, UpdatedAt: now},
		{ID: 102, SessionID: 2, ChunkIndex: 0, CreatedAt: now, UpdatedAt: now},
		{ID: 103, SessionID: 3, ChunkIndex: 0, CreatedAt: now, UpdatedAt: now},
	} {
		chunk := chunk
		if err := repo.CreateMediaUploadChunk(ctx, &chunk); err != nil {
			t.Fatalf("CreateMediaUploadChunk(%d) error = %v", chunk.ID, err)
		}
	}

	candidates, err := repo.ListMediaUploadSessionsForCleanup(ctx, now, 10)
	if err != nil {
		t.Fatalf("ListMediaUploadSessionsForCleanup() error = %v", err)
	}
	ids := make([]int64, 0, len(candidates))
	for _, session := range candidates {
		ids = append(ids, session.ID)
	}
	if want := []int64{1, 2}; !reflect.DeepEqual(ids, want) {
		t.Fatalf("cleanup candidate ids = %#v, want %#v", ids, want)
	}
}

func setupSystemRepositoryTestDB(t *testing.T, models ...any) database.Database {
	t.Helper()
	db, err := database.New(&database.Config{
		Driver: database.DriverSQLite,
		DBName: filepath.Join(t.TempDir(), "system-repository.db"),
		Silent: true,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	gen := sqlgen.New(&sqlgen.Config{Dialect: sqlgen.SQLite})
	for _, item := range models {
		schemaSQL, err := gen.TableIfNotExists(item)
		if err != nil {
			t.Fatalf("generate schema for %T: %v", item, err)
		}
		if _, err := db.Exec(context.Background(), schemaSQL); err != nil {
			t.Fatalf("apply schema for %T: %v", item, err)
		}
	}
	return db
}
