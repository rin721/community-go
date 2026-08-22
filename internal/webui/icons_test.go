package webui

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"
)

// repositoryRootForTest 定位仓库根（本文件位于 internal/webui 下）。
func repositoryRootForTest() string {
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		return ""
	}
	return filepath.Clean(filepath.Join(filepath.Dir(sourceFile), "..", ".."))
}

// TestIconCatalogMatchesFrontendRegistry 守护 Go 校验集合与前端图标目录的一致性：
// 两侧增删 iconId 都必须同步，否则 BuildCatalog 校验与前端渲染会漂移。
func TestIconCatalogMatchesFrontendRegistry(t *testing.T) {
	root := repositoryRootForTest()
	if root == "" {
		t.Fatal("cannot resolve repository root")
	}
	frontendCatalogPath := filepath.Join(root, "webui", "src", "icon-catalog.ts")
	content, err := os.ReadFile(frontendCatalogPath)
	if err != nil {
		t.Fatalf("read frontend icon catalog: %v", err)
	}
	block := regexp.MustCompile(`(?s)export const iconCatalog = \{(.*?)\} as const;`).FindStringSubmatch(string(content))
	if len(block) != 2 {
		t.Fatalf("cannot locate iconCatalog block in %s", frontendCatalogPath)
	}
	keyPattern := regexp.MustCompile(`(?m)^\s{2}(?:["'])?([a-z0-9-]+)(?:["'])?:`)
	frontend := map[string]struct{}{}
	for _, match := range keyPattern.FindAllStringSubmatch(block[1], -1) {
		frontend[match[1]] = struct{}{}
	}
	project := map[string]struct{}{}
	for id := range IconCatalog {
		project[id] = struct{}{}
	}
	var missingInFrontend, missingInGo []string
	for id := range project {
		if _, ok := frontend[id]; !ok {
			missingInFrontend = append(missingInFrontend, id)
		}
	}
	for id := range frontend {
		if _, ok := project[id]; !ok {
			missingInGo = append(missingInGo, id)
		}
	}
	if len(missingInFrontend) > 0 || len(missingInGo) > 0 {
		sort.Strings(missingInFrontend)
		sort.Strings(missingInGo)
		t.Fatalf("icon catalog drift: missing in frontend=%v missing in Go=%v", strings.Join(missingInFrontend, ","), strings.Join(missingInGo, ","))
	}
}