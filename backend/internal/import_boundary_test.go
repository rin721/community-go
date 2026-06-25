package internal_test

import (
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const modulePath = "github.com/open-console/console-platform"

func TestInternalPackagesDoNotImportThirdPartyInfrastructure(t *testing.T) {
	files, err := goFilesUnder(".")
	if err != nil {
		t.Fatalf("collect internal go files: %v", err)
	}

	for _, file := range files {
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}

		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			if isThirdPartyImport(path) {
				t.Fatalf("internal package must use pkg anti-corruption wrappers instead of third-party import %q from %s", path, file)
			}
		}
	}
}

func TestInternalProductionCodeDoesNotImportPkgOutsideAppAndConfig(t *testing.T) {
	files, err := goFilesUnder(".")
	if err != nil {
		t.Fatalf("collect internal go files: %v", err)
	}

	for _, file := range files {
		normalized := filepath.ToSlash(file)
		if strings.HasSuffix(normalized, "_test.go") || internalPkgImportAllowed(normalized) {
			continue
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}

		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			if strings.HasPrefix(path, modulePath+"/pkg/") {
				t.Fatalf("internal production code outside app/config must depend on internal ports instead of pkg import %q from %s", path, file)
			}
			if forbiddenPluginExampleImport(path) {
				t.Fatalf("production code must not import plugin examples %q from %s", path, file)
			}
		}
	}
}

func TestProductionCodeDoesNotImportPluginExamples(t *testing.T) {
	for _, root := range []string{"../cmd", ".", "../pkg", "../types"} {
		files, err := goFilesUnder(root)
		if err != nil {
			t.Fatalf("collect go files under %s: %v", root, err)
		}
		for _, file := range files {
			normalized := filepath.ToSlash(file)
			if strings.HasSuffix(normalized, "_test.go") {
				continue
			}
			parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
			if err != nil {
				t.Fatalf("parse %s imports: %v", file, err)
			}
			for _, spec := range parsed.Imports {
				path := strings.Trim(spec.Path.Value, `"`)
				if forbiddenPluginExampleImport(path) {
					t.Fatalf("production code must not import plugin examples %q from %s", path, file)
				}
			}
		}
	}
}

func TestPluginRuntimePackagesAreNotPresent(t *testing.T) {
	for _, path := range []string{"plugin", "pluginhost", "modules/plugins", "../pkg/plugin", "../pkg/pluginapi", "../_examples/remote-plugins"} {
		if _, err := os.Stat(path); err == nil {
			t.Fatalf("removed plugin runtime path %s must not be present", path)
		} else if !os.IsNotExist(err) {
			t.Fatalf("stat removed plugin runtime path %s: %v", path, err)
		}
	}
}

func TestRemovedPluginDeliveryArtifactsAreNotPresent(t *testing.T) {
	repoRoot := repositoryRoot(t)
	for _, rel := range []string{
		"_examples/remote-plugins",
		"configs/examples/plugins-remote-rpc.example.yaml",
		"docs/api/plugin-protocol",
		"docs/architecture/distributed-plugin-system.md",
		"docs/modules/plugins.md",
		"internal/plugin",
		"pkg/plugin",
		"pkg/pluginapi",
		"web/app/app/lib/api/plugins.ts",
		"web/app/app/routes/admin/plugins.tsx",
	} {
		path := filepath.Join(repoRoot, filepath.FromSlash(rel))
		if _, err := os.Stat(path); err == nil {
			t.Fatalf("removed plugin delivery artifact %s must not be present", rel)
		} else if !os.IsNotExist(err) {
			t.Fatalf("stat removed plugin delivery artifact %s: %v", rel, err)
		}
	}
}

func TestTrackedConfigExamplesDoNotExposePluginSettings(t *testing.T) {
	repoRoot := repositoryRoot(t)
	files := []string{
		".env.example",
		"configs/config.example.yaml",
		"deploy/config.production.example.yaml",
		"deploy/docker-compose.production.example.yml",
	}

	exampleDir := filepath.Join(repoRoot, "configs", "examples")
	entries, err := os.ReadDir(exampleDir)
	if err != nil {
		t.Fatalf("read config examples directory: %v", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml") {
			files = append(files, filepath.ToSlash(filepath.Join("configs", "examples", name)))
		}
	}

	for _, rel := range files {
		data, err := os.ReadFile(filepath.Join(repoRoot, filepath.FromSlash(rel)))
		if err != nil {
			t.Fatalf("read tracked config example %s: %v", rel, err)
		}
		lower := strings.ToLower(string(data))
		for _, token := range []string{"plugins:", "plugin:", "plugin-api", "/api/v1/plugins", "/plugin-api"} {
			if strings.Contains(lower, token) {
				t.Fatalf("tracked config example %s must not expose removed plugin setting %q", rel, token)
			}
		}
	}
}

func TestModuleServiceLayerStaysInfrastructureFree(t *testing.T) {
	files, err := goFilesUnder("modules")
	if err != nil {
		t.Fatalf("collect module go files: %v", err)
	}

	for _, file := range files {
		normalized := filepath.ToSlash(file)
		if strings.HasSuffix(normalized, "_test.go") || !isModuleServiceFile(normalized) {
			continue
		}
		module, ok := moduleNameFromServiceFile(normalized)
		if !ok {
			continue
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}
		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			switch path {
			case modulePath + "/internal/modules/" + module + "/repository":
				t.Fatalf("service layer must depend on its own repository interface, not repository implementation import %q from %s", path, file)
			case modulePath + "/internal/ports":
				t.Fatalf("service layer must define minimal local interfaces instead of importing shared infrastructure ports from %s", file)
			}
		}

		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		text := string(content)
		for _, pattern := range []string{"http.Client", "smtp.", "os.Getenv", "database.New", "WithExecutor"} {
			if strings.Contains(text, pattern) {
				t.Fatalf("service layer must not contain infrastructure pattern %q in %s", pattern, file)
			}
		}
	}
}

func TestMiddlewareDoesNotImportModuleServices(t *testing.T) {
	files, err := goFilesUnder("middleware")
	if err != nil {
		t.Fatalf("collect middleware go files: %v", err)
	}

	for _, file := range files {
		normalized := filepath.ToSlash(file)
		if strings.HasSuffix(normalized, "_test.go") {
			continue
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}
		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			if strings.HasPrefix(path, modulePath+"/internal/modules/") && strings.Contains(path, "/service") {
				t.Fatalf("middleware must depend on ports/types instead of module service import %q from %s", path, file)
			}
		}
	}
}

func TestNonIAMModulesDoNotImportIAMInternals(t *testing.T) {
	files, err := goFilesUnder("modules")
	if err != nil {
		t.Fatalf("collect module go files: %v", err)
	}

	for _, file := range files {
		normalized := filepath.ToSlash(file)
		if strings.HasSuffix(normalized, "_test.go") || strings.HasPrefix(strings.TrimPrefix(normalized, "./"), "modules/iam/") {
			continue
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s imports: %v", file, err)
		}
		for _, spec := range parsed.Imports {
			path := strings.Trim(spec.Path.Value, `"`)
			if strings.HasPrefix(path, modulePath+"/internal/modules/iam/") {
				t.Fatalf("non-IAM modules must use platform ports/types instead of IAM internal import %q from %s", path, file)
			}
		}
	}
}

func goFilesUnder(root string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if strings.HasSuffix(path, ".go") {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}

func isModuleServiceFile(path string) bool {
	parts := strings.Split(strings.TrimPrefix(path, "./"), "/")
	return len(parts) >= 4 && parts[0] == "modules" && parts[2] == "service"
}

func moduleNameFromServiceFile(path string) (string, bool) {
	parts := strings.Split(strings.TrimPrefix(path, "./"), "/")
	if len(parts) < 4 || parts[0] != "modules" || parts[2] != "service" {
		return "", false
	}
	return parts[1], true
}

func internalPkgImportAllowed(path string) bool {
	path = strings.TrimPrefix(path, "./")
	return strings.HasPrefix(path, "app/") ||
		strings.HasPrefix(path, "config/")
}

func isThirdPartyImport(path string) bool {
	if strings.HasPrefix(path, modulePath) {
		return false
	}
	first := path
	if idx := strings.Index(first, "/"); idx >= 0 {
		first = first[:idx]
	}
	return strings.Contains(first, ".")
}

func forbiddenPluginExampleImport(path string) bool {
	return strings.HasPrefix(path, modulePath+"/plugins/") || strings.HasPrefix(path, modulePath+"/_examples/")
}

func repositoryRoot(t *testing.T) string {
	t.Helper()

	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		} else if !os.IsNotExist(err) {
			t.Fatalf("stat go.mod under %s: %v", dir, err)
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("repository root with go.mod not found")
		}
		dir = parent
	}
}
