package repo

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
	"gorm.io/gorm"
)

var ErrNotFound = database.ErrNotFound

func IsNotFound(err error) bool  { return errors.Is(err, database.ErrNotFound) }
func IsDuplicate(err error) bool { return errors.Is(err, database.ErrDuplicateKey) }
func IsConflict(err error) bool  { return errors.Is(err, database.ErrOptimisticConflict) }

type AccountChanges struct {
	Status             *string
	DisplayName        *string
	Archived           *bool
	MustChangePassword *bool
	SecurityRevision   *uint64
	FailedAttempts     *int
	LockedUntil        **time.Time
	UpdatedAt          time.Time
}

func (unit *Unit) CountAccounts(ctx context.Context) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(accountTable).Count(&count).Error })
	return count, err
}

// CountAccountsMatching 统计匹配关键字过滤的账号总数（与 ListAccounts 同过滤语义）。
func (unit *Unit) CountAccountsMatching(ctx context.Context, query string) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		q := db.Table(accountTable)
		if strings.TrimSpace(query) != "" {
			like := "%" + strings.TrimSpace(query) + "%"
			q = q.Where("(username LIKE ? OR display_name LIKE ?)", like, like)
		}
		return q.Count(&count).Error
	})
	return count, err
}

func (unit *Unit) CreateAccount(ctx context.Context, value *AccountRecord) error {
	value.Version = 1
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(accountTable).Create(value).Error })
}

func (unit *Unit) AccountByUsername(ctx context.Context, value string) (AccountRecord, error) {
	var record AccountRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountTable).Where("username = ?", value).First(&record).Error
	})
	return record, err
}

func (unit *Unit) AccountByID(ctx context.Context, value string) (AccountRecord, error) {
	var record AccountRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountTable).Where("id = ?", value).First(&record).Error
	})
	return record, err
}

func (unit *Unit) ListAccounts(ctx context.Context, offset, limit int, query string) ([]AccountRecord, error) {
	var records []AccountRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		q := db.Table(accountTable)
		if strings.TrimSpace(query) != "" {
			like := "%" + strings.TrimSpace(query) + "%"
			q = q.Where("(username LIKE ? OR display_name LIKE ?)", like, like)
		}
		return q.Order("username ASC").Offset(offset).Limit(limit).Find(&records).Error
	})
	return records, err
}

func (unit *Unit) UpdateAccount(ctx context.Context, id string, version uint64, changes AccountChanges) error {
	values := map[string]any{"updated_at": changes.UpdatedAt, "version": gorm.Expr("version + 1")}
	if changes.Status != nil {
		values["status"] = *changes.Status
	}
	if changes.DisplayName != nil {
		values["display_name"] = *changes.DisplayName
	}
	if changes.Archived != nil {
		values["archived"] = *changes.Archived
	}
	if changes.MustChangePassword != nil {
		values["must_change_password"] = *changes.MustChangePassword
	}
	if changes.SecurityRevision != nil {
		values["security_revision"] = *changes.SecurityRevision
	}
	if changes.FailedAttempts != nil {
		values["failed_attempts"] = *changes.FailedAttempts
	}
	if changes.LockedUntil != nil {
		values["locked_until"] = *changes.LockedUntil
	}
	return unit.updateVersioned(ctx, accountTable, "id = ? AND version = ?", []any{id, version}, values)
}

// TouchAccount 只刷新账号 updated_at 并递增版本（乐观并发探针），不改变业务字段。
func (unit *Unit) TouchAccount(ctx context.Context, id string, version uint64, now time.Time) error {
	return unit.updateVersioned(ctx, accountTable, "id = ? AND version = ?", []any{id, version}, map[string]any{"updated_at": now, "version": gorm.Expr("version + 1")})
}

func (unit *Unit) CreateCredential(ctx context.Context, value *CredentialRecord) error {
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(credentialTable).Create(value).Error })
}

func (unit *Unit) CredentialByAccount(ctx context.Context, id string) (CredentialRecord, error) {
	var record CredentialRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(credentialTable).Where("account_id = ?", id).First(&record).Error
	})
	return record, err
}

func (unit *Unit) UpdateCredential(ctx context.Context, id, hash string, now time.Time) error {
	return unit.update(ctx, credentialTable, "account_id = ?", []any{id}, map[string]any{"password_hash": hash, "updated_at": now})
}

func (unit *Unit) CreateRole(ctx context.Context, value *RoleRecord) error {
	value.Version = 1
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(roleTable).Create(value).Error })
}

func (unit *Unit) RoleByID(ctx context.Context, id string) (RoleRecord, error) {
	var record RoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(roleTable).Where("id = ?", id).First(&record).Error
	})
	return record, err
}

func (unit *Unit) OwnerRole(ctx context.Context) (RoleRecord, error) {
	var record RoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(roleTable).Where("code = ?", "owner").First(&record).Error
	})
	return record, err
}

func (unit *Unit) CountRoles(ctx context.Context) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(roleTable).Count(&count).Error })
	return count, err
}

// CountRolesMatching 统计匹配关键字过滤的角色总数（与 ListRoles 同过滤语义）。
func (unit *Unit) CountRolesMatching(ctx context.Context, query string) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		q := db.Table(roleTable)
		if strings.TrimSpace(query) != "" {
			like := "%" + strings.TrimSpace(query) + "%"
			q = q.Where("(code LIKE ? OR name LIKE ?)", like, like)
		}
		return q.Count(&count).Error
	})
	return count, err
}

func (unit *Unit) ListRoles(ctx context.Context, offset, limit int, query string) ([]RoleRecord, error) {
	var records []RoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		q := db.Table(roleTable)
		if strings.TrimSpace(query) != "" {
			like := "%" + strings.TrimSpace(query) + "%"
			q = q.Where("(code LIKE ? OR name LIKE ?)", like, like)
		}
		return q.Order("code ASC").Offset(offset).Limit(limit).Find(&records).Error
	})
	return records, err
}

func (unit *Unit) TouchRole(ctx context.Context, id string, version uint64, now time.Time) error {
	return unit.updateVersioned(ctx, roleTable, "id = ? AND version = ?", []any{id, version}, map[string]any{"updated_at": now, "version": gorm.Expr("version + 1")})
}

// RoleChanges 是角色信息的受控更新字段；nil 字段表示不修改。
type RoleChanges struct {
	Name        *string
	Description *string
	Active      *bool
	Archived    *bool
	UpdatedAt   time.Time
}

// UpdateRoleInfo 按乐观并发版本更新角色展示字段（名称/描述）或生命周期状态。
func (unit *Unit) UpdateRoleInfo(ctx context.Context, id string, version uint64, changes RoleChanges) error {
	values := map[string]any{"updated_at": changes.UpdatedAt, "version": gorm.Expr("version + 1")}
	if changes.Name != nil {
		values["name"] = *changes.Name
	}
	if changes.Description != nil {
		values["description"] = *changes.Description
	}
	if changes.Active != nil {
		values["active"] = *changes.Active
	}
	if changes.Archived != nil {
		values["archived"] = *changes.Archived
	}
	return unit.updateVersioned(ctx, roleTable, "id = ? AND version = ?", []any{id, version}, values)
}

func (unit *Unit) CreateAccountRole(ctx context.Context, value *AccountRoleRecord) error {
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(accountRoleTable).Create(value).Error })
}

func (unit *Unit) ListAccountRolesByAccount(ctx context.Context, id string, activeOnly bool) ([]AccountRoleRecord, error) {
	var records []AccountRoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		query := db.Table(accountRoleTable).Where("account_id = ?", id)
		if activeOnly {
			query = query.Where("active = ?", true)
		}
		return query.Find(&records).Error
	})
	return records, err
}

func (unit *Unit) ListAccountRolesByRole(ctx context.Context, id string) ([]AccountRoleRecord, error) {
	var records []AccountRoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountRoleTable).Where("role_id = ? AND active = ?", id, true).Find(&records).Error
	})
	return records, err
}

func (unit *Unit) HasRole(ctx context.Context, accountID, roleID string) (bool, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountRoleTable).Where("account_id = ? AND role_id = ? AND active = ?", accountID, roleID, true).Count(&count).Error
	})
	return count > 0, err
}

func (unit *Unit) UpdateAccountRole(ctx context.Context, accountID, roleID string, active bool, now time.Time) error {
	return unit.update(ctx, accountRoleTable, "account_id = ? AND role_id = ?", []any{accountID, roleID}, map[string]any{"active": active, "updated_at": now})
}

func (unit *Unit) CreateRolePermission(ctx context.Context, value *RolePermissionRecord) error {
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(rolePermissionTable).Create(value).Error })
}

func (unit *Unit) ListRolePermissions(ctx context.Context, roleID string, activeOnly bool) ([]RolePermissionRecord, error) {
	var records []RolePermissionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		query := db.Table(rolePermissionTable).Where("role_id = ?", roleID)
		if activeOnly {
			query = query.Where("active = ?", true)
		}
		return query.Find(&records).Error
	})
	return records, err
}

func (unit *Unit) ListActiveRolePermissions(ctx context.Context) ([]RolePermissionRecord, error) {
	var records []RolePermissionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(rolePermissionTable).Where("active = ?", true).Find(&records).Error
	})
	return records, err
}

func (unit *Unit) UpdateRolePermission(ctx context.Context, roleID, key string, active bool, now time.Time) error {
	return unit.update(ctx, rolePermissionTable, "role_id = ? AND permission_key = ?", []any{roleID, key}, map[string]any{"active": active, "updated_at": now})
}

func (unit *Unit) CreateSession(ctx context.Context, value *SessionRecord) error {
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(sessionTable).Create(value).Error })
}

func (unit *Unit) SessionByHash(ctx context.Context, hash []byte) (SessionRecord, error) {
	var record SessionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(sessionTable).Where("id_hash = ?", hash).First(&record).Error
	})
	return record, err
}

func (unit *Unit) TouchSession(ctx context.Context, hash, csrf []byte, lastSeen, idle time.Time) error {
	values := map[string]any{}
	if csrf != nil {
		values["csrf_hash"] = csrf
	}
	if !lastSeen.IsZero() {
		values["last_seen_at"] = lastSeen
		values["idle_expires_at"] = idle
	}
	if len(values) == 0 {
		return database.ErrOperationFailed
	}
	return unit.update(ctx, sessionTable, "id_hash = ?", []any{hash}, values)
}

func (unit *Unit) RevokeSession(ctx context.Context, hash []byte, now time.Time) error {
	return unit.update(ctx, sessionTable, "id_hash = ?", []any{hash}, map[string]any{"revoked_at": &now})
}

func (unit *Unit) RevokeAccountSessions(ctx context.Context, accountID string, now time.Time) error {
	return unit.update(ctx, sessionTable, "account_id = ? AND revoked_at IS NULL", []any{accountID}, map[string]any{"revoked_at": &now})
}

// ListSessionsByAccount 返回账号全部受信 Session 的元数据（含已吊销标记），
// 只暴露摘要（IDHash hex）与过期信息，不泄露明文 SessionID。
func (unit *Unit) ListSessionsByAccount(ctx context.Context, accountID string) ([]SessionRecord, error) {
	var records []SessionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(sessionTable).Where("account_id = ?", accountID).Order("created_at DESC, id_hash ASC").Find(&records).Error
	})
	return records, err
}

func (unit *Unit) update(ctx context.Context, table, condition string, arguments []any, values map[string]any) error {
	return unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(table).Where(condition, arguments...).Updates(values).Error
	})
}

func (unit *Unit) updateVersioned(ctx context.Context, table, condition string, arguments []any, values map[string]any) error {
	return unit.useDB(ctx, func(db *gorm.DB) error {
		result := db.Table(table).Where(condition, arguments...).Updates(values)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return database.ErrOptimisticConflict
		}
		return nil
	})
}
