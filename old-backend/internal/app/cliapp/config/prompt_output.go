package config

import (
	"fmt"

	"github.com/open-console/console-platform/pkg/cli"
)

func writeConfigPromptInfo(ctx *cli.Context, message string, operation string) error {
	if ctx == nil || ctx.UI == nil {
		return fmt.Errorf("%s: interactive UI is not available", operation)
	}
	if err := ctx.UI.Info(message); err != nil {
		return fmt.Errorf("%s: %w", operation, err)
	}
	return nil
}
