package types

// 本测试文件固定跨包公共类型的导入边界和响应契约，防止注释补全和后续重构改变外部可观察行为。

import (
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTypesTopLevelPackagesStayPlatformContracts(t *testing.T) {
	allowed := map[string]struct{}{
		"auth":      {},
		"constants": {},
		"errors":    {},
		"result":    {},
	}

	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read types directory: %v", err)
	}

	seen := make(map[string]struct{}, len(allowed))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}
		if _, ok := allowed[name]; !ok {
			t.Fatalf("types/%s is not a platform-level package; module models, DTOs, states, and enums must stay under internal/modules/<module>", name)
		}
		seen[name] = struct{}{}
	}

	for name := range allowed {
		if _, ok := seen[name]; !ok {
			t.Fatalf("types/%s is documented as a platform-level package but is missing from the repository", name)
		}
	}
}

// TestTypesPackagesDoNotImportInfrastructurePackages 固定跨包公共类型的导入边界和响应契约，确保后续注释补全或结构调整不改变该场景。
func TestTypesPackagesDoNotImportInfrastructurePackages(t *testing.T) {
	files, err := goFilesUnder(".")
	if err != nil {
		t.Fatalf("collect Go files: %v", err)
	}

	for _, file := range files {
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}

		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			if strings.HasPrefix(path, "github.com/open-console/console-platform/pkg/") ||
				strings.HasPrefix(path, "github.com/open-console/console-platform/internal/") {
				t.Fatalf("types packages must not import lower application or infrastructure package %q from %s", path, file)
			}
		}
	}
}

// goFilesUnder 是当前测试文件的辅助函数，用于复用夹具、断言或输入构造逻辑。
func goFilesUnder(root string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go") {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}
