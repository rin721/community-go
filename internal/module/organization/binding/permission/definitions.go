// Package permission 把 Organization 权限贡献给应用 Catalog。
package permission

import (
	orgpermission "github.com/rin721/go-scaffold-template/internal/module/organization/permission"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
)

func Definitions() []permissioncatalog.Definition {
	return []permissioncatalog.Definition{
		{Key: orgpermission.DepartmentRead, OwnerModuleID: "organization", DescriptionMessageID: "permission.organization.department.read"},
		{Key: orgpermission.DepartmentWrite, OwnerModuleID: "organization", DescriptionMessageID: "permission.organization.department.write"},
		{Key: orgpermission.PositionRead, OwnerModuleID: "organization", DescriptionMessageID: "permission.organization.position.read"},
		{Key: orgpermission.PositionWrite, OwnerModuleID: "organization", DescriptionMessageID: "permission.organization.position.write"},
	}
}
