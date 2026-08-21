// Package repo 实现 Organization 对项目数据库契约的窄适配。
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

type Repositories struct {
	Departments        *database.BaseRepository[DepartmentRecord]
	Positions          *database.BaseRepository[PositionRecord]
	AccountDepartments *database.BaseRepository[AccountDepartmentRecord]
	AccountPositions   *database.BaseRepository[AccountPositionRecord]
}

type Store struct{ access Access }

func New(access Access) (*Store, error) {
	if access == nil {
		return nil, fmt.Errorf("organization database access is nil")
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
	departments, err := database.NewRepository[DepartmentRecord](client, departmentSchema())
	if err != nil {
		return nil, err
	}
	positions, err := database.NewRepository[PositionRecord](client, positionSchema())
	if err != nil {
		return nil, err
	}
	accountDepartments, err := database.NewRepository[AccountDepartmentRecord](client, accountDepartmentSchema())
	if err != nil {
		return nil, err
	}
	accountPositions, err := database.NewRepository[AccountPositionRecord](client, accountPositionSchema())
	if err != nil {
		return nil, err
	}
	if tx != nil {
		departments, err = departments.WithTx(tx)
		if err != nil {
			return nil, err
		}
		positions, err = positions.WithTx(tx)
		if err != nil {
			return nil, err
		}
		accountDepartments, err = accountDepartments.WithTx(tx)
		if err != nil {
			return nil, err
		}
		accountPositions, err = accountPositions.WithTx(tx)
		if err != nil {
			return nil, err
		}
	}
	return &Repositories{Departments: departments, Positions: positions, AccountDepartments: accountDepartments, AccountPositions: accountPositions}, nil
}

func departmentSchema() database.Schema {
	return database.Schema{Table: "organization_departments", VersionField: "Version", Fields: []database.Field{{Name: "ID", Column: "id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Code", Column: "code", Type: database.FieldString, Length: 64}, {Name: "Name", Column: "name", Type: database.FieldString, Length: 128}, {Name: "ParentID", Column: "parent_id", Type: database.FieldString, Length: 36, Nullable: true}, {Name: "Active", Column: "active", Type: database.FieldBool}, {Name: "Archived", Column: "archived", Type: database.FieldBool}, {Name: "Version", Column: "version", Type: database.FieldUint64}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ux_organization_departments_code", Fields: []string{"Code"}, Unique: true}, {Name: "ix_organization_departments_parent", Fields: []string{"ParentID"}}}, References: []database.Reference{{Field: "ParentID", Table: "organization_departments", ReferenceField: "ID", OnDelete: database.ReferenceRestrict}}}
}
func positionSchema() database.Schema {
	return database.Schema{Table: "organization_positions", VersionField: "Version", Fields: []database.Field{{Name: "ID", Column: "id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Code", Column: "code", Type: database.FieldString, Length: 64}, {Name: "Name", Column: "name", Type: database.FieldString, Length: 128}, {Name: "Active", Column: "active", Type: database.FieldBool}, {Name: "Archived", Column: "archived", Type: database.FieldBool}, {Name: "Version", Column: "version", Type: database.FieldUint64}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ux_organization_positions_code", Fields: []string{"Code"}, Unique: true}}}
}
func accountDepartmentSchema() database.Schema {
	return database.Schema{Table: "organization_account_departments", Fields: []database.Field{{Name: "AccountID", Column: "account_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "DepartmentID", Column: "department_id", Type: database.FieldString, Length: 36}, {Name: "Assigned", Column: "assigned", Type: database.FieldBool}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ix_organization_account_departments_department", Fields: []string{"DepartmentID"}}}, References: []database.Reference{{Field: "DepartmentID", Table: "organization_departments", ReferenceField: "ID", OnDelete: database.ReferenceRestrict}}}
}
func accountPositionSchema() database.Schema {
	return database.Schema{Table: "organization_account_positions", Fields: []database.Field{{Name: "AccountID", Column: "account_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "PositionID", Column: "position_id", Type: database.FieldString, PrimaryKey: true, Length: 36}, {Name: "Assigned", Column: "assigned", Type: database.FieldBool}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ix_organization_account_positions_position", Fields: []string{"PositionID"}}}, References: []database.Reference{{Field: "PositionID", Table: "organization_positions", ReferenceField: "ID", OnDelete: database.ReferenceRestrict}}}
}
