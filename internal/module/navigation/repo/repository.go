// Package repo 实现 Navigation 对项目数据库契约的窄适配。
package repo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
)

type Access interface {
	Use(context.Context, func(database.Client) error) error
	WithinTx(context.Context, func(context.Context, database.Client, database.Tx) error) error
}

type PolicyRecord struct {
	NavigationID    string
	Enabled         bool
	ParentOverride  *string
	OrderOverride   *int
	CatalogRevision string
	Version         uint64
	UpdatedAt       time.Time
}

type Store struct{ access Access }
type Unit struct {
	policies *database.BaseRepository[PolicyRecord]
}

func New(access Access) (*Store, error) {
	if access == nil {
		return nil, fmt.Errorf("navigation database access is nil")
	}
	return &Store{access: access}, nil
}
func (store *Store) Use(ctx context.Context, use func(*Unit) error) error {
	return store.access.Use(ctx, func(client database.Client) error {
		unit, err := newUnit(client, nil)
		if err != nil {
			return err
		}
		return use(unit)
	})
}
func (store *Store) WithinTx(ctx context.Context, use func(context.Context, *Unit) error) error {
	return store.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		unit, err := newUnit(client, tx)
		if err != nil {
			return err
		}
		return use(txCtx, unit)
	})
}

func newUnit(client database.Client, tx database.Tx) (*Unit, error) {
	repository, err := database.NewRepository[PolicyRecord](client, schema())
	if err != nil {
		return nil, err
	}
	if tx != nil {
		repository, err = repository.WithTx(tx)
		if err != nil {
			return nil, err
		}
	}
	return &Unit{policies: repository}, nil
}
func schema() database.Schema {
	return database.Schema{Table: "navigation_menu_policies", VersionField: "Version", Fields: []database.Field{{Name: "NavigationID", Column: "navigation_id", Type: database.FieldString, PrimaryKey: true, Length: 128}, {Name: "Enabled", Column: "enabled", Type: database.FieldBool}, {Name: "ParentOverride", Column: "parent_override", Type: database.FieldString, Length: 128, Nullable: true}, {Name: "OrderOverride", Column: "order_override", Type: database.FieldInt, Nullable: true}, {Name: "CatalogRevision", Column: "catalog_revision", Type: database.FieldString, Length: 64}, {Name: "Version", Column: "version", Type: database.FieldUint64}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}}
}
func (unit *Unit) List(ctx context.Context) ([]PolicyRecord, error) {
	return unit.policies.Find(ctx, database.Query{Orders: []database.Order{{Field: "NavigationID", Direction: database.OrderAscending}}})
}
func (unit *Unit) ByID(ctx context.Context, id string) (PolicyRecord, error) {
	return unit.policies.First(ctx, database.Query{Filters: []database.Filter{{Field: "NavigationID", Operator: database.OpEqual, Value: id}}})
}
func (unit *Unit) Create(ctx context.Context, record *PolicyRecord) error {
	return unit.policies.Create(ctx, record)
}
func (unit *Unit) Update(ctx context.Context, record PolicyRecord, version uint64) error {
	_, err := unit.policies.Update(ctx, database.Query{Filters: []database.Filter{{Field: "NavigationID", Operator: database.OpEqual, Value: record.NavigationID}, {Field: "Version", Operator: database.OpEqual, Value: version}}}, database.Changes{"Enabled": record.Enabled, "ParentOverride": record.ParentOverride, "OrderOverride": record.OrderOverride, "CatalogRevision": record.CatalogRevision, "UpdatedAt": record.UpdatedAt})
	return err
}
func IsNotFound(err error) bool { return errors.Is(err, database.ErrNotFound) }
func IsConflict(err error) bool { return errors.Is(err, database.ErrOptimisticConflict) }
