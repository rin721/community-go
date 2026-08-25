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
	Nickname           *string
	Bio                *string
	BirthDate          *string
	Archived           *bool
	MustChangePassword *bool
	SecurityRevision   *uint64
	FailedAttempts     *int
	LockedUntil        **time.Time
	UpdatedAt          time.Time
}

// AccountFilter 是账号列表的 typed 过滤条件；空字段表示不过滤。
type AccountFilter struct {
	// Query 按用户名/显示名关键字模糊匹配（与既有列表语义一致）。
	Query string
	// Status 按账号状态精确过滤（""/active/disabled）。
	Status string
	// Archived 按归档标记过滤（nil=不过滤；false=仅未归档；true=仅已归档）。
	Archived *bool
	// RoleID 非空时只统计/返回拥有该活跃角色的账号。
	RoleID string
}

// accountQuery 构造账号列表/统计的公共过滤条件。
func (unit *Unit) accountQuery(ctx context.Context, db *gorm.DB, filter AccountFilter) *gorm.DB {
	query := db.Table(accountTable)
	if strings.TrimSpace(filter.Query) != "" {
		like := "%" + strings.TrimSpace(filter.Query) + "%"
		query = query.Where("(username LIKE ? OR display_name LIKE ?)", like, like)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Archived != nil {
		query = query.Where("archived = ?", *filter.Archived)
	}
	if strings.TrimSpace(filter.RoleID) != "" {
		query = query.Where("EXISTS (SELECT 1 FROM "+accountRoleTable+" r WHERE r.account_id = "+accountTable+".id AND r.role_id = ? AND r.active = ?)", strings.TrimSpace(filter.RoleID), true)
	}
	return query
}

// CountAccounts 统计满足过滤条件的账号总数（与 ListAccounts 同过滤语义）。
func (unit *Unit) CountAccounts(ctx context.Context, filter AccountFilter) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return unit.accountQuery(ctx, db, filter).Count(&count).Error
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

func (unit *Unit) ListAccounts(ctx context.Context, offset, limit int, filter AccountFilter) ([]AccountRecord, error) {
	var records []AccountRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return unit.accountQuery(ctx, db, filter).Order("username ASC").Offset(offset).Limit(limit).Find(&records).Error
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
	if changes.Nickname != nil {
		values["nickname"] = *changes.Nickname
	}
	if changes.Bio != nil {
		values["bio"] = *changes.Bio
	}
	if changes.BirthDate != nil {
		values["birth_date"] = *changes.BirthDate
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
	return unit.update(ctx, credentialTable, "account_id = ?", []any{id}, map[string]any{"password_hash": hash, "updated_at": now, "password_changed_at": now})
}

// CreatePasswordHistory 记录一条口令哈希到历史（供 historySize 就近复用校验）。
func (unit *Unit) CreatePasswordHistory(ctx context.Context, value *PasswordHistoryRecord) error {
	return unit.useDB(ctx, func(db *gorm.DB) error { return db.Table(passwordHistoryTable).Create(value).Error })
}

// PasswordHistoryHashes 返回账号最近 limit 条口令哈希（按创建时间降序；limit=0 返回空）。
func (unit *Unit) PasswordHistoryHashes(ctx context.Context, accountID string, limit int) ([]string, error) {
	var hashes []string
	if limit <= 0 {
		return hashes, nil
	}
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(passwordHistoryTable).Where("account_id = ?", accountID).Order("created_at DESC").Limit(limit).Pluck("password_hash", &hashes).Error
	})
	return hashes, err
}

// TrimPasswordHistory 只保留账号最近 keep 条口令历史，删除更旧的记录。
func (unit *Unit) TrimPasswordHistory(ctx context.Context, accountID string, keep int) error {
	if keep <= 0 {
		return nil
	}
	return unit.useDB(ctx, func(db *gorm.DB) error {
		recent := db.Table(passwordHistoryTable).Where("account_id = ?", accountID).Order("created_at DESC").Limit(keep).Select("created_at")
		return db.Table(passwordHistoryTable).Where("account_id = ? AND created_at NOT IN (?)", accountID, recent).Delete(nil).Error
	})
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

// CountAccountRolesByRole 统计拥有该角色的活跃分配数（分页 total 用）。
func (unit *Unit) CountAccountRolesByRole(ctx context.Context, roleID string) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountRoleTable).Where("role_id = ? AND active = ?", roleID, true).Count(&count).Error
	})
	return count, err
}

// ListAccountsByRole 返回拥有指定活跃角色的账号（分页、按用户名稳定排序）；
// 供角色影响分析（归档/权限变更前查看持有者）。
func (unit *Unit) ListAccountsByRole(ctx context.Context, roleID string, offset, limit int) ([]AccountRecord, error) {
	var records []AccountRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(accountTable).
			Joins("JOIN " + accountRoleTable + " r ON r.account_id = " + accountTable + ".id").
			Where("r.role_id = ? AND r.active = ?", roleID, true).
			Order(accountTable + ".username ASC").
			Offset(offset).Limit(limit).
			Find(&records).Error
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

// CountRolePermissionsByKey 统计拥有该权限键的活跃角色数（分页 total 用）。
func (unit *Unit) CountRolePermissionsByKey(ctx context.Context, key string) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(rolePermissionTable).Where("permission_key = ? AND active = ?", key, true).Count(&count).Error
	})
	return count, err
}

// ListRolesByPermissionKey 返回拥有指定活跃权限键的角色（分页、按 code 稳定排序）；
// 供权限键影响分析（退役/审计时查看使用方）。
func (unit *Unit) ListRolesByPermissionKey(ctx context.Context, key string, offset, limit int) ([]RoleRecord, error) {
	var records []RoleRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		return db.Table(roleTable).
			Joins("JOIN " + rolePermissionTable + " rp ON rp.role_id = " + roleTable + ".id").
			Where("rp.permission_key = ? AND rp.active = ?", key, true).
			Order(roleTable + ".code ASC").
			Offset(offset).Limit(limit).
			Find(&records).Error
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

// CountSessionsByAccount 统计账号会话数（分页 total 用）。activeOnly 表示
// 只统计未吊销且未过期（按 now）的会话；revokedOnly 表示只统计已吊销会话；
// 两者均为 false 时统计全部会话。
func (unit *Unit) CountSessionsByAccount(ctx context.Context, accountID string, now time.Time, activeOnly, revokedOnly bool) (int64, error) {
	var count int64
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		query := unit.sessionScope(ctx, db, accountID, now, activeOnly, revokedOnly)
		return query.Count(&count).Error
	})
	return count, err
}

// ListSessionsByAccount 返回账号会话的分页元数据（含已吊销标记），只暴露
// 摘要（IDHash hex）与过期信息，不泄露明文 SessionID。过滤语义与
// CountSessionsByAccount 一致，保证 total 与列表不漂移。
func (unit *Unit) ListSessionsByAccount(ctx context.Context, accountID string, now time.Time, activeOnly, revokedOnly bool, offset, limit int) ([]SessionRecord, error) {
	var records []SessionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		query := unit.sessionScope(ctx, db, accountID, now, activeOnly, revokedOnly)
		return query.Order("created_at DESC, id_hash ASC").Offset(offset).Limit(limit).Find(&records).Error
	})
	return records, err
}

// sessionScope 构造账号会话查询的公共过滤条件。
func (unit *Unit) sessionScope(ctx context.Context, db *gorm.DB, accountID string, now time.Time, activeOnly, revokedOnly bool) *gorm.DB {
	query := db.Table(sessionTable).Where("account_id = ?", accountID)
	if activeOnly {
		query = query.Where("revoked_at IS NULL AND idle_expires_at > ? AND absolute_expires_at > ?", now, now)
	}
	if revokedOnly {
		query = query.Where("revoked_at IS NOT NULL")
	}
	return query
}

// FindOldestActiveSession 返回账号按创建时间最早的 active 会话（077 会话上限
// 超限时用于「主动剔最旧」）；无匹配返回 ErrNotFound。
func (unit *Unit) FindOldestActiveSession(ctx context.Context, accountID string, now time.Time) (SessionRecord, error) {
	var record SessionRecord
	err := unit.useDB(ctx, func(db *gorm.DB) error {
		query := unit.sessionScope(ctx, db, accountID, now, true, false)
		return query.Order("created_at ASC, id_hash ASC").First(&record).Error
	})
	return record, err
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
