package initapp

import (
	"context"
	"errors"
	"fmt"
)

type backgroundGroup struct {
	services []BackgroundService
}

func newBackgroundGroup(services ...BackgroundService) BackgroundService {
	filtered := make([]BackgroundService, 0, len(services))
	for _, service := range services {
		if service != nil {
			filtered = append(filtered, service)
		}
	}
	if len(filtered) == 0 {
		return nil
	}
	return backgroundGroup{services: filtered}
}

func (g backgroundGroup) Start(ctx context.Context) error {
	started := make([]BackgroundService, 0, len(g.services))
	for _, service := range g.services {
		if err := service.Start(ctx); err != nil {
			var rollbackErr error
			for i := len(started) - 1; i >= 0; i-- {
				if shutdownErr := started[i].Shutdown(ctx); shutdownErr != nil {
					rollbackErr = errors.Join(rollbackErr, fmt.Errorf("rollback background service shutdown: %w", shutdownErr))
				}
			}
			return errors.Join(err, rollbackErr)
		}
		started = append(started, service)
	}
	return nil
}

func (g backgroundGroup) Shutdown(ctx context.Context) error {
	var joined error
	for i := len(g.services) - 1; i >= 0; i-- {
		if err := g.services[i].Shutdown(ctx); err != nil {
			joined = errors.Join(joined, fmt.Errorf("background service shutdown: %w", err))
		}
	}
	return joined
}
