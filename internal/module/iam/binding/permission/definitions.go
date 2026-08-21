// Package permission 声明 IAM 自有的稳定权限键。
package permission

import permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
import iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/permission"

const (
	SelfRead          = iampermission.SelfRead
	SelfPasswordWrite = iampermission.SelfPasswordWrite
	AccountRead       = iampermission.AccountRead
	AccountWrite      = iampermission.AccountWrite
	RoleRead          = iampermission.RoleRead
	RoleWrite         = iampermission.RoleWrite
	PermissionRead    = iampermission.PermissionRead
)

func Definitions() []permissioncatalog.Definition {
	return []permissioncatalog.Definition{
		{Key: SelfRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self.read"},
		{Key: SelfPasswordWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self-password.write"},
		{Key: AccountRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.account.read"},
		{Key: AccountWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.account.write"},
		{Key: RoleRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.role.read"},
		{Key: RoleWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.role.write"},
		{Key: PermissionRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.permission.read"},
	}
}
