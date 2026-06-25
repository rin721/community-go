package output

import (
	"fmt"
	"io"
)

// WriteDBOperationResult 将 db 子命令执行结果写入命令输出流。
func WriteDBOperationResult(w io.Writer, message, sql string, printSQL bool) error {
	if _, err := fmt.Fprintln(w, message); err != nil {
		return fmt.Errorf("write db operation result: %w", err)
	}
	if printSQL {
		if _, err := fmt.Fprintln(w, sql); err != nil {
			return fmt.Errorf("write db operation result: %w", err)
		}
	}
	return nil
}
