package handlers

import (
	"context"
	"fmt"
	"strings"

	"github.com/open-console/console-platform/pkg/cli"
)

func requireUI(ctx *cli.Context) (cli.PromptUI, error) {
	if ctx == nil || ctx.UI == nil {
		return nil, fmt.Errorf("interactive UI is not available")
	}
	if ctx.Context == nil {
		ctx.Context = context.Background()
	}
	return ctx.UI, nil
}

func writePromptInfo(ui cli.PromptUI, message string, operation string) error {
	if strings.TrimSpace(message) == "" {
		return nil
	}
	if ui == nil {
		return fmt.Errorf("interactive UI is not available")
	}
	if strings.TrimSpace(operation) == "" {
		operation = "write CLI info"
	}
	if err := ui.Info(message); err != nil {
		return fmt.Errorf("%s: %w", operation, err)
	}
	return nil
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func defaultInt(value int, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}
