package output

import (
	"fmt"
	"io"

	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
)

// PrintServiceState 输出托管服务状态。
func PrintServiceState(w io.Writer, state managed.ServiceState, localizers ...*localization.Localizer) error {
	localizer := firstLocalizer(localizers...)
	if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.service"), state.Service); err != nil {
		return err
	}
	if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.status"), state.Status); err != nil {
		return err
	}
	if state.PID > 0 {
		if err := writeServiceState(w, "PID: %d\n", state.PID); err != nil {
			return err
		}
	}
	if state.ListenAddr != "" {
		if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.listen"), state.ListenAddr); err != nil {
			return err
		}
	}
	if state.ExecutablePath != "" {
		if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.executable"), state.ExecutablePath); err != nil {
			return err
		}
	}
	if state.ConfigPath != "" {
		if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.config"), state.ConfigPath); err != nil {
			return err
		}
	}
	if state.StdoutLogPath != "" {
		if err := writeServiceState(w, "stdout: %s\n", state.StdoutLogPath); err != nil {
			return err
		}
	}
	if state.StderrLogPath != "" {
		if err := writeServiceState(w, "stderr: %s\n", state.StderrLogPath); err != nil {
			return err
		}
	}
	if state.LastError != "" {
		if err := writeServiceState(w, "%s: %s\n", localizer.T("cli.service.state.error"), state.LastError); err != nil {
			return err
		}
	}
	return nil
}

func writeServiceState(w io.Writer, format string, args ...any) error {
	if _, err := fmt.Fprintf(w, format, args...); err != nil {
		return fmt.Errorf("write service state: %w", err)
	}
	return nil
}

func firstLocalizer(localizers ...*localization.Localizer) *localization.Localizer {
	if len(localizers) > 0 && localizers[0] != nil {
		return localizers[0]
	}
	return localization.ForArgs(nil)
}
