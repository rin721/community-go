package main

import (
	"context"
	"fmt"
	"os"

	"github.com/open-console/console-platform/internal/app/cliapp"
	"github.com/open-console/console-platform/pkg/cli"
)

// main 是编译后二进制的进程入口。
func main() {
	if err := cliapp.Run(context.Background(), os.Args[1:], os.Stdin, os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(cli.GetExitCode(err))
	}
}
