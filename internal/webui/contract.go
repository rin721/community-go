// Package webui 定义 WebUI 的项目自有声明与运行时 manifest 契约。
package webui

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/rin721/go-scaffold-template/internal/projectlayout"
	"golang.org/x/text/language"
)

// DeliveryState 表示页面实现是否已经交付，不混入运行时可用性或访问结果。
type DeliveryState string

const (
	DeliveryImplemented    DeliveryState = "implemented"
	DeliveryNotImplemented DeliveryState = "not-implemented"
)

// RouteLayout 表示页面应由哪一种宿主布局承载。
type RouteLayout string

const (
	RouteLayoutApp   RouteLayout = "app"
	RouteLayoutBlank RouteLayout = "blank"
)

// Access 表示当前请求对页面查看 operation 的访问结果。
type Access string

const (
	AccessAllowed                Access = "allowed"
	AccessAuthenticationRequired Access = "authentication-required"
	AccessDenied                 Access = "denied"
)

// ActivationState 表示应用是否发布模块。它不表示页面是否已实现或运行时是否可用。
type ActivationState string

const (
	ActivationEnabled  ActivationState = "enabled"
	ActivationDisabled ActivationState = "disabled"
)

// AvailabilityState 表示服务端为某个 route 提供的运行时能力快照。
type AvailabilityState string

const (
	AvailabilityAvailable   AvailabilityState = "available"
	AvailabilityDegraded    AvailabilityState = "degraded"
	AvailabilityUnavailable AvailabilityState = "unavailable"
)

// Availability 是安全 manifest 中的 route 级运行时能力视图。
type Availability struct {
	State        AvailabilityState
	Capabilities []string
}

// SDKRequirement 是模块对项目自有 WebUI SDK 主版本的构建期声明。
type SDKRequirement struct {
	ID           string
	MajorVersion uint
}

// SDKInventory 是 composition 当前实际提供的 SDK capability 主版本清单。
type SDKInventory map[string]uint

// ModuleRegistration 是应用 composition 对模块选择和发布状态的显式声明。
type ModuleRegistration struct {
	Binding    Binding
	Activation ActivationState
}

// Binding 是模块拥有的不可变 WebUI 声明。声明 Entry 的模块必须同时声明 locale；SourcePath 只用于构建期生成。
type Binding struct {
	ModuleID   string
	Entries    []Entry
	Routes     []Route
	Navigation []Navigation
	Locales    []Locale
	Requires   []SDKRequirement
}

// Entry 是一个可延迟加载的页面入口。
type Entry struct {
	ID         string
	SourcePath string
}

// Route 是宿主 Router 使用的稳定页面声明。
type Route struct {
	ID                     string
	Path                   string
	EntryID                string
	TitleMessageID         string
	ViewOperationID        string
	Layout                 RouteLayout
	DeliveryState          DeliveryState
	DegradedCapabilities   []string
	Default                bool
	UnauthenticatedDefault bool
}

// Navigation 是宿主菜单使用的稳定节点。
type Navigation struct {
	ID             string
	ParentID       string
	RouteID        string
	TitleMessageID string
	IconID         string
	Order          int
}

// Locale 是模块拥有的浏览器语言资源。
type Locale struct {
	Language   string
	Namespace  string
	SourcePath string
}

// Catalog 是通过校验并冻结后的全部模块声明。
type Catalog struct {
	Bindings []Binding
	Revision string
}

// NavigationPolicy 是 Navigation Service 可提供的稀疏运行时策略；缺失项沿用静态声明。
type NavigationPolicy struct {
	NavigationID   string
	Enabled        bool
	ParentOverride *string
	OrderOverride  *int
}

type effectiveNavigationPolicy struct {
	NavigationID string
	Enabled      bool
	ParentID     string
	Order        int
}

// NavigationPolicySnapshot 是已校验、不可变并绑定到某一 Catalog revision 的有效策略快照。
type NavigationPolicySnapshot struct {
	Revision        string
	catalogRevision string
	policies        map[string]effectiveNavigationPolicy
}

// Manifest 是可安全返回给浏览器的运行时视图，不包含文件系统路径。
type Manifest struct {
	CatalogRevision    string          `json:"catalogRevision"`
	NavigationRevision string          `json:"navigationRevision"`
	Routes             []ManifestRoute `json:"routes"`
	Menu               []ManifestMenu  `json:"menu"`
}

// ManifestRoute 是剥离构建期字段后的路由。
type ManifestRoute struct {
	ModuleID               string            `json:"moduleId"`
	ID                     string            `json:"id"`
	Path                   string            `json:"path"`
	EntryID                string            `json:"entryId"`
	TitleMessageID         string            `json:"titleMessageId"`
	ViewOperationID        string            `json:"viewOperationId,omitempty"`
	Layout                 RouteLayout       `json:"layout"`
	DeliveryState          DeliveryState     `json:"deliveryState"`
	Default                bool              `json:"default"`
	UnauthenticatedDefault bool              `json:"unauthenticatedDefault"`
	Access                 Access            `json:"access"`
	Availability           AvailabilityState `json:"availability"`
	AvailableCapabilities  []string          `json:"availableCapabilities,omitempty"`
}

// ManifestMenu 是剥离构建期字段后的菜单节点。
type ManifestMenu struct {
	ModuleID       string `json:"moduleId"`
	ID             string `json:"id"`
	ParentID       string `json:"parentId,omitempty"`
	RouteID        string `json:"routeId"`
	TitleMessageID string `json:"titleMessageId"`
	IconID         string `json:"iconId"`
	Order          int    `json:"order"`
}

// BuildCatalog 校验并复制模块声明，按稳定顺序计算 SHA-256 revision。
func BuildCatalog(bindings ...Binding) (Catalog, error) {
	copyBindings := cloneBindings(bindings)
	if err := validateBindings(copyBindings); err != nil {
		return Catalog{}, err
	}
	sort.Slice(copyBindings, func(i, j int) bool { return copyBindings[i].ModuleID < copyBindings[j].ModuleID })
	canonical, err := json.Marshal(copyBindings)
	if err != nil {
		return Catalog{}, fmt.Errorf("marshal webui catalog: %w", err)
	}
	digest := sha256.Sum256(canonical)
	return Catalog{Bindings: copyBindings, Revision: hex.EncodeToString(digest[:])}, nil
}

// BuildApplicationCatalog 根据显式 registration 生成可部署 Catalog。
// disabled 模块和 not-implemented route 在投影阶段被完全移除，不会进入生成器或 runtime manifest。
func BuildApplicationCatalog(registrations []ModuleRegistration, inventory SDKInventory) (Catalog, error) {
	bindings := make([]Binding, 0, len(registrations))
	for index, registration := range registrations {
		if err := validateBindings([]Binding{registration.Binding}); err != nil {
			return Catalog{}, fmt.Errorf("validate webui module registration %d: %w", index, err)
		}
		switch registration.Activation {
		case ActivationEnabled:
		case ActivationDisabled:
			continue
		default:
			return Catalog{}, fmt.Errorf("webui module registration %d has invalid activation %q", index, registration.Activation)
		}
		if err := validateSDKRequirements(registration.Binding, inventory); err != nil {
			return Catalog{}, err
		}
		projected, err := projectImplementedRoutes(registration.Binding)
		if err != nil {
			return Catalog{}, err
		}
		if len(projected.Routes) == 0 {
			continue
		}
		bindings = append(bindings, projected)
	}
	return BuildCatalog(bindings...)
}

// ManifestFor 返回当前主体的安全 manifest；accessLookup 只接收 operation ID。
func (c Catalog) ManifestFor(accessLookup func(string) Access) Manifest {
	return c.ManifestForWithAvailability(accessLookup, func(string) Availability {
		return Availability{State: AvailabilityAvailable}
	})
}

// ManifestForWithAvailability 返回 access 和 availability 门禁后的安全 manifest。
// unavailable route 仍可作为宿主状态呈现，但不会出现在可加载菜单中。
func (c Catalog) ManifestForWithAvailability(accessLookup func(string) Access, availabilityLookup func(string) Availability) Manifest {
	policy, err := BuildNavigationPolicySnapshot(c)
	if err != nil {
		return Manifest{CatalogRevision: c.Revision}
	}
	manifest, err := c.ManifestForWithNavigation(policy, accessLookup, availabilityLookup)
	if err != nil {
		return Manifest{CatalogRevision: c.Revision}
	}
	return manifest
}

// ManifestForWithNavigation 在策略、访问和可用性三类门禁后生成安全 manifest。
func (c Catalog) ManifestForWithNavigation(policy NavigationPolicySnapshot, accessLookup func(string) Access, availabilityLookup func(string) Availability) (Manifest, error) {
	if policy.catalogRevision != c.Revision || policy.Revision == "" {
		return Manifest{}, fmt.Errorf("webui navigation policy snapshot does not match catalog revision")
	}
	if accessLookup == nil {
		accessLookup = func(string) Access { return AccessAuthenticationRequired }
	}
	if availabilityLookup == nil {
		availabilityLookup = func(string) Availability { return Availability{State: AvailabilityUnavailable} }
	}
	manifest := Manifest{CatalogRevision: c.Revision, NavigationRevision: policy.Revision}
	loadableRoutes := map[string]bool{}
	for _, binding := range c.Bindings {
		for _, route := range binding.Routes {
			if route.DeliveryState != DeliveryImplemented {
				continue
			}
			access := AccessAllowed
			if route.ViewOperationID != "" {
				access = accessLookup(route.ViewOperationID)
			}
			if access != AccessAllowed && access != AccessAuthenticationRequired && access != AccessDenied {
				access = AccessDenied
			}
			availability := normalizeAvailability(route, availabilityLookup(route.ID))
			if access == AccessAllowed && (availability.State == AvailabilityAvailable || availability.State == AvailabilityDegraded) {
				loadableRoutes[route.ID] = true
			}
			manifest.Routes = append(manifest.Routes, ManifestRoute{
				ModuleID: binding.ModuleID, ID: route.ID, Path: route.Path, EntryID: route.EntryID,
				TitleMessageID: route.TitleMessageID, ViewOperationID: route.ViewOperationID,
				Layout: route.Layout, DeliveryState: route.DeliveryState, Default: route.Default,
				UnauthenticatedDefault: route.UnauthenticatedDefault, Access: access,
				Availability: availability.State, AvailableCapabilities: availability.Capabilities,
			})
		}
		for _, item := range binding.Navigation {
			effective, exists := policy.policies[item.ID]
			if !exists || !effective.Enabled || !loadableRoutes[item.RouteID] {
				continue
			}
			manifest.Menu = append(manifest.Menu, ManifestMenu{
				ModuleID: binding.ModuleID, ID: item.ID, ParentID: effective.ParentID, RouteID: item.RouteID,
				TitleMessageID: item.TitleMessageID, IconID: item.IconID, Order: effective.Order,
			})
		}
	}
	manifest.Menu = retainMenuWithVisibleParents(manifest.Menu)
	sort.Slice(manifest.Routes, func(i, j int) bool { return manifest.Routes[i].ID < manifest.Routes[j].ID })
	sort.Slice(manifest.Menu, func(i, j int) bool {
		if manifest.Menu[i].Order != manifest.Menu[j].Order {
			return manifest.Menu[i].Order < manifest.Menu[j].Order
		}
		return manifest.Menu[i].ID < manifest.Menu[j].ID
	})
	return manifest, nil
}

const (
	minimumNavigationOrder = -1_000_000
	maximumNavigationOrder = 1_000_000
)

// BuildNavigationPolicySnapshot 把稀疏 override 投影为完整有效快照并计算独立 revision。
func BuildNavigationPolicySnapshot(catalog Catalog, overrides ...NavigationPolicy) (NavigationPolicySnapshot, error) {
	policies := make(map[string]effectiveNavigationPolicy)
	for _, binding := range catalog.Bindings {
		for _, item := range binding.Navigation {
			policies[item.ID] = effectiveNavigationPolicy{NavigationID: item.ID, Enabled: true, ParentID: item.ParentID, Order: item.Order}
		}
	}
	seen := make(map[string]struct{}, len(overrides))
	for index, override := range overrides {
		if _, exists := seen[override.NavigationID]; exists {
			return NavigationPolicySnapshot{}, fmt.Errorf("webui navigation policy %q is duplicated", override.NavigationID)
		}
		seen[override.NavigationID] = struct{}{}
		effective, exists := policies[override.NavigationID]
		if !exists {
			return NavigationPolicySnapshot{}, fmt.Errorf("webui navigation policy %d references unknown navigation %q", index, override.NavigationID)
		}
		effective.Enabled = override.Enabled
		if override.ParentOverride != nil {
			effective.ParentID = *override.ParentOverride
		}
		if override.OrderOverride != nil {
			effective.Order = *override.OrderOverride
		}
		policies[override.NavigationID] = effective
	}
	canonical := make([]effectiveNavigationPolicy, 0, len(policies))
	for _, policy := range policies {
		if policy.Order < minimumNavigationOrder || policy.Order > maximumNavigationOrder {
			return NavigationPolicySnapshot{}, fmt.Errorf("webui navigation policy %q order %d is outside supported range", policy.NavigationID, policy.Order)
		}
		if policy.ParentID != "" {
			if _, exists := policies[policy.ParentID]; !exists {
				return NavigationPolicySnapshot{}, fmt.Errorf("webui navigation policy %q references unknown parent %q", policy.NavigationID, policy.ParentID)
			}
		}
		canonical = append(canonical, policy)
	}
	sort.Slice(canonical, func(left, right int) bool { return canonical[left].NavigationID < canonical[right].NavigationID })
	if err := validateEffectiveNavigationCycles(canonical); err != nil {
		return NavigationPolicySnapshot{}, err
	}
	payload, err := json.Marshal(canonical)
	if err != nil {
		return NavigationPolicySnapshot{}, fmt.Errorf("marshal webui navigation policy: %w", err)
	}
	digest := sha256.Sum256(payload)
	return NavigationPolicySnapshot{Revision: hex.EncodeToString(digest[:]), catalogRevision: catalog.Revision, policies: policies}, nil
}

func validateEffectiveNavigationCycles(policies []effectiveNavigationPolicy) error {
	parents := make(map[string]string, len(policies))
	for _, policy := range policies {
		parents[policy.NavigationID] = policy.ParentID
	}
	for node := range parents {
		seen := map[string]struct{}{}
		for current := node; current != ""; current = parents[current] {
			if _, exists := seen[current]; exists {
				return fmt.Errorf("webui navigation policy contains a parent cycle at %q", node)
			}
			seen[current] = struct{}{}
		}
	}
	return nil
}

func retainMenuWithVisibleParents(items []ManifestMenu) []ManifestMenu {
	byID := make(map[string]ManifestMenu, len(items))
	for _, item := range items {
		byID[item.ID] = item
	}
	result := make([]ManifestMenu, 0, len(items))
	for _, item := range items {
		visible := true
		for parentID := item.ParentID; parentID != ""; {
			parent, exists := byID[parentID]
			if !exists {
				visible = false
				break
			}
			parentID = parent.ParentID
		}
		if !visible {
			continue
		}
		result = append(result, item)
	}
	return result
}

func validateSDKRequirements(binding Binding, inventory SDKInventory) error {
	seen := map[string]struct{}{}
	for _, requirement := range binding.Requires {
		if strings.TrimSpace(requirement.ID) == "" || requirement.MajorVersion == 0 {
			return fmt.Errorf("webui module %q has incomplete SDK requirement", binding.ModuleID)
		}
		if _, exists := seen[requirement.ID]; exists {
			return fmt.Errorf("webui module %q SDK requirement %q is duplicated", binding.ModuleID, requirement.ID)
		}
		seen[requirement.ID] = struct{}{}
		provided, exists := inventory[requirement.ID]
		if !exists {
			return fmt.Errorf("webui module %q requires unknown SDK capability %q", binding.ModuleID, requirement.ID)
		}
		if provided != requirement.MajorVersion {
			return fmt.Errorf("webui module %q requires SDK capability %q major %d, provided %d", binding.ModuleID, requirement.ID, requirement.MajorVersion, provided)
		}
	}
	return nil
}

func projectImplementedRoutes(binding Binding) (Binding, error) {
	projected := cloneBindings([]Binding{binding})[0]
	implementedEntries := map[string]struct{}{}
	implementedRoutes := map[string]struct{}{}
	projected.Routes = nil
	projected.Navigation = nil
	for _, route := range binding.Routes {
		if route.DeliveryState == DeliveryNotImplemented {
			if route.Default || route.UnauthenticatedDefault {
				return Binding{}, fmt.Errorf("webui route %q marked not-implemented cannot be a default route", route.ID)
			}
			continue
		}
		projected.Routes = append(projected.Routes, route)
		implementedRoutes[route.ID] = struct{}{}
		implementedEntries[route.EntryID] = struct{}{}
	}
	projected.Entries = nil
	for _, entry := range binding.Entries {
		if _, ok := implementedEntries[entry.ID]; ok {
			projected.Entries = append(projected.Entries, entry)
		}
	}
	for _, item := range binding.Navigation {
		if _, ok := implementedRoutes[item.RouteID]; ok {
			projected.Navigation = append(projected.Navigation, item)
		}
	}
	return projected, nil
}

func normalizeAvailability(route Route, availability Availability) Availability {
	capabilities := uniqueStrings(availability.Capabilities)
	switch availability.State {
	case AvailabilityAvailable:
		return Availability{State: AvailabilityAvailable, Capabilities: capabilities}
	case AvailabilityDegraded:
		allowed := intersectStrings(route.DegradedCapabilities, capabilities)
		if len(allowed) == 0 {
			return Availability{State: AvailabilityUnavailable}
		}
		return Availability{State: AvailabilityDegraded, Capabilities: allowed}
	default:
		return Availability{State: AvailabilityUnavailable}
	}
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func intersectStrings(left, right []string) []string {
	rightSet := map[string]struct{}{}
	for _, value := range right {
		rightSet[value] = struct{}{}
	}
	result := make([]string, 0)
	for _, value := range uniqueStrings(left) {
		if _, ok := rightSet[value]; ok {
			result = append(result, value)
		}
	}
	return result
}

// ValidateSourcePathOwnership 校验构建期 SourcePath 属于声明模块的 WebUI 目录，且没有经过符号链接逃逸。
func (c Catalog) ValidateSourcePathOwnership(layout projectlayout.Layout, repositoryRoot string) error {
	root, err := filepath.Abs(repositoryRoot)
	if err != nil {
		return fmt.Errorf("resolve webui repository root: %w", err)
	}
	for _, binding := range c.Bindings {
		ownerRoot, err := layout.ModuleWebRoot(root, binding.ModuleID)
		if err != nil {
			return fmt.Errorf("resolve webui module %q owner: %w", binding.ModuleID, err)
		}
		for _, sourcePath := range bindingSourcePaths(binding) {
			if err := validateOwnedSourcePath(ownerRoot, sourcePath); err != nil {
				return fmt.Errorf("webui module %q source path %q: %w", binding.ModuleID, sourcePath, err)
			}
		}
	}
	return nil
}

func bindingSourcePaths(binding Binding) []string {
	paths := make([]string, 0, len(binding.Entries)+len(binding.Locales))
	for _, entry := range binding.Entries {
		paths = append(paths, entry.SourcePath)
	}
	for _, locale := range binding.Locales {
		paths = append(paths, locale.SourcePath)
	}
	return paths
}

func validateOwnedSourcePath(ownerRoot, sourcePath string) error {
	if strings.TrimSpace(sourcePath) == "" || filepath.IsAbs(sourcePath) || strings.Contains(sourcePath, "\\") {
		return fmt.Errorf("path must be module-WebUI-relative and use forward slashes")
	}
	absolute := filepath.Clean(filepath.Join(ownerRoot, filepath.FromSlash(sourcePath)))
	relative, err := filepath.Rel(ownerRoot, absolute)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) || filepath.IsAbs(relative) {
		return fmt.Errorf("path escapes module WebUI owner directory")
	}
	resolvedRoot, err := filepath.EvalSymlinks(ownerRoot)
	if err != nil {
		return fmt.Errorf("resolve module WebUI owner directory: %w", err)
	}
	resolvedPath, err := filepath.EvalSymlinks(absolute)
	if err != nil {
		return fmt.Errorf("resolve source path: %w", err)
	}
	resolvedRelative, err := filepath.Rel(resolvedRoot, resolvedPath)
	if err != nil || resolvedRelative == ".." || strings.HasPrefix(resolvedRelative, ".."+string(filepath.Separator)) || filepath.IsAbs(resolvedRelative) {
		return fmt.Errorf("path resolves outside module WebUI owner directory")
	}
	info, err := os.Stat(absolute)
	if err != nil {
		return fmt.Errorf("stat source path: %w", err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("source path is not a regular file")
	}
	return nil
}

func validateBindings(bindings []Binding) error {
	modules := map[string]struct{}{}
	entries := map[string]string{}
	routes := map[string]RouteOwner{}
	paths := map[string]string{}
	navigation := map[string]string{}
	locales := map[string]string{}
	defaultRouteID := ""
	unauthenticatedDefaultRouteID := ""
	for _, binding := range bindings {
		if strings.TrimSpace(binding.ModuleID) == "" {
			return fmt.Errorf("webui module id is required")
		}
		for _, character := range binding.ModuleID {
			if (character < 'a' || character > 'z') && (character < '0' || character > '9') && character != '-' && character != '_' {
				return fmt.Errorf("webui module id %q contains unsupported character", binding.ModuleID)
			}
		}
		if _, exists := modules[binding.ModuleID]; exists {
			return fmt.Errorf("webui module %q is duplicated", binding.ModuleID)
		}
		modules[binding.ModuleID] = struct{}{}
		if len(binding.Entries) > 0 && len(binding.Locales) == 0 {
			return fmt.Errorf("webui module %q must declare locale binding for its entries", binding.ModuleID)
		}
		for _, entry := range binding.Entries {
			if entry.ID == "" || strings.TrimSpace(entry.SourcePath) == "" {
				return fmt.Errorf("webui module %q entry is incomplete", binding.ModuleID)
			}
			if !validSourcePath(entry.SourcePath, ".tsx", ".ts") {
				return fmt.Errorf("webui entry %q has invalid source path", entry.ID)
			}
			if _, exists := entries[entry.ID]; exists {
				return fmt.Errorf("webui entry %q is duplicated", entry.ID)
			}
			entries[entry.ID] = binding.ModuleID
		}
		for _, route := range binding.Routes {
			if route.ID == "" || route.EntryID == "" || route.TitleMessageID == "" {
				return fmt.Errorf("webui module %q route is incomplete", binding.ModuleID)
			}
			if !validPath(route.Path) {
				return fmt.Errorf("webui route %q has invalid path", route.ID)
			}
			if _, exists := routes[route.ID]; exists {
				return fmt.Errorf("webui route %q is duplicated", route.ID)
			}
			if owner, exists := paths[route.Path]; exists {
				return fmt.Errorf("webui route path %q is shared by %s and %s", route.Path, owner, binding.ModuleID)
			}
			if owner, exists := entries[route.EntryID]; !exists || owner != binding.ModuleID {
				return fmt.Errorf("webui route %q references unknown entry %q", route.ID, route.EntryID)
			}
			if route.Layout != RouteLayoutApp && route.Layout != RouteLayoutBlank {
				return fmt.Errorf("webui route %q has unsupported layout %q", route.ID, route.Layout)
			}
			if route.DeliveryState != DeliveryImplemented && route.DeliveryState != DeliveryNotImplemented {
				return fmt.Errorf("webui route %q has unsupported delivery state %q", route.ID, route.DeliveryState)
			}
			if route.DeliveryState == DeliveryNotImplemented && (route.Default || route.UnauthenticatedDefault) {
				return fmt.Errorf("webui route %q marked not-implemented cannot be a default route", route.ID)
			}
			if route.Default {
				if defaultRouteID != "" {
					return fmt.Errorf("webui routes %q and %q are both default", defaultRouteID, route.ID)
				}
				defaultRouteID = route.ID
			}
			if route.UnauthenticatedDefault {
				if route.Layout != RouteLayoutBlank {
					return fmt.Errorf("webui unauthenticated default route %q must use blank layout", route.ID)
				}
				if route.ViewOperationID != "" {
					return fmt.Errorf("webui unauthenticated default route %q must be public", route.ID)
				}
				if unauthenticatedDefaultRouteID != "" {
					return fmt.Errorf("webui routes %q and %q are both unauthenticated defaults", unauthenticatedDefaultRouteID, route.ID)
				}
				unauthenticatedDefaultRouteID = route.ID
			}
			routes[route.ID] = RouteOwner{ModuleID: binding.ModuleID, Default: route.Default}
			paths[route.Path] = binding.ModuleID
		}
		for _, item := range binding.Navigation {
			if item.ID == "" || item.RouteID == "" || item.TitleMessageID == "" || item.IconID == "" {
				return fmt.Errorf("webui module %q navigation is incomplete", binding.ModuleID)
			}
			if _, exists := navigation[item.ID]; exists {
				return fmt.Errorf("webui navigation %q is duplicated", item.ID)
			}
			owner, exists := routes[item.RouteID]
			if !exists || owner.ModuleID != binding.ModuleID {
				return fmt.Errorf("webui navigation %q references unknown route %q", item.ID, item.RouteID)
			}
			navigation[item.ID] = binding.ModuleID
		}
		for _, item := range binding.Navigation {
			if item.ParentID != "" {
				if owner, exists := navigation[item.ParentID]; !exists || owner != binding.ModuleID {
					return fmt.Errorf("webui navigation %q references unknown parent %q", item.ID, item.ParentID)
				}
			}
		}
		for _, locale := range binding.Locales {
			if locale.Namespace == "" || strings.TrimSpace(locale.SourcePath) == "" {
				return fmt.Errorf("webui module %q locale is incomplete", binding.ModuleID)
			}
			if _, err := language.Parse(locale.Language); err != nil {
				return fmt.Errorf("webui locale %q is invalid: %w", locale.Language, err)
			}
			if !validSourcePath(locale.SourcePath, ".json") {
				return fmt.Errorf("webui locale %q/%q has invalid source path", locale.Language, locale.Namespace)
			}
			localeKey := locale.Language + "\x00" + locale.Namespace
			if owner, exists := locales[localeKey]; exists {
				return fmt.Errorf("webui locale %q/%q is declared by both %s and %s", locale.Language, locale.Namespace, owner, binding.ModuleID)
			}
			locales[localeKey] = binding.ModuleID
		}
		seenRequirements := map[string]struct{}{}
		for _, requirement := range binding.Requires {
			if strings.TrimSpace(requirement.ID) == "" || requirement.MajorVersion == 0 {
				return fmt.Errorf("webui module %q has incomplete SDK requirement", binding.ModuleID)
			}
			if _, exists := seenRequirements[requirement.ID]; exists {
				return fmt.Errorf("webui module %q SDK requirement %q is duplicated", binding.ModuleID, requirement.ID)
			}
			seenRequirements[requirement.ID] = struct{}{}
		}
	}
	return validateNavigationCycles(bindings)
}

// ValidateOperationReferences rejects operation IDs outside the application inventory.
func (c Catalog) ValidateOperationReferences(operations map[string]struct{}) error {
	for _, binding := range c.Bindings {
		for _, route := range binding.Routes {
			if route.ViewOperationID != "" {
				if _, ok := operations[route.ViewOperationID]; !ok {
					return fmt.Errorf("webui route %q references unknown operation %q", route.ID, route.ViewOperationID)
				}
			}
		}
	}
	return nil
}

type RouteOwner struct {
	ModuleID string
	Default  bool
}

func validateNavigationCycles(bindings []Binding) error {
	parents := map[string]string{}
	for _, binding := range bindings {
		for _, item := range binding.Navigation {
			if item.ParentID != "" {
				parents[item.ID] = item.ParentID
			}
		}
	}
	for node := range parents {
		seen := map[string]struct{}{}
		current := node
		for current != "" {
			if _, ok := seen[current]; ok {
				return fmt.Errorf("webui navigation contains a parent cycle at %q", node)
			}
			seen[current] = struct{}{}
			current = parents[current]
		}
	}
	return nil
}

func validPath(path string) bool {
	parsed, err := url.Parse(path)
	return err == nil && strings.HasPrefix(path, "/") && parsed.Host == "" && parsed.RawQuery == "" && parsed.Fragment == "" && path != "/"
}

func validSourcePath(sourcePath string, extensions ...string) bool {
	cleaned := filepath.Clean(sourcePath)
	if filepath.IsAbs(cleaned) || cleaned == "." || cleaned == ".." || strings.HasPrefix(cleaned, ".."+string(filepath.Separator)) {
		return false
	}
	extension := strings.ToLower(filepath.Ext(cleaned))
	for _, allowed := range extensions {
		if extension == allowed {
			return true
		}
	}
	return false
}

func cloneBindings(values []Binding) []Binding {
	result := make([]Binding, len(values))
	copy(result, values)
	for i := range result {
		result[i].Entries = append([]Entry(nil), values[i].Entries...)
		result[i].Routes = append([]Route(nil), values[i].Routes...)
		result[i].Navigation = append([]Navigation(nil), values[i].Navigation...)
		result[i].Locales = append([]Locale(nil), values[i].Locales...)
		result[i].Requires = append([]SDKRequirement(nil), values[i].Requires...)
		for routeIndex := range result[i].Routes {
			result[i].Routes[routeIndex].DegradedCapabilities = append([]string(nil), values[i].Routes[routeIndex].DegradedCapabilities...)
		}
	}
	return result
}
