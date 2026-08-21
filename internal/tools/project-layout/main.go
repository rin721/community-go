// Command project-layout 校验构建期布局与身份 metadata 的一致性。
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/rin721/go-scaffold-template/internal/kernel/cli"
	"github.com/rin721/go-scaffold-template/internal/projectlayout"
)

func main() {
	checkIdentity := flag.Bool("check-identity", false, "校验 identity config_filename 与应用默认配置路径一致")
	flag.Parse()
	root, _, err := projectlayout.FindRepositoryRootFromCurrentDirectory()
	if err != nil {
		fail(err)
	}
	if *checkIdentity {
		if err := validateIdentity(root); err != nil {
			fail(err)
		}
	}
}

func validateIdentity(repositoryRoot string) error {
	content, err := os.ReadFile(filepath.Join(repositoryRoot, ".scaffold", "identity.yaml"))
	if err != nil {
		return fmt.Errorf("read identity metadata: %w", err)
	}
	match := regexp.MustCompile(`(?m)^\s*config_filename:\s*(\S+)\s*$`).FindSubmatch(content)
	if len(match) != 2 {
		return fmt.Errorf("identity metadata config_filename is missing")
	}
	if string(match[1]) != cli.DefaultConfigPath {
		return fmt.Errorf("identity config_filename %q differs from application default %q", match[1], cli.DefaultConfigPath)
	}
	return nil
}

func fail(err error) {
	_, _ = fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
