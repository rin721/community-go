// Package repo 实现 Organization 对项目数据库契约的窄适配。
package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
	"gorm.io/gorm"
)

const (
	departmentTable        = "organization_departments"
	positionTable          = "organization_positions"
	accountDepartmentTable = "organization_account_departments"
	accountPositionTable   = "organization_account_positions"
)

type Access interface {
	Use(context.Context, func(database.Client) error) error
	WithinTx(context.Context, func(context.Context, database.Client, database.Tx) error) error
}

type DepartmentRecord struct {
	ID, Code, Name       string
	ParentID             *string
	Active, Archived     bool
	Version              uint64
	CreatedAt, UpdatedAt time.Time
}
type PositionRecord struct {
	ID, Code, Name       string
	Active, Archived     bool
	Version              uint64
	CreatedAt, UpdatedAt time.Time
}
type AccountDepartmentRecord struct {
	AccountID, DepartmentID string
	Assigned                bool
	UpdatedAt               time.Time
}
type AccountPositionRecord struct {
	AccountID, PositionID string
	Assigned              bool
	UpdatedAt             time.Time
}

type Store struct{ access Access }

func New(access Access) (*Store, error) {
	if access == nil {
		return nil, fmt.Errorf("organization database access is nil")
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
