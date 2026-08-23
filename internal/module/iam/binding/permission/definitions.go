// Package permission 声明 IAM 自有的稳定权限键。
package permission

import permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
import iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/permission"

const (
	SelfRead          = iampermission.SelfRead
	SelfPasswordWrite = iampermission.SelfPasswordWrite
	SelfProfileWrite  = iampermission.SelfProfileWrite
	SelfArchive       = iampermission.SelfArchive
	AccountRead       = iampermission.AccountRead
	AccountWrite      = iampermission.AccountWrite
	RoleRead          = iampermission.RoleRead
	RoleWrite         = iampermission.RoleWrite
	PermissionRead    = iampermission.PermissionRead
	SessionRead       = iampermission.SessionRead
	SessionRevoke     = iampermission.SessionRevoke
)

func Definitions() []permissioncatalog.Definition {
	return []permissioncatalog.Definition{
		{Key: SelfRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self.read"},
		{Key: SelfPasswordWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self-password.write"},
		{Key: SelfProfileWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self-profile.write"},
		{Key: SelfArchive, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.self-archive"},
		{Key: AccountRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.account.read"},
		{Key: AccountWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.account.write"},
		{Key: RoleRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.role.read"},
		{Key: RoleWrite, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.role.write"},
		{Key: PermissionRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.permission.read"},
		{Key: SessionRead, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.session.read"},
		{Key: SessionRevoke, OwnerModuleID: "iam", DescriptionMessageID: "permission.iam.session.revoke"},
	}
}
