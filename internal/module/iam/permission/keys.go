// Package permission 定义 IAM 业务规则使用的稳定精确权限键。
package permission

import permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"

const (
	SelfRead          permissioncatalog.Key = "iam:account:self:read"
	SelfPasswordWrite permissioncatalog.Key = "iam:account:self:password:write"
	AccountRead       permissioncatalog.Key = "iam:account:read"
	AccountWrite      permissioncatalog.Key = "iam:account:write"
	RoleRead          permissioncatalog.Key = "iam:role:read"
	RoleWrite         permissioncatalog.Key = "iam:role:write"
	PermissionRead    permissioncatalog.Key = "iam:permission:read"
)
