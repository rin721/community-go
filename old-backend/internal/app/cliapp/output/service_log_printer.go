package output

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
)

// PrintServiceLogs 输出 stdout/stderr 历史日志，并可持续跟随新增内容。
func PrintServiceLogs(ctx context.Context, w io.Writer, state managed.ServiceState, lines int, follow bool) error {
	if lines <= 0 {
		lines = 100
	}
	if err := printLogHistory(w, "stdout", state.StdoutLogPath, lines); err != nil {
		return err
	}
	if err := printLogHistory(w, "stderr", state.StderrLogPath, lines); err != nil {
		return err
	}
	if !follow {
		return nil
	}
	if err := writeServiceLogLine(w, "\n--- following logs; press Ctrl+C to detach ---"); err != nil {
		return err
	}
	offsets := map[string]int64{
		state.StdoutLogPath: fileSize(state.StdoutLogPath),
		state.StderrLogPath: fileSize(state.StderrLogPath),
	}
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			for label, path := range map[string]string{"stdout": state.StdoutLogPath, "stderr": state.StderrLogPath} {
				nextOffset, err := printNewLogContent(w, label, path, offsets[path])
				if err != nil {
					if isServiceLogWriteError(err) {
						return err
					}
					continue
				}
				offsets[path] = nextOffset
			}
		}
	}
}

func printLogHistory(w io.Writer, label string, path string, lines int) error {
	if err := writeServiceLog(w, "\n--- %s: %s ---\n", label, path); err != nil {
		return err
	}
	items, err := tailLines(path, lines)
	if err != nil {
		return writeServiceLog(w, "%v\n", err)
	}
	for _, item := range items {
		if err := writeServiceLogLine(w, item); err != nil {
			return err
		}
	}
	return nil
}

func tailLines(path string, limit int) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
		if len(lines) > limit {
			copy(lines, lines[1:])
			lines = lines[:limit]
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return lines, nil
}

func printNewLogContent(w io.Writer, label string, path string, offset int64) (int64, error) {
	file, err := os.Open(path)
	if err != nil {
		return offset, err
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return offset, err
	}
	if info.Size() < offset {
		offset = 0
	}
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return offset, err
	}
	raw, err := io.ReadAll(file)
	if err != nil {
		return offset, err
	}
	if len(raw) == 0 {
		return info.Size(), nil
	}
	text := strings.TrimRight(string(raw), "\n")
	for _, line := range strings.Split(text, "\n") {
		if err := writeServiceLog(w, "[%s] %s\n", label, line); err != nil {
			return offset, err
		}
	}
	return info.Size(), nil
}

type serviceLogWriteError struct {
	err error
}

func (e serviceLogWriteError) Error() string {
	return fmt.Sprintf("write service logs: %v", e.err)
}

func (e serviceLogWriteError) Unwrap() error {
	return e.err
}

func writeServiceLogLine(w io.Writer, line string) error {
	return writeServiceLog(w, "%s\n", line)
}

func writeServiceLog(w io.Writer, format string, args ...any) error {
	if _, err := fmt.Fprintf(w, format, args...); err != nil {
		return serviceLogWriteError{err: err}
	}
	return nil
}

func isServiceLogWriteError(err error) bool {
	var writeErr serviceLogWriteError
	return errors.As(err, &writeErr)
}

func fileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}
