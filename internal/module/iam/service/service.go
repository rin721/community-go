// Package service 实现 IAM 的账号、凭据、会话与 Core RBAC 用例。
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/permission"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
)

const SessionCookieName = "__Host-community-go_iam_session"

const (
	defaultListLimit = 20
	maxListLimit     = 100
)

var (
	ErrSetupClosed        = errors.New("iam setup is closed")
	ErrInvalidCredentials = errors.New("iam credentials are invalid")
	ErrAccountLocked      = errors.New("iam account is locked")
	ErrAccountDisabled    = errors.New("iam account is disabled")
	ErrSessionInvalid     = errors.New("iam session is invalid")
	ErrUnknownPermission  = errors.New("iam permission is not in catalog")
	ErrImmutableOwner     = errors.New("iam owner role is immutable")
	ErrIncompatibleState  = errors.New("iam persistent state is incompatible with permission catalog")
)

type PasswordHasher interface {
	Hash(string) (string, error)
	Compare(string, string) bool
}
type Config struct {
	SetupToken                   string
	IdleTimeout, AbsoluteTimeout time.Duration
	MaxFailedAttempts            int
	LockDuration                 time.Duration
}
type Session struct {
	ID, CSRFToken                                           string
	Identity                                                model.SessionIdentity
	CreatedAt, LastSeenAt, IdleExpiresAt, AbsoluteExpiresAt time.Time
}
type AccountList struct {
	Items         []model.Account
	Offset, Limit int
	Total         int64
}
type RoleList struct {
	Items         []model.Role
	Offset, Limit int
	Total         int64
}

type resolvedSession struct {
	ID      string
	Session Session
}
type resolvedSessionKey struct{}

func WithResolvedSession(request *http.Request, id string, session Session) *http.Request {
	return request.WithContext(context.WithValue(request.Context(), resolvedSessionKey{}, resolvedSession{ID: id, Session: session}))
}
func SessionFromContext(ctx context.Context) (string, Session, bool) {
	value, ok := ctx.Value(resolvedSessionKey{}).(resolvedSession)
	return value.ID, value.Session, ok && value.ID != ""
}

type Service struct {
	store     *repo.Store
	clock     clock.Clock
	ids       idgen.Generator
	passwords PasswordHasher
	config    Config
	catalog   permissioncatalog.Catalog
	dummyHash string
}

func New(store *repo.Store, currentClock clock.Clock, ids idgen.Generator, passwords PasswordHasher, config Config, catalog permissioncatalog.Catalog) (*Service, error) {
	if store == nil || currentClock == nil || ids == nil || passwords == nil {
		return nil, fmt.Errorf("iam service dependencies are incomplete")
	}
	if config.IdleTimeout <= 0 || config.AbsoluteTimeout <= config.IdleTimeout || config.MaxFailedAttempts <= 0 || config.LockDuration <= 0 {
		return nil, fmt.Errorf("iam service security budgets are invalid")
	}
	dummy, err := passwords.Hash("fixed-cost-dummy-password")
	if err != nil {
		return nil, fmt.Errorf("create iam fixed-cost verifier: %w", err)
	}
	return &Service{store: store, clock: currentClock, ids: ids, passwords: passwords, config: config, catalog: catalog, dummyHash: dummy}, nil
}

func (s *Service) Setup(ctx context.Context, setupToken, username, displayName, password string) (Session, error) {
	if strings.TrimSpace(s.config.SetupToken) == "" || subtle.ConstantTimeCompare([]byte(setupToken), []byte(s.config.SetupToken)) != 1 {
		return Session{}, ErrInvalidCredentials
	}
	if err := model.ValidatePassword(password); err != nil {
		return Session{}, err
	}
	hash, err := s.passwords.Hash(password)
	if err != nil {
		return Session{}, fmt.Errorf("hash setup credential: %w", err)
	}
	accountID, err := s.ids.New()
	if err != nil {
		return Session{}, err
	}
	roleID, err := s.ids.New()
	if err != nil {
		return Session{}, err
	}
	now := s.clock.Now().UTC()
	account, err := model.NewAccount(accountID, username, displayName, false, now)
	if err != nil {
		return Session{}, err
	}
	owner, err := model.NewRole(roleID, model.OwnerRoleCode, "系统所有者", "系统内置且不可移除的所有者角色", true, now)
	if err != nil {
		return Session{}, err
	}
	var result Session
	err = s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		count, err := r.CountAccounts(txCtx)
		if err != nil {
			return err
		}
		if count != 0 {
			return ErrSetupClosed
		}
		ar := accountRecord(account)
		if err := r.CreateAccount(txCtx, &ar); err != nil {
			return mapSetupConflict(err)
		}
		credential := repo.CredentialRecord{AccountID: account.ID, PasswordHash: hash, UpdatedAt: now}
		if err := r.CreateCredential(txCtx, &credential); err != nil {
			return err
		}
		rr := roleRecord(owner)
		if err := r.CreateRole(txCtx, &rr); err != nil {
			return err
		}
		assignment := repo.AccountRoleRecord{AccountID: account.ID, RoleID: owner.ID, Active: true, UpdatedAt: now}
		if err := r.CreateAccountRole(txCtx, &assignment); err != nil {
			return err
		}
		for _, definition := range s.catalog.Definitions() {
			item := repo.RolePermissionRecord{RoleID: owner.ID, PermissionKey: string(definition.Key), Active: true, UpdatedAt: now}
			if err := r.CreateRolePermission(txCtx, &item); err != nil {
				return err
			}
		}
		result, err = s.createSession(txCtx, r, account, allCatalogKeys(s.catalog))
		return err
	})
	if repo.IsDuplicate(err) {
		return Session{}, ErrSetupClosed
	}
	return result, err
}

func (s *Service) Login(ctx context.Context, username, password string) (Session, error) {
	username, err := model.NormalizeUsername(username)
	if err != nil {
		_ = s.passwords.Compare(s.dummyHash, password)
		return Session{}, ErrInvalidCredentials
	}
	var result Session
	var outcome error
	err = s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, findErr := r.AccountByUsername(txCtx, username)
		if findErr != nil {
			_ = s.passwords.Compare(s.dummyHash, password)
			return ErrInvalidCredentials
		}
		credential, findErr := r.CredentialByAccount(txCtx, account.ID)
		if findErr != nil {
			_ = s.passwords.Compare(s.dummyHash, password)
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if account.Status != string(model.AccountActive) {
			_ = s.passwords.Compare(credential.PasswordHash, password)
			return ErrAccountDisabled
		}
		if account.LockedUntil != nil && now.Before(*account.LockedUntil) {
			_ = s.passwords.Compare(credential.PasswordHash, password)
			return ErrAccountLocked
		}
		if !s.passwords.Compare(credential.PasswordHash, password) {
			attempts := account.FailedAttempts + 1
			var locked *time.Time
			if attempts >= s.config.MaxFailedAttempts {
				value := now.Add(s.config.LockDuration)
				locked = &value
				attempts = 0
			}
			updateErr := r.UpdateAccount(txCtx, account.ID, account.Version, repo.AccountChanges{FailedAttempts: &attempts, LockedUntil: &locked, UpdatedAt: now})
			if updateErr != nil {
				return updateErr
			}
			if locked != nil {
				outcome = ErrAccountLocked
				return nil
			}
			outcome = ErrInvalidCredentials
			return nil
		}
		zero := 0
		var unlocked *time.Time
		err = r.UpdateAccount(txCtx, account.ID, account.Version, repo.AccountChanges{FailedAttempts: &zero, LockedUntil: &unlocked, UpdatedAt: now})
		if err != nil {
			return err
		}
		account.FailedAttempts = 0
		account.LockedUntil = nil
		account.Version++
		permissions, err := permissionsFor(txCtx, r, account.ID)
		if err != nil {
			return err
		}
		if account.MustChangePassword {
			permissions = firstLoginPermissions(permissions)
		}
		result, err = s.createSession(txCtx, r, modelAccount(account), permissions)
		return err
	})
	if err == nil && outcome != nil {
		return Session{}, outcome
	}
	return result, err
}

// Compatible 在监听器启动前校验已有 IAM 状态与当前精确权限目录相容；空库保留 setup 入口。
func (s *Service) Compatible(ctx context.Context) error {
	return s.store.Use(ctx, func(r *repo.Unit) error {
		count, err := r.CountAccounts(ctx)
		if err != nil {
			return err
		}
		if count == 0 {
			return nil
		}
		owner, err := r.OwnerRole(ctx)
		if err != nil || !owner.Active || owner.Archived || !owner.System {
			return fmt.Errorf("%w: active system owner role is required", ErrIncompatibleState)
		}
		ownerCount, err := activeOwnerCount(ctx, r)
		if err != nil || ownerCount < 1 {
			return fmt.Errorf("%w: at least one active owner account is required", ErrIncompatibleState)
		}
		items, err := r.ListActiveRolePermissions(ctx)
		if err != nil {
			return err
		}
		ownerKeys := make(map[permissioncatalog.Key]struct{}, len(s.catalog.Definitions()))
		for _, item := range items {
			key := permissioncatalog.Key(item.PermissionKey)
			if _, known := s.catalog.Lookup(key); !known {
				return fmt.Errorf("%w: unknown active permission %q", ErrIncompatibleState, key)
			}
			if item.RoleID == owner.ID {
				ownerKeys[key] = struct{}{}
			}
		}
		for _, definition := range s.catalog.Definitions() {
			if _, exists := ownerKeys[definition.Key]; !exists {
				return fmt.Errorf("%w: owner is missing permission %q", ErrIncompatibleState, definition.Key)
			}
		}
		return nil
	})
}

// ReconcileOwnerCatalog 在模块目录扩展时把新增权限赋予 system owner，并使现有 owner Session 失效。
func (s *Service) ReconcileOwnerCatalog(ctx context.Context) error {
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		count, err := r.CountAccounts(txCtx)
		if err != nil || count == 0 {
			return err
		}
		owner, err := r.OwnerRole(txCtx)
		if err != nil || !owner.Active || owner.Archived || !owner.System {
			return fmt.Errorf("%w: active system owner role is required", ErrIncompatibleState)
		}
		items, err := r.ListActiveRolePermissions(txCtx)
		if err != nil {
			return err
		}
		ownerKeys := map[permissioncatalog.Key]struct{}{}
		for _, item := range items {
			key := permissioncatalog.Key(item.PermissionKey)
			if _, known := s.catalog.Lookup(key); !known {
				return fmt.Errorf("%w: unknown active permission %q", ErrIncompatibleState, key)
			}
			if item.RoleID == owner.ID {
				ownerKeys[key] = struct{}{}
			}
		}
		now := s.clock.Now().UTC()
		changed := false
		for _, definition := range s.catalog.Definitions() {
			if _, exists := ownerKeys[definition.Key]; exists {
				continue
			}
			item := repo.RolePermissionRecord{RoleID: owner.ID, PermissionKey: string(definition.Key), Active: true, UpdatedAt: now}
			if err := r.CreateRolePermission(txCtx, &item); err != nil {
				return err
			}
			changed = true
		}
		if !changed {
			return nil
		}
		if err := touchOwner(txCtx, r, owner, now); err != nil {
			return err
		}
		assignments, err := r.ListAccountRolesByRole(txCtx, owner.ID)
		if err != nil {
			return err
		}
		for _, assignment := range assignments {
			account, err := accountByID(txCtx, r, assignment.AccountID)
			if err != nil {
				return err
			}
			if err := bumpAndRevoke(txCtx, r, account, now); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) Resolve(ctx context.Context, sessionID string) (Session, error) {
	if sessionID == "" {
		return Session{}, ErrSessionInvalid
	}
	var session repo.SessionRecord
	var account repo.AccountRecord
	var permissions []permissioncatalog.Key
	err := s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		var err error
		session, err = r.SessionByHash(txCtx, digest(sessionID))
		if err != nil {
			return ErrSessionInvalid
		}
		now := s.clock.Now().UTC()
		if session.RevokedAt != nil || !now.Before(session.IdleExpiresAt) || !now.Before(session.AbsoluteExpiresAt) {
			return ErrSessionInvalid
		}
		account, err = r.AccountByID(txCtx, session.AccountID)
		if err != nil || account.Status != string(model.AccountActive) || account.SecurityRevision != session.SecurityRevision {
			return ErrSessionInvalid
		}
		permissions, err = permissionsFor(txCtx, r, account.ID)
		if err != nil {
			return err
		}
		if account.MustChangePassword {
			permissions = firstLoginPermissions(permissions)
		}
		if now.Sub(session.LastSeenAt) >= time.Minute {
			session.LastSeenAt = now
			session.IdleExpiresAt = now.Add(s.config.IdleTimeout)
			err = r.TouchSession(txCtx, digest(sessionID), nil, session.LastSeenAt, session.IdleExpiresAt)
		}
		return err
	})
	if err != nil {
		return Session{}, err
	}
	return sessionOutput(sessionID, session, modelAccount(account), permissions), nil
}

func (s *Service) Logout(ctx context.Context, sessionID string) error {
	now := s.clock.Now().UTC()
	return s.store.Use(ctx, func(r *repo.Unit) error {
		err := r.RevokeSession(ctx, digest(sessionID), now)
		if repo.IsNotFound(err) {
			return nil
		}
		return err
	})
}

func (s *Service) RotateCSRF(ctx context.Context, sessionID string) (string, error) {
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	now := s.clock.Now().UTC()
	err = s.store.Use(ctx, func(r *repo.Unit) error {
		session, err := r.SessionByHash(ctx, digest(sessionID))
		if err != nil || session.RevokedAt != nil || !now.Before(session.IdleExpiresAt) || !now.Before(session.AbsoluteExpiresAt) {
			return ErrSessionInvalid
		}
		return r.TouchSession(ctx, digest(sessionID), digest(token), time.Time{}, time.Time{})
	})
	return token, err
}
func (s *Service) ValidateCSRF(ctx context.Context, sessionID, token string) error {
	if sessionID == "" || token == "" {
		return ErrSessionInvalid
	}
	return s.store.Use(ctx, func(r *repo.Unit) error {
		session, err := r.SessionByHash(ctx, digest(sessionID))
		if err != nil {
			return ErrSessionInvalid
		}
		now := s.clock.Now().UTC()
		if session.RevokedAt != nil || !now.Before(session.IdleExpiresAt) || !now.Before(session.AbsoluteExpiresAt) || subtle.ConstantTimeCompare(session.CSRFHash, digest(token)) != 1 {
			return ErrSessionInvalid
		}
		return nil
	})
}

func (s *Service) ChangePassword(ctx context.Context, accountID, currentPassword, newPassword string) error {
	if err := model.ValidatePassword(newPassword); err != nil {
		return err
	}
	hash, err := s.passwords.Hash(newPassword)
	if err != nil {
		return err
	}
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, err := accountByID(txCtx, r, accountID)
		if err != nil {
			return err
		}
		credential, err := r.CredentialByAccount(txCtx, accountID)
		if err != nil || !s.passwords.Compare(credential.PasswordHash, currentPassword) {
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if err = r.UpdateCredential(txCtx, accountID, hash, now); err != nil {
			return err
		}
		return bumpAndRevokeWith(txCtx, r, account, now, nil, false)
	})
}
func (s *Service) ResetPassword(ctx context.Context, accountID, newPassword string) error {
	if err := model.ValidatePassword(newPassword); err != nil {
		return err
	}
	hash, err := s.passwords.Hash(newPassword)
	if err != nil {
		return err
	}
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, err := accountByID(txCtx, r, accountID)
		if err != nil {
			return err
		}
		now := s.clock.Now().UTC()
		if err = r.UpdateCredential(txCtx, accountID, hash, now); err != nil {
			return err
		}
		account.MustChangePassword = true
		return bumpAndRevokeWith(txCtx, r, account, now, nil, true)
	})
}

func (s *Service) CreateAccount(ctx context.Context, username, displayName, password string) (model.Account, error) {
	if err := model.ValidatePassword(password); err != nil {
		return model.Account{}, err
	}
	hash, err := s.passwords.Hash(password)
	if err != nil {
		return model.Account{}, err
	}
	id, err := s.ids.New()
	if err != nil {
		return model.Account{}, err
	}
	account, err := model.NewAccount(id, username, displayName, true, s.clock.Now())
	if err != nil {
		return model.Account{}, err
	}
	record := accountRecord(account)
	err = s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		if err := r.CreateAccount(txCtx, &record); err != nil {
			return err
		}
		return r.CreateCredential(txCtx, &repo.CredentialRecord{AccountID: account.ID, PasswordHash: hash, UpdatedAt: account.UpdatedAt})
	})
	return account, err
}
func (s *Service) ListAccounts(ctx context.Context, offset, limit int) (AccountList, error) {
	offset, limit, err := normalizePage(offset, limit)
	if err != nil {
		return AccountList{}, err
	}
	var records []repo.AccountRecord
	var total int64
	err = s.store.Use(ctx, func(r *repo.Unit) error {
		var listErr error
		total, listErr = r.CountAccounts(ctx)
		if listErr != nil {
			return listErr
		}
		records, listErr = r.ListAccounts(ctx, offset, limit)
		return listErr
	})
	items := make([]model.Account, len(records))
	for i, v := range records {
		items[i] = modelAccount(v)
	}
	return AccountList{Items: items, Offset: offset, Limit: limit, Total: total}, err
}

func (s *Service) ResetPasswordByUsername(ctx context.Context, username, newPassword string) error {
	username, err := model.NormalizeUsername(username)
	if err != nil {
		return err
	}
	var accountID string
	if err := s.store.Use(ctx, func(r *repo.Unit) error {
		account, findErr := r.AccountByUsername(ctx, username)
		if findErr != nil {
			return findErr
		}
		accountID = account.ID
		return nil
	}); err != nil {
		return err
	}
	return s.ResetPassword(ctx, accountID, newPassword)
}
func (s *Service) SetAccountStatus(ctx context.Context, accountID string, status model.AccountStatus) error {
	if status != model.AccountActive && status != model.AccountDisabled {
		return model.ErrInvalidName
	}
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, err := accountByID(txCtx, r, accountID)
		if err != nil {
			return err
		}
		if status == model.AccountDisabled {
			owner, err := ownerRole(txCtx, r)
			if err == nil {
				assigned, err := hasRole(txCtx, r, accountID, owner.ID)
				if err != nil {
					return err
				}
				if assigned {
					count, err := activeOwnerCount(txCtx, r)
					if err != nil {
						return err
					}
					if count <= 1 {
						return model.ErrOwnerInvariant
					}
					if err := touchOwner(txCtx, r, owner, s.clock.Now().UTC()); err != nil {
						return err
					}
				}
			}
		}
		now := s.clock.Now().UTC()
		statusValue := string(status)
		return bumpAndRevokeWith(txCtx, r, account, now, &statusValue, account.MustChangePassword)
	})
}

func (s *Service) CreateRole(ctx context.Context, code, name, description string) (model.Role, error) {
	id, err := s.ids.New()
	if err != nil {
		return model.Role{}, err
	}
	role, err := model.NewRole(id, code, name, description, false, s.clock.Now())
	if err != nil {
		return model.Role{}, err
	}
	record := roleRecord(role)
	err = s.store.Use(ctx, func(r *repo.Unit) error { return r.CreateRole(ctx, &record) })
	return role, err
}
func (s *Service) ListRoles(ctx context.Context, offset, limit int) (RoleList, error) {
	offset, limit, err := normalizePage(offset, limit)
	if err != nil {
		return RoleList{}, err
	}
	var records []repo.RoleRecord
	var total int64
	err = s.store.Use(ctx, func(r *repo.Unit) error {
		var listErr error
		total, listErr = r.CountRoles(ctx)
		if listErr != nil {
			return listErr
		}
		records, listErr = r.ListRoles(ctx, offset, limit)
		return listErr
	})
	items := make([]model.Role, len(records))
	for i, v := range records {
		items[i] = modelRole(v)
	}
	return RoleList{Items: items, Offset: offset, Limit: limit, Total: total}, err
}
func (s *Service) Permissions() []permissioncatalog.Definition { return s.catalog.Definitions() }

func (s *Service) AccountRoleIDs(ctx context.Context, accountID string) ([]string, error) {
	var result []string
	err := s.store.Use(ctx, func(r *repo.Unit) error {
		if _, err := r.AccountByID(ctx, accountID); err != nil {
			return err
		}
		items, err := r.ListAccountRolesByAccount(ctx, accountID, true)
		if err != nil {
			return err
		}
		result = make([]string, len(items))
		for index, item := range items {
			result[index] = item.RoleID
		}
		sort.Strings(result)
		return nil
	})
	return result, err
}

func (s *Service) RolePermissionKeys(ctx context.Context, roleID string) ([]permissioncatalog.Key, error) {
	var result []permissioncatalog.Key
	err := s.store.Use(ctx, func(r *repo.Unit) error {
		if _, err := r.RoleByID(ctx, roleID); err != nil {
			return err
		}
		items, err := r.ListRolePermissions(ctx, roleID, true)
		if err != nil {
			return err
		}
		result = make([]permissioncatalog.Key, len(items))
		for index, item := range items {
			result[index] = permissioncatalog.Key(item.PermissionKey)
		}
		sort.Slice(result, func(left, right int) bool { return result[left] < result[right] })
		return nil
	})
	return result, err
}

func (s *Service) ReplaceAccountRoles(ctx context.Context, accountID string, roleIDs []string) error {
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, err := accountByID(txCtx, r, accountID)
		if err != nil {
			return err
		}
		owner, ownerErr := ownerRole(txCtx, r)
		previousOwner := false
		if ownerErr == nil {
			previousOwner, _ = hasRole(txCtx, r, accountID, owner.ID)
		}
		next := set(roleIDs)
		if previousOwner {
			if _, ok := next[owner.ID]; !ok {
				count, err := activeOwnerCount(txCtx, r)
				if err != nil {
					return err
				}
				if count <= 1 {
					return model.ErrOwnerInvariant
				}
			}
		}
		for roleID := range next {
			role, err := r.RoleByID(txCtx, roleID)
			if err != nil || !role.Active || role.Archived {
				return repo.ErrNotFound
			}
		}
		now := s.clock.Now().UTC()
		existing, err := r.ListAccountRolesByAccount(txCtx, accountID, false)
		if err != nil {
			return err
		}
		seen := map[string]struct{}{}
		for _, item := range existing {
			_, active := next[item.RoleID]
			seen[item.RoleID] = struct{}{}
			if err := r.UpdateAccountRole(txCtx, accountID, item.RoleID, active, now); err != nil {
				return err
			}
		}
		for roleID := range next {
			if _, ok := seen[roleID]; ok {
				continue
			}
			item := repo.AccountRoleRecord{AccountID: accountID, RoleID: roleID, Active: true, UpdatedAt: now}
			if err := r.CreateAccountRole(txCtx, &item); err != nil {
				return err
			}
		}
		if ownerErr == nil && (previousOwner || contains(roleIDs, owner.ID)) {
			if err := touchOwner(txCtx, r, owner, now); err != nil {
				return err
			}
		}
		return bumpAndRevoke(txCtx, r, account, now)
	})
}

func (s *Service) ReplaceRolePermissions(ctx context.Context, roleID string, keys []permissioncatalog.Key) error {
	for _, key := range keys {
		if _, ok := s.catalog.Lookup(key); !ok {
			return fmt.Errorf("%w: %s", ErrUnknownPermission, key)
		}
	}
	return s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		role, err := r.RoleByID(txCtx, roleID)
		if err != nil {
			return err
		}
		if role.Code == model.OwnerRoleCode {
			return ErrImmutableOwner
		}
		now := s.clock.Now().UTC()
		next := map[string]struct{}{}
		for _, key := range keys {
			next[string(key)] = struct{}{}
		}
		existing, err := r.ListRolePermissions(txCtx, roleID, false)
		if err != nil {
			return err
		}
		seen := map[string]struct{}{}
		for _, item := range existing {
			_, active := next[item.PermissionKey]
			seen[item.PermissionKey] = struct{}{}
			if err := r.UpdateRolePermission(txCtx, roleID, item.PermissionKey, active, now); err != nil {
				return err
			}
		}
		for key := range next {
			if _, ok := seen[key]; ok {
				continue
			}
			item := repo.RolePermissionRecord{RoleID: roleID, PermissionKey: key, Active: true, UpdatedAt: now}
			if err := r.CreateRolePermission(txCtx, &item); err != nil {
				return err
			}
		}
		assignments, err := r.ListAccountRolesByRole(txCtx, roleID)
		if err != nil {
			return err
		}
		for _, assignment := range assignments {
			account, err := accountByID(txCtx, r, assignment.AccountID)
			if err != nil {
				return err
			}
			if err := bumpAndRevoke(txCtx, r, account, now); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) createSession(ctx context.Context, r *repo.Unit, account model.Account, permissions []permissioncatalog.Key) (Session, error) {
	id, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	csrf, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	now := s.clock.Now().UTC()
	record := repo.SessionRecord{IDHash: digest(id), AccountID: account.ID, CSRFHash: digest(csrf), SecurityRevision: account.SecurityRevision, CreatedAt: now, LastSeenAt: now, IdleExpiresAt: now.Add(s.config.IdleTimeout), AbsoluteExpiresAt: now.Add(s.config.AbsoluteTimeout)}
	if err := r.CreateSession(ctx, &record); err != nil {
		return Session{}, err
	}
	result := sessionOutput(id, record, account, permissions)
	result.CSRFToken = csrf
	return result, nil
}

func permissionsFor(ctx context.Context, r *repo.Unit, accountID string) ([]permissioncatalog.Key, error) {
	assignments, err := r.ListAccountRolesByAccount(ctx, accountID, true)
	if err != nil {
		return nil, err
	}
	seen := map[permissioncatalog.Key]struct{}{}
	for _, assignment := range assignments {
		role, err := r.RoleByID(ctx, assignment.RoleID)
		if err != nil || !role.Active || role.Archived {
			continue
		}
		items, err := r.ListRolePermissions(ctx, role.ID, true)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			seen[permissioncatalog.Key(item.PermissionKey)] = struct{}{}
		}
	}
	result := make([]permissioncatalog.Key, 0, len(seen))
	for key := range seen {
		result = append(result, key)
	}
	sort.Slice(result, func(i, j int) bool { return result[i] < result[j] })
	return result, nil
}
func accountByID(ctx context.Context, r *repo.Unit, id string) (repo.AccountRecord, error) {
	return r.AccountByID(ctx, id)
}

// RequireAssignableAccount 验证账号存在且当前可承载组织目录关系。
// 该窄方法供 composition 适配为 Organization 的 AccountDirectory 端口，避免模块互相导入。
func (s *Service) RequireAssignableAccount(ctx context.Context, accountID string) error {
	return s.store.Use(ctx, func(r *repo.Unit) error {
		account, err := r.AccountByID(ctx, accountID)
		if err != nil {
			return err
		}
		if account.Status != string(model.AccountActive) {
			return ErrAccountDisabled
		}
		return nil
	})
}
func ownerRole(ctx context.Context, r *repo.Unit) (repo.RoleRecord, error) {
	return r.OwnerRole(ctx)
}
func hasRole(ctx context.Context, r *repo.Unit, accountID, roleID string) (bool, error) {
	return r.HasRole(ctx, accountID, roleID)
}
func activeOwnerCount(ctx context.Context, r *repo.Unit) (int64, error) {
	owner, err := ownerRole(ctx, r)
	if err != nil {
		return 0, err
	}
	assignments, err := r.ListAccountRolesByRole(ctx, owner.ID)
	if err != nil {
		return 0, err
	}
	var count int64
	for _, item := range assignments {
		account, err := accountByID(ctx, r, item.AccountID)
		if err == nil && account.Status == string(model.AccountActive) {
			count++
		}
	}
	return count, nil
}
func touchOwner(ctx context.Context, r *repo.Unit, owner repo.RoleRecord, now time.Time) error {
	return r.TouchRole(ctx, owner.ID, owner.Version, now)
}
func bumpAndRevoke(ctx context.Context, r *repo.Unit, account repo.AccountRecord, now time.Time) error {
	return bumpAndRevokeWith(ctx, r, account, now, nil, account.MustChangePassword)
}
func bumpAndRevokeWith(ctx context.Context, r *repo.Unit, account repo.AccountRecord, now time.Time, status *string, mustChange bool) error {
	revision := account.SecurityRevision + 1
	if err := r.UpdateAccount(ctx, account.ID, account.Version, repo.AccountChanges{Status: status, MustChangePassword: &mustChange, SecurityRevision: &revision, UpdatedAt: now}); err != nil {
		return err
	}
	return r.RevokeAccountSessions(ctx, account.ID, now)
}
func allCatalogKeys(c permissioncatalog.Catalog) []permissioncatalog.Key {
	items := c.Definitions()
	keys := make([]permissioncatalog.Key, len(items))
	for i, item := range items {
		keys[i] = item.Key
	}
	return keys
}
func firstLoginPermissions(keys []permissioncatalog.Key) []permissioncatalog.Key {
	result := make([]permissioncatalog.Key, 0, 2)
	for _, key := range keys {
		if key == iampermission.SelfRead || key == iampermission.SelfPasswordWrite {
			result = append(result, key)
		}
	}
	return result
}
func normalizePage(offset, limit int) (int, int, error) {
	if offset < 0 || limit < 0 || limit > maxListLimit {
		return 0, 0, fmt.Errorf("iam pagination is invalid")
	}
	if limit == 0 {
		limit = defaultListLimit
	}
	return offset, limit, nil
}
func randomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}
func digest(value string) []byte { sum := sha256.Sum256([]byte(value)); return sum[:] }
func sessionOutput(id string, record repo.SessionRecord, account model.Account, permissions []permissioncatalog.Key) Session {
	return Session{ID: id, Identity: model.SessionIdentity{AccountID: account.ID, Username: account.Username, DisplayName: account.DisplayName, Permissions: append([]permissioncatalog.Key(nil), permissions...), MustChangePassword: account.MustChangePassword, SecurityRevision: account.SecurityRevision, AuthenticatedAt: record.CreatedAt}, CreatedAt: record.CreatedAt, LastSeenAt: record.LastSeenAt, IdleExpiresAt: record.IdleExpiresAt, AbsoluteExpiresAt: record.AbsoluteExpiresAt}
}
func accountRecord(v model.Account) repo.AccountRecord {
	return repo.AccountRecord{ID: v.ID, Username: v.Username, DisplayName: v.DisplayName, Status: string(v.Status), MustChangePassword: v.MustChangePassword, SecurityRevision: v.SecurityRevision, FailedAttempts: v.FailedAttempts, LockedUntil: v.LockedUntil, Version: v.Version, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}
}
func modelAccount(v repo.AccountRecord) model.Account {
	return model.Account{ID: v.ID, Username: v.Username, DisplayName: v.DisplayName, Status: model.AccountStatus(v.Status), MustChangePassword: v.MustChangePassword, SecurityRevision: v.SecurityRevision, FailedAttempts: v.FailedAttempts, LockedUntil: v.LockedUntil, Version: v.Version, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}
}
func roleRecord(v model.Role) repo.RoleRecord {
	return repo.RoleRecord{ID: v.ID, Code: v.Code, Name: v.Name, Description: v.Description, Active: v.Active, Archived: v.Archived, System: v.System, Version: v.Version, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}
}
func modelRole(v repo.RoleRecord) model.Role {
	return model.Role{ID: v.ID, Code: v.Code, Name: v.Name, Description: v.Description, Active: v.Active, Archived: v.Archived, System: v.System, Version: v.Version, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}
}
func set(values []string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			result[v] = struct{}{}
		}
	}
	return result
}
func contains(values []string, value string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}
func mapSetupConflict(err error) error {
	if repo.IsDuplicate(err) {
		return ErrSetupClosed
	}
	return err
}
