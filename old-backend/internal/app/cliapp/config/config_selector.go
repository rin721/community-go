package config

import (
	"context"
	"strings"

	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	"github.com/open-console/console-platform/pkg/cli"
	"github.com/open-console/console-platform/types/constants"
)

// SelectConfigPath 按 flag、预置回答、自动发现、手动输入的优先级选择配置文件。
func SelectConfigPath(ctx *cli.Context) (string, error) {
	if ctx.IsFlagChanged("config") && strings.TrimSpace(ctx.GetString("config")) != "" {
		return ctx.GetString("config"), nil
	}
	if value, ok := cli.PromptAnswer(ctx.UI, "config"); ok {
		value = strings.TrimSpace(value)
		if value == "" {
			return constants.AppDefaultConfigPath, nil
		}
		return value, nil
	}
	files := DiscoverConfigFiles()
	if len(files) == 0 {
		return constants.AppDefaultConfigPath, nil
	}
	if ctx == nil || ctx.UI == nil {
		return "", errInteractiveUnavailable()
	}
	if ctx.Context == nil {
		ctx.Context = context.Background()
	}
	localizer := localization.FromContext(ctx)
	options := make([]cli.SelectOption, 0, len(files)+1)
	for _, file := range files {
		description := ""
		if IsExampleConfig(file) {
			description = localizer.T("cli.config.selector.exampleDescription")
		}
		options = append(options, cli.SelectOption{Value: file, Label: file, Description: description})
	}
	options = append(options, cli.SelectOption{Value: "__custom__", Label: localizer.T("cli.config.selector.customPath")})
	selected, err := cli.SelectKey(ctx.Context, ctx.UI, "config", localizer.T("cli.config.selector.prompt"), options)
	if err != nil {
		return "", err
	}
	if selected == "__custom__" {
		return cli.InputKey(ctx.Context, ctx.UI, "config.custom", localizer.T("cli.config.selector.pathPrompt"), constants.AppDefaultConfigPath)
	}
	return selected, nil
}
