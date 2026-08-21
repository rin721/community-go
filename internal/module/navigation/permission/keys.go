// Package permission 定义 Navigation 稳定精确权限键。
package permission

import permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"

const (
	MenuRead  permissioncatalog.Key = "navigation:menu:read"
	MenuWrite permissioncatalog.Key = "navigation:menu:write"
)
