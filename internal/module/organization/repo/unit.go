package repo

import (
	"context"
	"errors"
	"time"

	"github.com/rin721/go-scaffold-template/pkg/database"
)

var ErrNotFound = database.ErrNotFound

func IsNotFound(err error) bool  { return errors.Is(err, database.ErrNotFound) }
func IsDuplicate(err error) bool { return errors.Is(err, database.ErrDuplicateKey) }
func IsConflict(err error) bool  { return errors.Is(err, database.ErrOptimisticConflict) }

type DepartmentChanges struct {
	Name             *string
	ParentID         **string
	Active, Archived *bool
	UpdatedAt        time.Time
}
type PositionChanges struct {
	Name             *string
	Active, Archived *bool
	UpdatedAt        time.Time
}
type Unit struct{ repositories *Repositories }

func (u *Unit) CreateDepartment(ctx context.Context, value *DepartmentRecord) error {
	return u.repositories.Departments.Create(ctx, value)
}
func (u *Unit) DepartmentByID(ctx context.Context, id string) (DepartmentRecord, error) {
	return u.repositories.Departments.First(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}}})
}
func (u *Unit) ListDepartments(ctx context.Context, offset, limit int, activeOnly bool) ([]DepartmentRecord, int64, error) {
	filters := []database.Filter{}
	if activeOnly {
		filters = append(filters, database.Filter{Field: "Active", Operator: database.OpEqual, Value: true}, database.Filter{Field: "Archived", Operator: database.OpEqual, Value: false})
	}
	query := database.Query{Filters: filters, Orders: []database.Order{{Field: "Code", Direction: database.OrderAscending}}}
	total, err := u.repositories.Departments.Count(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	query.Page = &database.Page{Offset: offset, Limit: limit}
	items, err := u.repositories.Departments.Find(ctx, query)
	return items, total, err
}
func (u *Unit) AllDepartments(ctx context.Context) ([]DepartmentRecord, error) {
	return u.repositories.Departments.Find(ctx, database.Query{Orders: []database.Order{{Field: "Code", Direction: database.OrderAscending}}})
}
func (u *Unit) UpdateDepartment(ctx context.Context, id string, version uint64, changes DepartmentChanges) error {
	values := database.Changes{"UpdatedAt": changes.UpdatedAt}
	if changes.Name != nil {
		values["Name"] = *changes.Name
	}
	if changes.ParentID != nil {
		values["ParentID"] = *changes.ParentID
	}
	if changes.Active != nil {
		values["Active"] = *changes.Active
	}
	if changes.Archived != nil {
		values["Archived"] = *changes.Archived
	}
	_, err := u.repositories.Departments.Update(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}, {Field: "Version", Operator: database.OpEqual, Value: version}}}, values)
	return err
}
func (u *Unit) CountActiveChildren(ctx context.Context, id string) (int64, error) {
	return u.repositories.Departments.Count(ctx, database.Query{Filters: []database.Filter{{Field: "ParentID", Operator: database.OpEqual, Value: id}, {Field: "Active", Operator: database.OpEqual, Value: true}, {Field: "Archived", Operator: database.OpEqual, Value: false}}})
}
func (u *Unit) CountDepartmentAssignments(ctx context.Context, id string) (int64, error) {
	return u.repositories.AccountDepartments.Count(ctx, database.Query{Filters: []database.Filter{{Field: "DepartmentID", Operator: database.OpEqual, Value: id}, {Field: "Assigned", Operator: database.OpEqual, Value: true}}})
}

func (u *Unit) CreatePosition(ctx context.Context, value *PositionRecord) error {
	return u.repositories.Positions.Create(ctx, value)
}
func (u *Unit) PositionByID(ctx context.Context, id string) (PositionRecord, error) {
	return u.repositories.Positions.First(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}}})
}
func (u *Unit) ListPositions(ctx context.Context, offset, limit int, activeOnly bool) ([]PositionRecord, int64, error) {
	filters := []database.Filter{}
	if activeOnly {
		filters = append(filters, database.Filter{Field: "Active", Operator: database.OpEqual, Value: true}, database.Filter{Field: "Archived", Operator: database.OpEqual, Value: false})
	}
	query := database.Query{Filters: filters, Orders: []database.Order{{Field: "Code", Direction: database.OrderAscending}}}
	total, err := u.repositories.Positions.Count(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	query.Page = &database.Page{Offset: offset, Limit: limit}
	items, err := u.repositories.Positions.Find(ctx, query)
	return items, total, err
}
func (u *Unit) UpdatePosition(ctx context.Context, id string, version uint64, changes PositionChanges) error {
	values := database.Changes{"UpdatedAt": changes.UpdatedAt}
	if changes.Name != nil {
		values["Name"] = *changes.Name
	}
	if changes.Active != nil {
		values["Active"] = *changes.Active
	}
	if changes.Archived != nil {
		values["Archived"] = *changes.Archived
	}
	_, err := u.repositories.Positions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}, {Field: "Version", Operator: database.OpEqual, Value: version}}}, values)
	return err
}
func (u *Unit) CountPositionAssignments(ctx context.Context, id string) (int64, error) {
	return u.repositories.AccountPositions.Count(ctx, database.Query{Filters: []database.Filter{{Field: "PositionID", Operator: database.OpEqual, Value: id}, {Field: "Assigned", Operator: database.OpEqual, Value: true}}})
}

func (u *Unit) AccountDepartment(ctx context.Context, accountID string) (AccountDepartmentRecord, error) {
	return u.repositories.AccountDepartments.First(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}, {Field: "Assigned", Operator: database.OpEqual, Value: true}}})
}
func (u *Unit) ReplaceAccountDepartment(ctx context.Context, accountID string, departmentID *string, now time.Time) error {
	_, err := u.repositories.AccountDepartments.First(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}}})
	if err == nil {
		changes := database.Changes{"Assigned": departmentID != nil, "UpdatedAt": now}
		if departmentID != nil {
			changes["DepartmentID"] = *departmentID
		}
		_, err = u.repositories.AccountDepartments.Update(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}}}, changes)
		return err
	}
	if !IsNotFound(err) || departmentID == nil {
		return nilIfNotFound(err)
	}
	return u.repositories.AccountDepartments.Create(ctx, &AccountDepartmentRecord{AccountID: accountID, DepartmentID: *departmentID, Assigned: true, UpdatedAt: now})
}
func (u *Unit) ListAccountPositions(ctx context.Context, accountID string, assignedOnly bool) ([]AccountPositionRecord, error) {
	filters := []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}}
	if assignedOnly {
		filters = append(filters, database.Filter{Field: "Assigned", Operator: database.OpEqual, Value: true})
	}
	return u.repositories.AccountPositions.Find(ctx, database.Query{Filters: filters, Orders: []database.Order{{Field: "PositionID", Direction: database.OrderAscending}}})
}
func (u *Unit) SetAccountPosition(ctx context.Context, accountID, positionID string, assigned bool, now time.Time) error {
	query := database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}, {Field: "PositionID", Operator: database.OpEqual, Value: positionID}}}
	_, err := u.repositories.AccountPositions.First(ctx, query)
	if IsNotFound(err) && assigned {
		return u.repositories.AccountPositions.Create(ctx, &AccountPositionRecord{AccountID: accountID, PositionID: positionID, Assigned: true, UpdatedAt: now})
	}
	if IsNotFound(err) && !assigned {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = u.repositories.AccountPositions.Update(ctx, query, database.Changes{"Assigned": assigned, "UpdatedAt": now})
	return err
}

func nilIfNotFound(err error) error {
	if IsNotFound(err) {
		return nil
	}
	return err
}
