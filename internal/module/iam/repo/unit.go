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

type AccountChanges struct {
	Status             *string
	MustChangePassword *bool
	SecurityRevision   *uint64
	FailedAttempts     *int
	LockedUntil        **time.Time
	UpdatedAt          time.Time
}
type Unit struct{ repositories *Repositories }

func (u *Unit) CountAccounts(ctx context.Context) (int64, error) {
	return u.repositories.Accounts.Count(ctx, database.Query{})
}
func (u *Unit) CreateAccount(ctx context.Context, value *AccountRecord) error {
	return u.repositories.Accounts.Create(ctx, value)
}
func (u *Unit) AccountByUsername(ctx context.Context, value string) (AccountRecord, error) {
	return u.repositories.Accounts.First(ctx, database.Query{Filters: []database.Filter{{Field: "Username", Operator: database.OpEqual, Value: value}}})
}
func (u *Unit) AccountByID(ctx context.Context, value string) (AccountRecord, error) {
	return u.repositories.Accounts.First(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: value}}})
}
func (u *Unit) ListAccounts(ctx context.Context, offset, limit int) ([]AccountRecord, error) {
	return u.repositories.Accounts.Find(ctx, database.Query{Orders: []database.Order{{Field: "Username", Direction: database.OrderAscending}}, Page: &database.Page{Offset: offset, Limit: limit}})
}
func (u *Unit) UpdateAccount(ctx context.Context, id string, version uint64, changes AccountChanges) error {
	values := database.Changes{"UpdatedAt": changes.UpdatedAt}
	if changes.Status != nil {
		values["Status"] = *changes.Status
	}
	if changes.MustChangePassword != nil {
		values["MustChangePassword"] = *changes.MustChangePassword
	}
	if changes.SecurityRevision != nil {
		values["SecurityRevision"] = *changes.SecurityRevision
	}
	if changes.FailedAttempts != nil {
		values["FailedAttempts"] = *changes.FailedAttempts
	}
	if changes.LockedUntil != nil {
		values["LockedUntil"] = *changes.LockedUntil
	}
	_, err := u.repositories.Accounts.Update(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}, {Field: "Version", Operator: database.OpEqual, Value: version}}}, values)
	return err
}
func (u *Unit) CreateCredential(ctx context.Context, value *CredentialRecord) error {
	return u.repositories.Credentials.Create(ctx, value)
}
func (u *Unit) CredentialByAccount(ctx context.Context, id string) (CredentialRecord, error) {
	return u.repositories.Credentials.First(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: id}}})
}
func (u *Unit) UpdateCredential(ctx context.Context, id, hash string, now time.Time) error {
	_, err := u.repositories.Credentials.Update(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: id}}}, database.Changes{"PasswordHash": hash, "UpdatedAt": now})
	return err
}
func (u *Unit) CreateRole(ctx context.Context, value *RoleRecord) error {
	return u.repositories.Roles.Create(ctx, value)
}
func (u *Unit) RoleByID(ctx context.Context, id string) (RoleRecord, error) {
	return u.repositories.Roles.First(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}}})
}
func (u *Unit) OwnerRole(ctx context.Context) (RoleRecord, error) {
	return u.repositories.Roles.First(ctx, database.Query{Filters: []database.Filter{{Field: "Code", Operator: database.OpEqual, Value: "owner"}}})
}
func (u *Unit) CountRoles(ctx context.Context) (int64, error) {
	return u.repositories.Roles.Count(ctx, database.Query{})
}
func (u *Unit) ListRoles(ctx context.Context, offset, limit int) ([]RoleRecord, error) {
	return u.repositories.Roles.Find(ctx, database.Query{Orders: []database.Order{{Field: "Code", Direction: database.OrderAscending}}, Page: &database.Page{Offset: offset, Limit: limit}})
}
func (u *Unit) TouchRole(ctx context.Context, id string, version uint64, now time.Time) error {
	_, err := u.repositories.Roles.Update(ctx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: id}, {Field: "Version", Operator: database.OpEqual, Value: version}}}, database.Changes{"UpdatedAt": now})
	return err
}
func (u *Unit) CreateAccountRole(ctx context.Context, value *AccountRoleRecord) error {
	return u.repositories.AccountRoles.Create(ctx, value)
}
func (u *Unit) ListAccountRolesByAccount(ctx context.Context, id string, activeOnly bool) ([]AccountRoleRecord, error) {
	filters := []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: id}}
	if activeOnly {
		filters = append(filters, database.Filter{Field: "Active", Operator: database.OpEqual, Value: true})
	}
	return u.repositories.AccountRoles.Find(ctx, database.Query{Filters: filters})
}
func (u *Unit) ListAccountRolesByRole(ctx context.Context, id string) ([]AccountRoleRecord, error) {
	return u.repositories.AccountRoles.Find(ctx, database.Query{Filters: []database.Filter{{Field: "RoleID", Operator: database.OpEqual, Value: id}, {Field: "Active", Operator: database.OpEqual, Value: true}}})
}
func (u *Unit) HasRole(ctx context.Context, accountID, roleID string) (bool, error) {
	count, err := u.repositories.AccountRoles.Count(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}, {Field: "RoleID", Operator: database.OpEqual, Value: roleID}, {Field: "Active", Operator: database.OpEqual, Value: true}}})
	return count > 0, err
}
func (u *Unit) UpdateAccountRole(ctx context.Context, accountID, roleID string, active bool, now time.Time) error {
	_, err := u.repositories.AccountRoles.Update(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}, {Field: "RoleID", Operator: database.OpEqual, Value: roleID}}}, database.Changes{"Active": active, "UpdatedAt": now})
	return err
}
func (u *Unit) CreateRolePermission(ctx context.Context, value *RolePermissionRecord) error {
	return u.repositories.RolePermissions.Create(ctx, value)
}
func (u *Unit) ListRolePermissions(ctx context.Context, roleID string, activeOnly bool) ([]RolePermissionRecord, error) {
	filters := []database.Filter{{Field: "RoleID", Operator: database.OpEqual, Value: roleID}}
	if activeOnly {
		filters = append(filters, database.Filter{Field: "Active", Operator: database.OpEqual, Value: true})
	}
	return u.repositories.RolePermissions.Find(ctx, database.Query{Filters: filters})
}
func (u *Unit) ListActiveRolePermissions(ctx context.Context) ([]RolePermissionRecord, error) {
	return u.repositories.RolePermissions.Find(ctx, database.Query{Filters: []database.Filter{{Field: "Active", Operator: database.OpEqual, Value: true}}})
}
func (u *Unit) UpdateRolePermission(ctx context.Context, roleID, key string, active bool, now time.Time) error {
	_, err := u.repositories.RolePermissions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "RoleID", Operator: database.OpEqual, Value: roleID}, {Field: "PermissionKey", Operator: database.OpEqual, Value: key}}}, database.Changes{"Active": active, "UpdatedAt": now})
	return err
}
func (u *Unit) CreateSession(ctx context.Context, value *SessionRecord) error {
	return u.repositories.Sessions.Create(ctx, value)
}
func (u *Unit) SessionByHash(ctx context.Context, hash []byte) (SessionRecord, error) {
	return u.repositories.Sessions.First(ctx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}})
}
func (u *Unit) TouchSession(ctx context.Context, hash, csrf []byte, lastSeen, idle time.Time) error {
	changes := database.Changes{}
	if csrf != nil {
		changes["CSRFHash"] = csrf
	}
	if !lastSeen.IsZero() {
		changes["LastSeenAt"] = lastSeen
		changes["IdleExpiresAt"] = idle
	}
	_, err := u.repositories.Sessions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}}, changes)
	return err
}
func (u *Unit) RevokeSession(ctx context.Context, hash []byte, now time.Time) error {
	_, err := u.repositories.Sessions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}}, database.Changes{"RevokedAt": &now})
	return err
}
func (u *Unit) RevokeAccountSessions(ctx context.Context, accountID string, now time.Time) error {
	_, err := u.repositories.Sessions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "AccountID", Operator: database.OpEqual, Value: accountID}, {Field: "RevokedAt", Operator: database.OpIsNull}}}, database.Changes{"RevokedAt": &now})
	if errors.Is(err, database.ErrNotFound) {
		return nil
	}
	return err
}
