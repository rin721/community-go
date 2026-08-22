// Package repo 实现 IAM 对项目数据库契约的窄适配。
package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
	"gorm.io/gorm"
)

const (
	accountTable        = "iam_accounts"
	credentialTable     = "iam_local_credentials"
	roleTable           = "iam_roles"
	accountRoleTable    = "iam_account_roles"
	rolePermissionTable = "iam_role_permissions"
	sessionTable        = "iam_sessions"
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

type Store struct{ access Access }

func New(access Access) (*Store, error) {
	if access == nil {
		return nil, fmt.Errorf("iam database access is nil")
	}
	return &Store{access: access}, nil
}

func (store *Store) Use(ctx context.Context, use func(*Unit) error) error {
	return store.access.Use(ctx, func(client database.Client) error {
		return use(&Unit{client: client})
	})
}

func (store *Store) WithinTx(ctx context.Context, use func(context.Context, *Unit) error) error {
	return store.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		return use(txCtx, &Unit{client: client, tx: tx})
	})
}

type Unit struct {
	client database.Client
	tx     database.Tx
}

func (unit *Unit) useDB(ctx context.Context, use func(*gorm.DB) error) error {
	if unit.tx != nil {
		return database.UseGORMTx(ctx, unit.tx, use)
	}
	return database.UseGORM(ctx, unit.client, use)
}
