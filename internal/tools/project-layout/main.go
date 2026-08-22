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
	"github.com/rin721/go-scaffold-template/internal/webuihost"
)

func main() {
	checkIdentity := flag.Bool("check-identity", false, "校验 identity config_filename 与应用默认配置路径一致")
	checkWebUI := flag.Bool("check-webui", false, "校验 webui 托管默认值与布局清单一致")
	flag.Parse()
	root, layout, err := projectlayout.FindRepositoryRootFromCurrentDirectory()
	if err != nil {
		fail(err)
	}
	if *checkIdentity {
		if err := validateIdentity(root); err != nil {
			fail(err)
		}
	}
	if *checkWebUI {
		if err := validateWebUI(root, layout); err != nil {
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

// validateWebUI 守护 webui 托管默认值与布局清单的一致性：托管目录默认值必须等于
// 布局 WebUI 根拼接 /dist，前置构建脚本默认值必须位于布局 WebUI 根下，且两个
// 默认脚本文件必须存在。生产 Service 不读取布局清单，因此漂移由构建期门禁拒绝。
func validateWebUI(repositoryRoot string, layout projectlayout.Layout) error {
	defaults := webuihost.Default()
	wantDir := layout.Roots.WebUI + "/dist"
	if filepath.ToSlash(defaults.Hosting.Dir) != wantDir {
		return fmt.Errorf("webui hosting default dir %q differs from layout roots.webui + /dist (%q)", defaults.Hosting.Dir, wantDir)
	}
	wantScript := layout.Roots.WebUI + "/scripts/build-webui.mjs"
	if filepath.ToSlash(defaults.Hosting.BuildScript) != wantScript {
		return fmt.Errorf("webui hosting default build script %q differs from layout root script (%q)", defaults.Hosting.BuildScript, wantScript)
	}
	for _, relative := range []string{
		layout.Roots.WebUI + "/scripts/build-webui.mjs",
		layout.Roots.WebUI + "/scripts/build-webui.sh",
	} {
		absolute, err := layout.RepositoryPath(repositoryRoot, relative)
		if err != nil {
			return err
		}
		info, err := os.Stat(absolute)
		if err != nil {
			return fmt.Errorf("webui hosting build script is missing: %w", err)
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("webui hosting build script %q is not a regular file", relative)
		}
	}
	return nil
}

func fail(err error) {
	_, _ = fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
