package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/open-console/console-platform/internal/modules/system/model"
)

const DefaultMaintenanceCleanupBatchSize = 100

// MaintenanceCleanupResult 描述一次后台维护清理的执行结果。
//
// 该结果只在应用装配层日志和测试中使用，不作为 HTTP DTO 暴露。
type MaintenanceCleanupResult struct {
	MediaUploadChunkSessionsCleaned int
	MediaUploadSessionsExpired      int
	MediaUploadSessionsScanned      int
	StorageStatus                   string
	TrafficProbeTargetsChecked      int
}

// RunMaintenanceCleanup 执行 System 模块的后台补偿清理。
//
// 媒体分片清理和流量探针结果裁剪都会把失败返回给调用方，由应用层调度器统一记录；
// 成功的子任务不会因为其他子任务失败而回滚。
func (s *service) RunMaintenanceCleanup(ctx context.Context) (MaintenanceCleanupResult, error) {
	result := MaintenanceCleanupResult{StorageStatus: "unavailable"}
	if s.repo == nil {
		return result, nil
	}
	result.StorageStatus = "persisted"

	var joined error
	if err := s.cleanupMediaUploadResidue(ctx, &result); err != nil {
		joined = errors.Join(joined, err)
	}
	if err := s.pruneTrafficProbeResidue(ctx, &result); err != nil {
		joined = errors.Join(joined, err)
	}
	return result, joined
}

func (s *service) cleanupMediaUploadResidue(ctx context.Context, result *MaintenanceCleanupResult) error {
	now := s.now()
	sessions, err := s.repo.ListMediaUploadSessionsForCleanup(ctx, now, s.maintenanceCleanupBatchSize())
	if err != nil {
		return mapMediaStorageError(err)
	}
	if len(sessions) == 0 {
		return nil
	}
	if s.objectStore == nil {
		return ErrStorageUnavailable
	}

	var joined error
	for _, session := range sessions {
		result.MediaUploadSessionsScanned++
		if session.Status == model.MediaUploadStatusActive {
			if session.ExpiresAt.After(now) {
				continue
			}
			session.Status = model.MediaUploadStatusExpired
			session.UpdatedAt = now
			if err := s.repo.SaveMediaUploadSession(ctx, &session); err != nil {
				joined = errors.Join(joined, fmt.Errorf("expire media upload session %d: %w", session.ID, mapMediaStorageError(err)))
				continue
			}
			result.MediaUploadSessionsExpired++
		}
		if err := s.objectStore.RemoveAll(mediaChunkStorageDir(s.cfg.MediaPrefix, session.ID)); err != nil {
			joined = errors.Join(joined, fmt.Errorf("cleanup media upload chunk files for session %d: %w", session.ID, err))
			continue
		}
		if err := s.repo.DeleteMediaUploadChunks(ctx, session.ID); err != nil {
			joined = errors.Join(joined, fmt.Errorf("cleanup media upload chunk records for session %d: %w", session.ID, mapMediaStorageError(err)))
			continue
		}
		result.MediaUploadChunkSessionsCleaned++
	}
	return joined
}

func (s *service) maintenanceCleanupBatchSize() int {
	if s.cfg.MaintenanceCleanupBatchSize <= 0 {
		return DefaultMaintenanceCleanupBatchSize
	}
	return s.cfg.MaintenanceCleanupBatchSize
}

func (s *service) pruneTrafficProbeResidue(ctx context.Context, result *MaintenanceCleanupResult) error {
	targets, err := s.repo.ListTrafficProbeTargets(ctx)
	if err != nil {
		return mapRepositoryError(err)
	}
	var joined error
	for _, target := range targets {
		if target.ID <= 0 {
			continue
		}
		if err := s.repo.DeleteOldTrafficProbeResults(ctx, target.ID, defaultTrafficProbeResultKeep); err != nil {
			joined = errors.Join(joined, fmt.Errorf("cleanup traffic probe results for target %d: %w", target.ID, mapRepositoryError(err)))
			continue
		}
		result.TrafficProbeTargetsChecked++
	}
	return joined
}
