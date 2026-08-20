package commands

import (
	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	"github.com/open-console/console-platform/pkg/cli"
)

// NewSystemCenterCommands 返回系统中心相关的交互式运维命令集合。
func NewSystemCenterCommands(localizers ...*localization.Localizer) []cli.CommandSpec {
	localizer := commandLocalizer(localizers...)
	return []cli.CommandSpec{
		newRunCommandSpec(localizer),
		newServiceCommandSpec(localizer),
		newInitCommandSpec(localizer),
	}
}
