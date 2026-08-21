// Package repo 实现 IAM 对项目数据库契约的窄适配。
package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
)

type Access interface {
	Use(context.Context, func(database.Client) error) error
	WithinTx(context.Context, func(context.Context, database.Client, database.Tx) error) error
}

type AccountRecord struct {
	ID, Username, DisplayName, Status string
	MustChangePassword                bool
	SecurityRevision                  uint64
	FailedAttempts                    int
	LockedUntil                       *time.Time
	Version                           uint64
	CreatedAt, UpdatedAt              time.Time
}
type CredentialRecord struct {
	AccountID, PasswordHash string
	UpdatedAt               time.Time
}
type RoleRecord struct {
	ID, Code, Name, Description string
	Active, Archived, System    bool
	Version                     uint64
	CreatedAt, UpdatedAt        time.Time
}
type AccountRoleRecord struct {
	AccountID, RoleID string
	Active            bool
	UpdatedAt         time.Time
}
type RolePermissionRecord struct {
	RoleID, PermissionKey string
	Active                bool
	UpdatedAt             time.Time
}
type SessionRecord struct {
	IDHash                                                  []byte
	AccountID                                               string
	CSRFHash                                                []byte
	SecurityRevision                                        uint64
	CreatedAt, LastSeenAt, IdleExpiresAt, AbsoluteExpiresAt time.Time
	RevokedAt                                               *time.Time
}

type Repositories struct {
	Accounts        *database.BaseRepository[AccountRecord]
	Credentials     *database.BaseRepository[CredentialRecord]
	Roles           *database.BaseRepository[RoleRecord]
	AccountRoles    *database.BaseRepository[AccountRoleRecord]
	RolePermissions *database.BaseRepository[RolePermissionRecord]
	Sessions        *database.BaseRepository[SessionRecord]
}

type Store struct{ access Access }

func New(access Access) (*Store, error) {
	if access == nil {
		return nil, fmt.Errorf("iam database access is nil")
	}
	return &Store{access: access}, nil
}
func (s *Store) Use(ctx context.Context, use func(*Unit) error) error {
	return s.access.Use(ctx, func(client database.Client) error {
		repositories, err := repositories(client, nil)
		if err != nil {
			return err
		}
		return use(&Unit{repositories: repositories})
	})
}
func (s *Store) WithinTx(ctx context.Context, use func(context.Context, *Unit) error) error {
	return s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		repositories, err := repositories(client, tx)
		if err != nil {
			return err
		}
		return use(txCtx, &Unit{repositories: repositories})
	})
}

func repositories(client database.Client, tx database.Tx) (*Repositories, error) {
	accounts, err := database.NewRepository[AccountRecord](client, accountSchema())
	if err != nil {
		return nil, err
	}
	credentials, err := database.NewRepository[CredentialRecord](client, credentialSchema())
	if err != nil {
		return nil, err
	}
	roles, err := database.NewRepository[RoleRecord](client, roleSchema())
	if err != nil {
		return nil, err
	}
	accountRoles, err := database.NewRepository[AccountRoleRecord](client, accountRoleSchema())
	if err != nil {
		return nil, err
	}
	rolePermissions, err := database.NewRepository[RolePermissionRecord](client, rolePermissionSchema())
	if err != nil {
		return nil, err
	}
	sessions, err := database.NewRepository[SessionRecord](client, sessionSchema())
	if err != nil {
		return nil, err
	}
	if tx != nil {
		accounts, err = accounts.WithTx(tx)
		if err != nil {
			return nil, err
		}
		credentials, err = credentials.WithTx(tx)
		if err != nil {
			return nil, err
		}
		roles, err = roles.WithTx(tx)
		if err != nil {
			return nil, err
		}
		accountRoles, err = accountRoles.WithTx(tx)
		if err != nil {
			return nil, err
		}
		rolePermissions, err = rolePermissions.WithTx(tx)
		if err != nil {
			return nil, err
		}
		sessions, err = sessions.WithTx(tx)
		if err != nil {
			return nil, err
		}
	}
	return &Repositories{accounts, credentials, roles, accountRoles, rolePermissions, sessions}, nil
}

func accountSchema() database.Schema {
	return database.Schema{Table: "iam_accounts", VersionField: "Version", Fields: []database.Field{{Name: "ID", Column: "id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Username", Column: "username", Type: database.FieldString, Length: 64}, {Name: "DisplayName", Column: "display_name", Type: database.FieldString, Length: 128}, {Name: "Status", Column: "status", Type: database.FieldString, Length: 16}, {Name: "MustChangePassword", Column: "must_change_password", Type: database.FieldBool}, {Name: "SecurityRevision", Column: "security_revision", Type: database.FieldUint64}, {Name: "FailedAttempts", Column: "failed_attempts", Type: database.FieldInt}, {Name: "LockedUntil", Column: "locked_until", Type: database.FieldTime, Nullable: true}, {Name: "Version", Column: "version", Type: database.FieldUint64}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ux_iam_accounts_username", Fields: []string{"Username"}, Unique: true}}}
}
func credentialSchema() database.Schema {
	return database.Schema{Table: "iam_local_credentials", Fields: []database.Field{{Name: "AccountID", Column: "account_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "PasswordHash", Column: "password_hash", Type: database.FieldString}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, References: []database.Reference{{Field: "AccountID", Table: "iam_accounts", ReferenceField: "ID", OnDelete: database.ReferenceCascade}}}
}
func roleSchema() database.Schema {
	return database.Schema{Table: "iam_roles", VersionField: "Version", Fields: []database.Field{{Name: "ID", Column: "id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Code", Column: "code", Type: database.FieldString, Length: 64}, {Name: "Name", Column: "name", Type: database.FieldString, Length: 128}, {Name: "Description", Column: "description", Type: database.FieldString}, {Name: "Active", Column: "active", Type: database.FieldBool}, {Name: "Archived", Column: "archived", Type: database.FieldBool}, {Name: "System", Column: "system", Type: database.FieldBool}, {Name: "Version", Column: "version", Type: database.FieldUint64}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ux_iam_roles_code", Fields: []string{"Code"}, Unique: true}}}
}
func accountRoleSchema() database.Schema {
	return database.Schema{Table: "iam_account_roles", Fields: []database.Field{{Name: "AccountID", Column: "account_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "RoleID", Column: "role_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Active", Column: "active", Type: database.FieldBool}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, References: []database.Reference{{Field: "AccountID", Table: "iam_accounts", ReferenceField: "ID", OnDelete: database.ReferenceCascade}, {Field: "RoleID", Table: "iam_roles", ReferenceField: "ID", OnDelete: database.ReferenceCascade}}}
}
func rolePermissionSchema() database.Schema {
	return database.Schema{Table: "iam_role_permissions", Fields: []database.Field{{Name: "RoleID", Column: "role_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "PermissionKey", Column: "permission_key", Type: database.FieldString, PrimaryKey: true, Length: 160}, {Name: "Active", Column: "active", Type: database.FieldBool}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, References: []database.Reference{{Field: "RoleID", Table: "iam_roles", ReferenceField: "ID", OnDelete: database.ReferenceCascade}}}
}
func sessionSchema() database.Schema {
	return database.Schema{Table: "iam_sessions", Fields: []database.Field{{Name: "IDHash", Column: "id_hash", Type: database.FieldBytes, PrimaryKey: true}, {Name: "AccountID", Column: "account_id", Type: database.FieldString, Length: 36}, {Name: "CSRFHash", Column: "csrf_hash", Type: database.FieldBytes}, {Name: "SecurityRevision", Column: "security_revision", Type: database.FieldUint64}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "LastSeenAt", Column: "last_seen_at", Type: database.FieldTime}, {Name: "IdleExpiresAt", Column: "idle_expires_at", Type: database.FieldTime}, {Name: "AbsoluteExpiresAt", Column: "absolute_expires_at", Type: database.FieldTime}, {Name: "RevokedAt", Column: "revoked_at", Type: database.FieldTime, Nullable: true}}, Indexes: []database.Index{{Name: "ix_iam_sessions_account", Fields: []string{"AccountID"}}}, References: []database.Reference{{Field: "AccountID", Table: "iam_accounts", ReferenceField: "ID", OnDelete: database.ReferenceCascade}}}
}
