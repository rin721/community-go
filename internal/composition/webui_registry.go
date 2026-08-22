package composition

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"

	"github.com/rin721/go-scaffold-template/internal/projectlayout"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

// GenerateWebUIRegistry renders the WebUI registry from the same composition Catalog.
func GenerateWebUIRegistry() (string, error) {
	catalog, err := applicationWebUICatalog()
	if err != nil {
		return "", err
	}
	repositoryRoot, err := webUIRepositoryRoot()
	if err != nil {
		return "", err
	}
	return GenerateWebUIRegistryForCatalogAt(catalog, repositoryRoot)
}

// GenerateWebUIRegistryAt 从指定仓库根加载当前 application catalog 并生成 registry。
func GenerateWebUIRegistryAt(repositoryRoot string) (string, error) {
	catalog, err := applicationWebUICatalog()
	if err != nil {
		return "", err
	}
	return GenerateWebUIRegistryForCatalogAt(catalog, repositoryRoot)
}

// WriteWebUIRegistryFromCurrentDirectory 在布局清单确定的仓库根写入或校验 registry。
func WriteWebUIRegistryFromCurrentDirectory(check bool) error {
	repositoryRoot, layout, err := projectlayout.FindRepositoryRootFromCurrentDirectory()
	if err != nil {
		return err
	}
	content, err := GenerateWebUIRegistryAt(repositoryRoot)
	if err != nil {
		return err
	}
	outputPath, err := layout.RepositoryPath(repositoryRoot, layout.WebUI.RegistryOutput)
	if err != nil {
		return err
	}
	if check {
		actual, readErr := os.ReadFile(outputPath)
		if readErr != nil {
			return readErr
		}
		if string(actual) != content {
			return fmt.Errorf("generated file %q is stale", filepath.ToSlash(layout.WebUI.RegistryOutput))
		}
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return err
	}
	return os.WriteFile(outputPath, []byte(content), 0o644)
}

// GenerateWebUIRegistryForCatalog renders a validated catalog relative to the repository root.
// 测试和独立生成入口可以复用同一套 module-owned source path 校验，不依赖当前应用模块集合。
func GenerateWebUIRegistryForCatalog(catalog webuicontract.Catalog, repositoryRoot string) (string, error) {
	return GenerateWebUIRegistryForCatalogAt(catalog, repositoryRoot)
}

// GenerateWebUIRegistryForCatalogAt 使用指定仓库根的目录和布局清单生成 registry。
func GenerateWebUIRegistryForCatalogAt(catalog webuicontract.Catalog, repositoryRoot string) (string, error) {
	layout, err := projectlayout.Load(repositoryRoot, "")
	if err != nil {
		return "", err
	}
	return GenerateWebUIRegistryForCatalogWithLayout(catalog, repositoryRoot, layout)
}

// GenerateWebUIRegistryForCatalogWithLayout 使用已校验布局生成 registry。
func GenerateWebUIRegistryForCatalogWithLayout(catalog webuicontract.Catalog, repositoryRoot string, layout projectlayout.Layout) (string, error) {
	if err := catalog.ValidateSourcePathOwnership(layout, repositoryRoot); err != nil {
		return "", err
	}
	registryPath, err := layout.RepositoryPath(repositoryRoot, layout.WebUI.RegistryOutput)
	if err != nil {
		return "", err
	}
	registryDirectory := filepath.Dir(registryPath)
	entries := make([]struct{ id, source string }, 0)
	locales := make([]webuicontract.Locale, 0)
	mocks := make([]struct{ moduleID, source string }, 0)
	for _, binding := range catalog.Bindings {
		if len(binding.Entries) > 0 && len(binding.Locales) == 0 {
			return "", fmt.Errorf("validate webui module %q: locale binding is required when entries are declared", binding.ModuleID)
		}
		if strings.TrimSpace(binding.MockSource) == "" && len(binding.Entries) > 0 {
			return "", fmt.Errorf("validate webui module %q: mock source is required when entries are declared", binding.ModuleID)
		}
		for _, entry := range binding.Entries {
			ownerRoot, err := layout.ModuleWebRoot(repositoryRoot, binding.ModuleID)
			if err != nil {
				return "", err
			}
			sourcePath := filepath.Join(ownerRoot, filepath.FromSlash(entry.SourcePath))
			if err := validateWebUISourceFile(sourcePath, entry.SourcePath); err != nil {
				return "", fmt.Errorf("validate webui entry %q: %w", entry.ID, err)
			}
			source, err := relativeImport(registryDirectory, sourcePath, entry.SourcePath, true)
			if err != nil {
				return "", fmt.Errorf("resolve webui entry %q import: %w", entry.ID, err)
			}
			entries = append(entries, struct{ id, source string }{entry.ID, source})
		}
		for _, locale := range binding.Locales {
			ownerRoot, err := layout.ModuleWebRoot(repositoryRoot, binding.ModuleID)
			if err != nil {
				return "", err
			}
			if err := validateWebUILocaleFile(filepath.Join(ownerRoot, filepath.FromSlash(locale.SourcePath)), locale.SourcePath); err != nil {
				return "", fmt.Errorf("validate webui locale %q/%q: %w", locale.Language, locale.Namespace, err)
			}
			locales = append(locales, locale)
		}
		if err := validateWebUILocaleCoverage(repositoryRoot, layout, binding); err != nil {
			return "", err
		}
		if strings.TrimSpace(binding.MockSource) == "" {
			continue
		}
		ownerRoot, err := layout.ModuleWebRoot(repositoryRoot, binding.ModuleID)
		if err != nil {
			return "", err
		}
		sourcePath := filepath.Join(ownerRoot, filepath.FromSlash(binding.MockSource))
		if err := validateWebUISourceFile(sourcePath, binding.MockSource); err != nil {
			return "", fmt.Errorf("validate webui mock %q: %w", binding.ModuleID, err)
		}
		source, err := relativeImport(registryDirectory, sourcePath, binding.MockSource, true)
		if err != nil {
			return "", fmt.Errorf("resolve webui mock %q import: %w", binding.ModuleID, err)
		}
		mocks = append(mocks, struct{ moduleID, source string }{binding.ModuleID, source})
	}
	sort.Slice(mocks, func(i, j int) bool { return mocks[i].moduleID < mocks[j].moduleID })
	sort.Slice(entries, func(i, j int) bool { return entries[i].id < entries[j].id })
	sort.Slice(locales, func(i, j int) bool {
		if locales[i].Language != locales[j].Language {
			return locales[i].Language < locales[j].Language
		}
		return locales[i].Namespace < locales[j].Namespace
	})
	var builder strings.Builder
	builder.WriteString("// Code generated by webui-gen; DO NOT EDIT.\n\n")
	fmt.Fprintf(&builder, "export const webuiRevision = %q;\n\n", catalog.Revision)
	builder.WriteString("export const webuiEntryRegistry = {\n")
	for _, entry := range entries {
		fmt.Fprintf(&builder, "  %q: () => import(%q),\n", entry.id, entry.source)
	}
	builder.WriteString("} as const;\n\n")
	builder.WriteString("export type WebUILocaleMessages = Readonly<Record<string, string>>;\n\n")
	builder.WriteString("export const webuiLocaleRegistry = {\n")
	currentLanguage := ""
	for _, locale := range locales {
		if locale.Language != currentLanguage {
			if currentLanguage != "" {
				builder.WriteString("  },\n")
			}
			fmt.Fprintf(&builder, "  %q: {\n", locale.Language)
			currentLanguage = locale.Language
		}
		ownerRoot, err := layout.ModuleWebRoot(repositoryRoot, findLocaleModule(catalog, locale))
		if err != nil {
			return "", err
		}
		sourcePath := filepath.Join(ownerRoot, filepath.FromSlash(locale.SourcePath))
		source, err := relativeImport(registryDirectory, sourcePath, locale.SourcePath, false)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(&builder, "    %q: () => import(%q).then(({ default: messages }) => messages as WebUILocaleMessages),\n", locale.Namespace, source)
	}
	if currentLanguage != "" {
		builder.WriteString("  },\n")
	}
	builder.WriteString("} as const;\n\n")
	builder.WriteString("export const webuiMockRegistry = {\n")
	for _, mock := range mocks {
		fmt.Fprintf(&builder, "  %q: () => import(%q),\n", mock.moduleID, mock.source)
	}
	builder.WriteString("} as const;\n\n")
	mockManifest, err := projectWebUIMockManifest(catalog)
	if err != nil {
		return "", err
	}
	manifestPayload, marshalErr := json.MarshalIndent(mockManifest, "", "  ")
	if marshalErr != nil {
		return "", fmt.Errorf("marshal webui mock manifest: %w", marshalErr)
	}
	builder.WriteString("// webuiMockManifest 是 mock 环境下宿主导入的完整运行时 manifest 快照（全路由可用）。\n")
	builder.WriteString("export const webuiMockManifest = ")
	builder.Write(manifestPayload)
	builder.WriteString(" as const;\n")
	return builder.String(), nil
}

// projectWebUIMockManifest 把应用 catalog 投影为 mock 环境的全可用 manifest：
// 所有已实现路由 allowed + available、菜单使用默认导航策略，catalogRevision 与
// 生成 registry 的 webuiRevision 天然一致（宿主 revision 门禁依赖这一点）。
func projectWebUIMockManifest(catalog webuicontract.Catalog) (webuicontract.Manifest, error) {
	policy, err := webuicontract.BuildNavigationPolicySnapshot(catalog)
	if err != nil {
		return webuicontract.Manifest{}, fmt.Errorf("build webui mock navigation policy: %w", err)
	}
	manifest, err := catalog.ManifestForWithNavigation(
		policy,
		func(string) webuicontract.Access { return webuicontract.AccessAllowed },
		func(string) webuicontract.Availability { return webuicontract.Availability{State: webuicontract.AvailabilityAvailable} },
	)
	if err != nil {
		return webuicontract.Manifest{}, fmt.Errorf("project webui mock manifest: %w", err)
	}
	return manifest, nil
}

func webUIRepositoryRoot() (string, error) {
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("resolve webui generator source path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(sourceFile), "..", "..")), nil
}

func validateWebUISourceFile(absolutePath string, displayPath string) error {
	fileInfo, err := os.Stat(absolutePath)
	if err != nil {
		return fmt.Errorf("stat %s: %w", displayPath, err)
	}
	if !fileInfo.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", displayPath)
	}
	return nil
}

func validateWebUILocaleFile(absolutePath string, sourcePath string) error {
	if err := validateWebUISourceFile(absolutePath, sourcePath); err != nil {
		return err
	}
	content, err := os.ReadFile(absolutePath)
	if err != nil {
		return fmt.Errorf("read %s: %w", sourcePath, err)
	}
	messages := map[string]string{}
	if err := json.Unmarshal(content, &messages); err != nil {
		return fmt.Errorf("decode %s as string message map: %w", sourcePath, err)
	}
	if len(messages) == 0 {
		return fmt.Errorf("%s has no messages", sourcePath)
	}
	for messageID := range messages {
		if strings.TrimSpace(messageID) == "" {
			return fmt.Errorf("%s contains an empty message id", sourcePath)
		}
	}
	return nil
}

func validateWebUILocaleCoverage(repositoryRoot string, layout projectlayout.Layout, binding webuicontract.Binding) error {
	if len(binding.Routes) == 0 && len(binding.Navigation) == 0 {
		return nil
	}
	type localeResource struct {
		language  string
		namespace string
		messages  map[string]string
	}
	resources := make([]localeResource, 0, len(binding.Locales))
	moduleRoot, err := layout.ModuleWebRoot(repositoryRoot, binding.ModuleID)
	if err != nil {
		return err
	}
	for _, locale := range binding.Locales {
		path := filepath.Join(moduleRoot, filepath.FromSlash(locale.SourcePath))
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read locale %q/%q for coverage: %w", locale.Language, locale.Namespace, err)
		}
		messages := map[string]string{}
		if err := json.Unmarshal(content, &messages); err != nil {
			return fmt.Errorf("decode locale %q/%q for coverage: %w", locale.Language, locale.Namespace, err)
		}
		resources = append(resources, localeResource{language: locale.Language, namespace: locale.Namespace, messages: messages})
	}
	messageIDs := make([]string, 0, len(binding.Routes)+len(binding.Navigation))
	for _, route := range binding.Routes {
		messageIDs = append(messageIDs, route.TitleMessageID)
	}
	for _, item := range binding.Navigation {
		messageIDs = append(messageIDs, item.TitleMessageID)
	}
	for _, messageID := range messageIDs {
		parts := strings.Split(messageID, ".")
		if len(parts) < 2 {
			return fmt.Errorf("webui module %q message id %q has no namespace", binding.ModuleID, messageID)
		}
		namespace := strings.Join(parts[:2], ".")
		foundNamespace := false
		for _, resource := range resources {
			if resource.namespace != namespace {
				continue
			}
			foundNamespace = true
			if _, ok := resource.messages[messageID]; !ok {
				return fmt.Errorf("webui module %q locale %q/%q misses message %q", binding.ModuleID, resource.language, resource.namespace, messageID)
			}
		}
		if !foundNamespace {
			return fmt.Errorf("webui module %q has no locale namespace %q for message %q", binding.ModuleID, namespace, messageID)
		}
	}
	return nil
}

func relativeImport(registryDirectory, sourcePath, displayPath string, stripExtension bool) (string, error) {
	relative, err := filepath.Rel(registryDirectory, sourcePath)
	if err != nil {
		return "", fmt.Errorf("relative path from registry to %s: %w", displayPath, err)
	}
	withoutExtension := relative
	if stripExtension {
		withoutExtension = strings.TrimSuffix(relative, filepath.Ext(relative))
	}
	importPath := filepath.ToSlash(withoutExtension)
	if !strings.HasPrefix(importPath, ".") {
		importPath = "./" + importPath
	}
	return importPath, nil
}

func findLocaleModule(catalog webuicontract.Catalog, locale webuicontract.Locale) string {
	for _, binding := range catalog.Bindings {
		for _, candidate := range binding.Locales {
			if candidate.Language == locale.Language && candidate.Namespace == locale.Namespace && candidate.SourcePath == locale.SourcePath {
				return binding.ModuleID
			}
		}
	}
	return ""
}
