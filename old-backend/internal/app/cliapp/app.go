package cliapp

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/open-console/console-platform/internal/app/cliapp/commands"
	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	"github.com/open-console/console-platform/pkg/cli"
)

// NewApp 装配所有顶层 CLI 命令。
func NewApp(args ...string) (cli.App, error) {
	localizer := localization.ForArgs(args)
	app, err := cli.NewApp(cli.Config{
		Name:        executableName(),
		Version:     strings.TrimSpace(os.Getenv("APP_VERSION")),
		Description: strings.TrimSpace(os.Getenv("APP_CLI_DESCRIPTION")),
		GlobalFlags: []cli.FlagSpec{
			localization.LocaleFlag(localizer),
		},
	})
	if err != nil {
		return nil, err
	}
	for _, spec := range commands.NewTopLevelCommands(localizer) {
		if err := app.AddCommand(spec); err != nil {
			return nil, err
		}
	}
	return app, nil
}

func executableName() string {
	name := strings.TrimSpace(filepath.Base(os.Args[0]))
	name = strings.TrimSuffix(name, ".exe")
	if name == "" {
		return "app"
	}
	return name
}
