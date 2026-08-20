// Package admin 定义 Admin WebUI 的项目自有声明与运行时 manifest 契约。
package admin

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"

	"golang.org/x/text/language"
)

// CapabilityState 表示页面是否已接入真实操作。
type CapabilityState string

const (
	StateAvailable CapabilityState = "available"
	StatePreview   CapabilityState = "preview"
)

// Access 表示当前请求对页面查看 operation 的访问结果。
type Access string

const (
	AccessAllowed                Access = "allowed"
	AccessAuthenticationRequired Access = "authentication-required"
	AccessDenied                 Access = "denied"
)

// Binding 是模块拥有的不可变 Admin 声明。SourcePath 只用于构建期生成。
type Binding struct {
	ModuleID   string
	Entries    []Entry
	Routes     []Route
	Navigation []Navigation
	Locales    []Locale
}

// Entry 是一个可延迟加载的页面入口。
type Entry struct {
	ID         string
	SourcePath string
}

// Route 是宿主 Router 使用的稳定页面声明。
type Route struct {
	ID              string
	Path            string
	EntryID         string
	TitleMessageID  string
	ViewOperationID string
	State           CapabilityState
	Default         bool
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

// Manifest 是可安全返回给浏览器的运行时视图，不包含文件系统路径。
type Manifest struct {
	Revision string          `json:"revision"`
	Routes   []ManifestRoute `json:"routes"`
	Menu     []ManifestMenu  `json:"menu"`
}

// ManifestRoute 是剥离构建期字段后的路由。
type ManifestRoute struct {
	ModuleID        string          `json:"moduleId"`
	ID              string          `json:"id"`
	Path            string          `json:"path"`
	EntryID         string          `json:"entryId"`
	TitleMessageID  string          `json:"titleMessageId"`
	ViewOperationID string          `json:"viewOperationId,omitempty"`
	State           CapabilityState `json:"state"`
	Default         bool            `json:"default"`
	Access          Access          `json:"access"`
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
		return Catalog{}, fmt.Errorf("marshal admin catalog: %w", err)
	}
	digest := sha256.Sum256(canonical)
	return Catalog{Bindings: copyBindings, Revision: hex.EncodeToString(digest[:])}, nil
}

// ManifestFor 返回当前主体的安全 manifest；accessLookup 只接收 operation ID。
func (c Catalog) ManifestFor(accessLookup func(string) Access) Manifest {
	if accessLookup == nil {
		accessLookup = func(string) Access { return AccessAuthenticationRequired }
	}
	manifest := Manifest{Revision: c.Revision}
	for _, binding := range c.Bindings {
		for _, route := range binding.Routes {
			access := AccessAllowed
			if route.ViewOperationID != "" {
				access = accessLookup(route.ViewOperationID)
			}
			manifest.Routes = append(manifest.Routes, ManifestRoute{
				ModuleID: binding.ModuleID, ID: route.ID, Path: route.Path, EntryID: route.EntryID,
				TitleMessageID: route.TitleMessageID, ViewOperationID: route.ViewOperationID,
				State: route.State, Default: route.Default, Access: access,
			})
		}
		for _, item := range binding.Navigation {
			manifest.Menu = append(manifest.Menu, ManifestMenu{
				ModuleID: binding.ModuleID, ID: item.ID, ParentID: item.ParentID, RouteID: item.RouteID,
				TitleMessageID: item.TitleMessageID, IconID: item.IconID, Order: item.Order,
			})
		}
	}
	sort.Slice(manifest.Routes, func(i, j int) bool { return manifest.Routes[i].ID < manifest.Routes[j].ID })
	sort.Slice(manifest.Menu, func(i, j int) bool {
		if manifest.Menu[i].Order != manifest.Menu[j].Order {
			return manifest.Menu[i].Order < manifest.Menu[j].Order
		}
		return manifest.Menu[i].ID < manifest.Menu[j].ID
	})
	return manifest
}

func validateBindings(bindings []Binding) error {
	modules := map[string]struct{}{}
	entries := map[string]string{}
	routes := map[string]RouteOwner{}
	paths := map[string]string{}
	navigation := map[string]string{}
	operations := map[string]struct{}{}
	for _, binding := range bindings {
		if strings.TrimSpace(binding.ModuleID) == "" {
			return fmt.Errorf("admin module id is required")
		}
		if _, exists := modules[binding.ModuleID]; exists {
			return fmt.Errorf("admin module %q is duplicated", binding.ModuleID)
		}
		modules[binding.ModuleID] = struct{}{}
		defaultRoutes := 0
		for _, entry := range binding.Entries {
			if entry.ID == "" || strings.TrimSpace(entry.SourcePath) == "" {
				return fmt.Errorf("admin module %q entry is incomplete", binding.ModuleID)
			}
			if _, exists := entries[entry.ID]; exists {
				return fmt.Errorf("admin entry %q is duplicated", entry.ID)
			}
			entries[entry.ID] = binding.ModuleID
		}
		for _, route := range binding.Routes {
			if route.ID == "" || route.EntryID == "" || route.TitleMessageID == "" {
				return fmt.Errorf("admin module %q route is incomplete", binding.ModuleID)
			}
			if !validPath(route.Path) {
				return fmt.Errorf("admin route %q has invalid path", route.ID)
			}
			if _, exists := routes[route.ID]; exists {
				return fmt.Errorf("admin route %q is duplicated", route.ID)
			}
			if owner, exists := paths[route.Path]; exists {
				return fmt.Errorf("admin route path %q is shared by %s and %s", route.Path, owner, binding.ModuleID)
			}
			if owner, exists := entries[route.EntryID]; !exists || owner != binding.ModuleID {
				return fmt.Errorf("admin route %q references unknown entry %q", route.ID, route.EntryID)
			}
			if route.State != StateAvailable && route.State != StatePreview {
				return fmt.Errorf("admin route %q has unsupported state %q", route.ID, route.State)
			}
			if route.ViewOperationID != "" {
				operations[route.ViewOperationID] = struct{}{}
			}
			if route.Default {
				defaultRoutes++
			}
			routes[route.ID] = RouteOwner{ModuleID: binding.ModuleID, Default: route.Default}
			paths[route.Path] = binding.ModuleID
		}
		if defaultRoutes > 1 {
			return fmt.Errorf("admin module %q declares multiple default routes", binding.ModuleID)
		}
		for _, item := range binding.Navigation {
			if item.ID == "" || item.RouteID == "" || item.TitleMessageID == "" || item.IconID == "" {
				return fmt.Errorf("admin module %q navigation is incomplete", binding.ModuleID)
			}
			if _, exists := navigation[item.ID]; exists {
				return fmt.Errorf("admin navigation %q is duplicated", item.ID)
			}
			owner, exists := routes[item.RouteID]
			if !exists || owner.ModuleID != binding.ModuleID {
				return fmt.Errorf("admin navigation %q references unknown route %q", item.ID, item.RouteID)
			}
			navigation[item.ID] = binding.ModuleID
		}
		for _, item := range binding.Navigation {
			if item.ParentID != "" {
				if owner, exists := navigation[item.ParentID]; !exists || owner != binding.ModuleID {
					return fmt.Errorf("admin navigation %q references unknown parent %q", item.ID, item.ParentID)
				}
			}
		}
		for _, locale := range binding.Locales {
			if locale.Namespace == "" || strings.TrimSpace(locale.SourcePath) == "" {
				return fmt.Errorf("admin module %q locale is incomplete", binding.ModuleID)
			}
			if _, err := language.Parse(locale.Language); err != nil {
				return fmt.Errorf("admin locale %q is invalid: %w", locale.Language, err)
			}
		}
	}
	_ = operations // operation inventory is injected by the composition owner.
	for routeID, owner := range routes {
		if owner.Default {
			continue
		}
		_ = routeID
	}
	return validateNavigationCycles(bindings)
}

// ValidateOperationReferences rejects operation IDs outside the application inventory.
func (c Catalog) ValidateOperationReferences(operations map[string]struct{}) error {
	for _, binding := range c.Bindings {
		for _, route := range binding.Routes {
			if route.ViewOperationID != "" {
				if _, ok := operations[route.ViewOperationID]; !ok {
					return fmt.Errorf("admin route %q references unknown operation %q", route.ID, route.ViewOperationID)
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
				return fmt.Errorf("admin navigation contains a parent cycle at %q", node)
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

func cloneBindings(values []Binding) []Binding {
	result := make([]Binding, len(values))
	copy(result, values)
	for i := range result {
		result[i].Entries = append([]Entry(nil), values[i].Entries...)
		result[i].Routes = append([]Route(nil), values[i].Routes...)
		result[i].Navigation = append([]Navigation(nil), values[i].Navigation...)
		result[i].Locales = append([]Locale(nil), values[i].Locales...)
	}
	return result
}
