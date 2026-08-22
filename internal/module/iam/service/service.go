// Package service 实现 IAM 的账号、凭据、会话与 Core RBAC 用例。
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
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
	// ErrVersionConflict 表示关系替换请求携带的 expected version 已过期，
	// 客户端必须重新读取最新快照后由用户确认，不允许静默覆盖或自动 merge。
	ErrVersionConflict = errors.New("iam relationship version is stale")
)

type PasswordHasher interface {
	Hash(string) (string, error)
	Verify(string, string) (PasswordVerification, error)
}

// PasswordVerification 是 IAM Service 拥有的密码校验结果，不暴露具体哈希库类型。
type PasswordVerification struct {
	Match       bool
	NeedsRehash bool
}

// AuthorizationPublisher 是 IAM Service 在授权 mutation 中使用的 runtime
// 契约；由 module-local composition 注入 authorization.Runtime 实现。
// candidate 必须在事务 commit 前完整构造，commit 后只做原子发布。
type AuthorizationPublisher interface {
	// Mutate 串行化授权 mutation 的数据库事务、commit 与 publish 三段。
	Mutate(func() error) error
	// BuildCandidate 在未提交事务内构造完整候选 evaluator。
	BuildCandidate(context.Context, repo.PolicySnapshot) error
	// PublishCandidate 在 commit 成功后原子发布候选，不返回错误。
	PublishCandidate()
	// ProjectPermissions 用同 revision 的 evaluator 导出账号有效权限键，
	// 只用于 Session/WebUI 体验投影；服务端授权逐 operation 走 Decide。
	// subject 是账号 ID，restricted 表示首次登录只导出自助权限。
	ProjectPermissions(context.Context, string, uint64, bool) ([]permissioncatalog.Key, error)
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
	AuthorizationRevision                                   uint64
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

// AccountRolesView 是账号角色关系的可编辑快照（乐观并发读取侧）。
type AccountRolesView struct {
	AccountID             string
	AccountVersion        uint64
	AuthorizationRevision uint64
	RoleIDs               []string
}

// RolePermissionsView 是角色权限关系的可编辑快照（乐观并发读取侧）。
type RolePermissionsView struct {
	RoleID                string
	RoleVersion           uint64
	AuthorizationRevision uint64
	PermissionKeys        []permissioncatalog.Key
}

// AssignmentResult 是关系替换的写入结果（新版本、revision 与 diff 计数）。
type AssignmentResult struct {
	EntityVersion         uint64
	AuthorizationRevision uint64
	Added, Removed        int
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
	store         *repo.Store
	clock         clock.Clock
	ids           idgen.Generator
	passwords     PasswordHasher
	config        Config
	catalog       permissioncatalog.Catalog
	authorization AuthorizationPublisher
	dummyHash     string
}

func New(store *repo.Store, currentClock clock.Clock, ids idgen.Generator, passwords PasswordHasher, config Config, catalog permissioncatalog.Catalog, authorization AuthorizationPublisher) (*Service, error) {
	if store == nil || currentClock == nil || ids == nil || passwords == nil || authorization == nil {
		return nil, fmt.Errorf("iam service dependencies are incomplete")
	}
	if config.IdleTimeout <= 0 || config.AbsoluteTimeout <= config.IdleTimeout || config.MaxFailedAttempts <= 0 || config.LockDuration <= 0 {
		return nil, fmt.Errorf("iam service security budgets are invalid")
	}
	dummy, err := passwords.Hash("fixed-cost-dummy-password")
	if err != nil {
		return nil, fmt.Errorf("create iam fixed-cost verifier: %w", err)
	}
	return &Service{store: store, clock: currentClock, ids: ids, passwords: passwords, config: config, catalog: catalog, authorization: authorization, dummyHash: dummy}, nil
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
	err = s.authorizeMutation(ctx, func(txCtx context.Context, r *repo.Unit) (bool, error) {
		count, err := r.CountAccounts(txCtx)
		if err != nil {
			return false, err
		}
		if count != 0 {
			return false, ErrSetupClosed
		}
		ar := accountRecord(account)
		if err := r.CreateAccount(txCtx, &ar); err != nil {
			return false, mapSetupConflict(err)
		}
		credential := repo.CredentialRecord{AccountID: account.ID, PasswordHash: hash, UpdatedAt: now}
		if err := r.CreateCredential(txCtx, &credential); err != nil {
			return false, err
		}
		rr := roleRecord(owner)
		if err := r.CreateRole(txCtx, &rr); err != nil {
			return false, err
		}
		assignment := repo.AccountRoleRecord{AccountID: account.ID, RoleID: owner.ID, Active: true, UpdatedAt: now}
		if err := r.CreateAccountRole(txCtx, &assignment); err != nil {
			return false, err
		}
		for _, definition := range s.catalog.Definitions() {
			item := repo.RolePermissionRecord{RoleID: owner.ID, PermissionKey: string(definition.Key), Active: true, UpdatedAt: now}
			if err := r.CreateRolePermission(txCtx, &item); err != nil {
				return false, err
			}
		}
		return true, nil
	}, func(txCtx context.Context, r *repo.Unit) error {
		session, err := s.createSession(txCtx, r, account)
		if err != nil {
			return err
		}
		result = session
		return nil
	})
	if repo.IsDuplicate(err) {
		return Session{}, ErrSetupClosed
	}
	if err != nil {
		return Session{}, err
	}
	return s.projectSession(ctx, result)
}

func (s *Service) Login(ctx context.Context, username, password string) (Session, error) {
	username, err := model.NormalizeUsername(username)
	if err != nil {
		_, _ = s.passwords.Verify(s.dummyHash, password)
		return Session{}, ErrInvalidCredentials
	}
	var result Session
	var outcome error
	err = s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, findErr := r.AccountByUsername(txCtx, username)
		if findErr != nil {
			_, _ = s.passwords.Verify(s.dummyHash, password)
			return ErrInvalidCredentials
		}
		credential, findErr := r.CredentialByAccount(txCtx, account.ID)
		if findErr != nil {
			_, _ = s.passwords.Verify(s.dummyHash, password)
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if account.Status != string(model.AccountActive) {
			_, _ = s.passwords.Verify(credential.PasswordHash, password)
			return ErrAccountDisabled
		}
		if account.LockedUntil != nil && now.Before(*account.LockedUntil) {
			_, _ = s.passwords.Verify(credential.PasswordHash, password)
			return ErrAccountLocked
		}
		verification, verifyErr := s.passwords.Verify(credential.PasswordHash, password)
		if verifyErr != nil {
			return credentialVerificationError(verifyErr)
		}
		if !verification.Match {
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
		if verification.NeedsRehash {
			rehashed, hashErr := s.passwords.Hash(password)
			if hashErr != nil {
				return fmt.Errorf("rehash password credential: %w", hashErr)
			}
			if updateErr := r.UpdateCredential(txCtx, account.ID, rehashed, now); updateErr != nil {
				return updateErr
			}
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
		result, err = s.createSession(txCtx, r, modelAccount(account))
		return err
	})
	if err == nil && outcome != nil {
		return Session{}, outcome
	}
	if err != nil {
		return Session{}, err
	}
	return s.projectSession(ctx, result)
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

// ReconcileOwnerCatalog 在模块目录扩展时把新增权限赋予 system owner，并使
// 现有 owner Session 失效；无新增权限时为 no-op，不 bump revision。
func (s *Service) ReconcileOwnerCatalog(ctx context.Context) error {
	return s.authorizeMutation(ctx, func(txCtx context.Context, r *repo.Unit) (bool, error) {
		count, err := r.CountAccounts(txCtx)
		if err != nil || count == 0 {
			return false, err
		}
		owner, err := r.OwnerRole(txCtx)
		if err != nil || !owner.Active || owner.Archived || !owner.System {
			return false, fmt.Errorf("%w: active system owner role is required", ErrIncompatibleState)
		}
		items, err := r.ListActiveRolePermissions(txCtx)
		if err != nil {
			return false, err
		}
		ownerKeys := map[permissioncatalog.Key]struct{}{}
		for _, item := range items {
			key := permissioncatalog.Key(item.PermissionKey)
			if _, known := s.catalog.Lookup(key); !known {
				return false, fmt.Errorf("%w: unknown active permission %q", ErrIncompatibleState, key)
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
				return false, err
			}
			changed = true
		}
		if !changed {
			return false, nil
		}
		if err := touchOwner(txCtx, r, owner, now); err != nil {
			return false, err
		}
		assignments, err := r.ListAccountRolesByRole(txCtx, owner.ID)
		if err != nil {
			return false, err
		}
		for _, assignment := range assignments {
			account, err := accountByID(txCtx, r, assignment.AccountID)
			if err != nil {
				return false, err
			}
			if err := bumpAndRevoke(txCtx, r, account, now); err != nil {
				return false, err
			}
		}
		return true, nil
	}, nil)
}

func (s *Service) Resolve(ctx context.Context, sessionID string) (Session, error) {
	if sessionID == "" {
		return Session{}, ErrSessionInvalid
	}
	var session repo.SessionRecord
	var account repo.AccountRecord
	var revision uint64
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
		revision, err = r.CurrentAuthorizationRevision(txCtx)
		if err != nil {
			return err
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
	result := sessionOutput(sessionID, session, modelAccount(account), nil)
	result.AuthorizationRevision = revision
	return s.projectSession(ctx, result)
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
		if err != nil {
			return ErrInvalidCredentials
		}
		verification, verifyErr := s.passwords.Verify(credential.PasswordHash, currentPassword)
		if verifyErr != nil {
			return credentialVerificationError(verifyErr)
		}
		if !verification.Match {
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if err = r.UpdateCredential(txCtx, accountID, hash, now); err != nil {
			return err
		}
		return bumpAndRevokeWith(txCtx, r, account, now, nil, false)
	})
}

func credentialVerificationError(err error) error {
	return errors.Join(ErrInvalidCredentials, fmt.Errorf("verify stored password credential: %w", err))
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
	account.Version = 1
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
	role.Version = 1
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

// AccountRolesSnapshot 返回账号角色关系的可编辑快照：账号版本、
// authorization revision 与当前 active RoleID 集合。
func (s *Service) AccountRolesSnapshot(ctx context.Context, accountID string) (AccountRolesView, error) {
	var result AccountRolesView
	err := s.store.Use(ctx, func(r *repo.Unit) error {
		account, err := r.AccountByID(ctx, accountID)
		if err != nil {
			return err
		}
		items, err := r.ListAccountRolesByAccount(ctx, accountID, true)
		if err != nil {
			return err
		}
		roleIDs := make([]string, len(items))
		for index, item := range items {
			roleIDs[index] = item.RoleID
		}
		sort.Strings(roleIDs)
		revision, err := r.CurrentAuthorizationRevision(ctx)
		if err != nil {
			return err
		}
		result = AccountRolesView{AccountID: accountID, AccountVersion: account.Version, AuthorizationRevision: revision, RoleIDs: roleIDs}
		return nil
	})
	return result, err
}

// RolePermissionsSnapshot 返回角色权限关系的可编辑快照：角色版本、
// authorization revision 与当前 active PermissionKey 集合。
func (s *Service) RolePermissionsSnapshot(ctx context.Context, roleID string) (RolePermissionsView, error) {
	var result RolePermissionsView
	err := s.store.Use(ctx, func(r *repo.Unit) error {
		role, err := r.RoleByID(ctx, roleID)
		if err != nil {
			return err
		}
		items, err := r.ListRolePermissions(ctx, roleID, true)
		if err != nil {
			return err
		}
		keys := make([]permissioncatalog.Key, len(items))
		for index, item := range items {
			keys[index] = permissioncatalog.Key(item.PermissionKey)
		}
		sort.Slice(keys, func(left, right int) bool { return keys[left] < keys[right] })
		revision, err := r.CurrentAuthorizationRevision(ctx)
		if err != nil {
			return err
		}
		result = RolePermissionsView{RoleID: roleID, RoleVersion: role.Version, AuthorizationRevision: revision, PermissionKeys: keys}
		return nil
	})
	return result, err
}

// ReplaceAccountRoles 以 expected version + 完整期望集合替换账号角色关系；
// 版本冲突返回 ErrVersionConflict；no-op 提交不改变版本/revision、不撤销
// Session；有效变更原子更新关系、受影响账号安全状态/Session、authorization
// revision 并发布新 evaluator。
func (s *Service) ReplaceAccountRoles(ctx context.Context, accountID string, expectedVersion uint64, roleIDs []string) (AssignmentResult, error) {
	var result AssignmentResult
	err := s.authorizeMutation(ctx, func(txCtx context.Context, r *repo.Unit) (bool, error) {
		account, err := accountByID(txCtx, r, accountID)
		if err != nil {
			return false, err
		}
		if account.Version != expectedVersion {
			return false, ErrVersionConflict
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
					return false, err
				}
				if count <= 1 {
					return false, model.ErrOwnerInvariant
				}
			}
		}
		for roleID := range next {
			role, err := r.RoleByID(txCtx, roleID)
			if err != nil || !role.Active || role.Archived {
				return false, repo.ErrNotFound
			}
		}
		existing, err := r.ListAccountRolesByAccount(txCtx, accountID, true)
		if err != nil {
			return false, err
		}
		current := map[string]struct{}{}
		for _, item := range existing {
			current[item.RoleID] = struct{}{}
		}
		added, removed := diffNames(current, next)
		if len(added) == 0 && len(removed) == 0 {
			revision, err := r.CurrentAuthorizationRevision(txCtx)
			if err != nil {
				return false, err
			}
			result = AssignmentResult{EntityVersion: account.Version, AuthorizationRevision: revision}
			return false, nil
		}
		now := s.clock.Now().UTC()
		all, err := r.ListAccountRolesByAccount(txCtx, accountID, false)
		if err != nil {
			return false, err
		}
		seen := map[string]struct{}{}
		for _, item := range all {
			_, active := next[item.RoleID]
			seen[item.RoleID] = struct{}{}
			if err := r.UpdateAccountRole(txCtx, accountID, item.RoleID, active, now); err != nil {
				return false, err
			}
		}
		for roleID := range next {
			if _, ok := seen[roleID]; ok {
				continue
			}
			item := repo.AccountRoleRecord{AccountID: accountID, RoleID: roleID, Active: true, UpdatedAt: now}
			if err := r.CreateAccountRole(txCtx, &item); err != nil {
				return false, err
			}
		}
		if ownerErr == nil && (previousOwner || contains(roleIDs, owner.ID)) {
			if err := touchOwner(txCtx, r, owner, now); err != nil {
				return false, err
			}
		}
		if err := bumpAndRevoke(txCtx, r, account, now); err != nil {
			return false, err
		}
		result = AssignmentResult{EntityVersion: account.Version + 1, Added: len(added), Removed: len(removed)}
		return true, nil
	}, func(txCtx context.Context, r *repo.Unit) error {
		revision, err := r.CurrentAuthorizationRevision(txCtx)
		if err != nil {
			return err
		}
		result.AuthorizationRevision = revision
		return nil
	})
	return result, err
}

// ReplaceRolePermissions 以 expected version + 完整期望集合替换角色权限；
// 版本冲突返回 ErrVersionConflict；no-op 提交不改变版本/revision、不撤销
// 受影响账号 Session；有效变更原子更新关系、账号安全状态/Session、
// authorization revision 并发布新 evaluator。owner 角色不可编辑。
func (s *Service) ReplaceRolePermissions(ctx context.Context, roleID string, expectedVersion uint64, keys []permissioncatalog.Key) (AssignmentResult, error) {
	for _, key := range keys {
		if _, ok := s.catalog.Lookup(key); !ok {
			return AssignmentResult{}, fmt.Errorf("%w: %s", ErrUnknownPermission, key)
		}
	}
	var result AssignmentResult
	err := s.authorizeMutation(ctx, func(txCtx context.Context, r *repo.Unit) (bool, error) {
		role, err := r.RoleByID(txCtx, roleID)
		if err != nil {
			return false, err
		}
		if role.Code == model.OwnerRoleCode {
			return false, ErrImmutableOwner
		}
		if role.Version != expectedVersion {
			return false, ErrVersionConflict
		}
		next := map[string]struct{}{}
		for _, key := range keys {
			next[string(key)] = struct{}{}
		}
		existing, err := r.ListRolePermissions(txCtx, roleID, true)
		if err != nil {
			return false, err
		}
		current := map[string]struct{}{}
		for _, item := range existing {
			current[item.PermissionKey] = struct{}{}
		}
		added, removed := diffNames(current, next)
		if len(added) == 0 && len(removed) == 0 {
			revision, err := r.CurrentAuthorizationRevision(txCtx)
			if err != nil {
				return false, err
			}
			result = AssignmentResult{EntityVersion: role.Version, AuthorizationRevision: revision}
			return false, nil
		}
		now := s.clock.Now().UTC()
		all, err := r.ListRolePermissions(txCtx, roleID, false)
		if err != nil {
			return false, err
		}
		seen := map[string]struct{}{}
		for _, item := range all {
			_, active := next[item.PermissionKey]
			seen[item.PermissionKey] = struct{}{}
			if err := r.UpdateRolePermission(txCtx, roleID, item.PermissionKey, active, now); err != nil {
				return false, err
			}
		}
		for key := range next {
			if _, ok := seen[key]; ok {
				continue
			}
			item := repo.RolePermissionRecord{RoleID: roleID, PermissionKey: key, Active: true, UpdatedAt: now}
			if err := r.CreateRolePermission(txCtx, &item); err != nil {
				return false, err
			}
		}
		if err := s.touchAssignedAccounts(txCtx, r, roleID, now); err != nil {
			return false, err
		}
		if err := touchRole(txCtx, r, role, now); err != nil {
			return false, err
		}
		result = AssignmentResult{EntityVersion: role.Version + 1, Added: len(added), Removed: len(removed)}
		return true, nil
	}, func(txCtx context.Context, r *repo.Unit) error {
		revision, err := r.CurrentAuthorizationRevision(txCtx)
		if err != nil {
			return err
		}
		result.AuthorizationRevision = revision
		return nil
	})
	return result, err
}

// touchAssignedAccounts 撤销所有持有该角色的账号 Session 并 bump 其安全 revision。
func (s *Service) touchAssignedAccounts(ctx context.Context, r *repo.Unit, roleID string, now time.Time) error {
	assignments, err := r.ListAccountRolesByRole(ctx, roleID)
	if err != nil {
		return err
	}
	for _, assignment := range assignments {
		account, err := accountByID(ctx, r, assignment.AccountID)
		if err != nil {
			return err
		}
		if err := bumpAndRevoke(ctx, r, account, now); err != nil {
			return err
		}
	}
	return nil
}

// authorizeMutation 是授权关系 mutation 的统一协议：在同一事务内完成业务
// mutation、authorization revision bump、完成品 finalize（可选）与完整候选
// evaluator 构造；事务 commit 成功后原子发布候选。mutate 返回 false 表示
// no-op（关系未变化），不 bump revision、不构造候选、不发布。
func (s *Service) authorizeMutation(ctx context.Context, mutate func(context.Context, *repo.Unit) (bool, error), finalize func(context.Context, *repo.Unit) error) error {
	return s.authorization.Mutate(func() error {
		now := s.clock.Now().UTC()
		err := s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
			changed, err := mutate(txCtx, r)
			if err != nil {
				return err
			}
			if !changed {
				return nil
			}
			if _, err := r.UpdateAuthorizationRevision(txCtx, now); err != nil {
				return err
			}
			if finalize != nil {
				if err := finalize(txCtx, r); err != nil {
					return err
				}
			}
			snapshot, err := r.AuthorizationSnapshot(txCtx, s.catalog)
			if err != nil {
				return err
			}
			return s.authorization.BuildCandidate(txCtx, snapshot)
		})
		if err != nil {
			return err
		}
		s.authorization.PublishCandidate()
		return nil
	})
}

// SessionInfo 是会话集中管理的元数据视图：只暴露 IDHash 摘要（hex）、
// 账号与过期信息，绝不泄露明文 SessionID 或 CSRF。
type SessionInfo struct {
	IDHash                                        string
	AccountID                                     string
	CreatedAt, LastSeenAt, IdleExpiresAt, AbsoluteExpiresAt time.Time
	RevokedAt                                     *time.Time
}

// ListSessions 返回账号的全部受信 Session 元数据视图（含已吊销标记）。
func (s *Service) ListSessions(ctx context.Context, accountID string) ([]SessionInfo, error) {
	if strings.TrimSpace(accountID) == "" {
		return nil, ErrSessionInvalid
	}
	var records []repo.SessionRecord
	err := s.store.Use(ctx, func(r *repo.Unit) error {
		account, err := r.AccountByID(ctx, accountID)
		if err != nil {
			return err
		}
		_ = account
		records, err = r.ListSessionsByAccount(ctx, accountID)
		return err
	})
	if err != nil {
		return nil, err
	}
	items := make([]SessionInfo, len(records))
	for index, record := range records {
		items[index] = SessionInfo{
			IDHash: hex.EncodeToString(record.IDHash), AccountID: record.AccountID,
			CreatedAt: record.CreatedAt, LastSeenAt: record.LastSeenAt,
			IdleExpiresAt: record.IdleExpiresAt, AbsoluteExpiresAt: record.AbsoluteExpiresAt,
			RevokedAt: record.RevokedAt,
		}
	}
	return items, nil
}

// RevokeSessions 按 idHash 摘要批量吊销指定账号的受信 Session；摘要无法
// 解析、不属于该账号或账号已禁用时 fail closed。当前登录会话由调用方按
// 决策语义决定是否包含在集合内，本方法不自动豁免任何会话。
func (s *Service) RevokeSessions(ctx context.Context, accountID string, idHashes []string) (int, error) {
	if strings.TrimSpace(accountID) == "" {
		return 0, ErrSessionInvalid
	}
	if len(idHashes) == 0 {
		return 0, nil
	}
	now := s.clock.Now().UTC()
	revoked := 0
	err := s.store.WithinTx(ctx, func(txCtx context.Context, r *repo.Unit) error {
		account, err := r.AccountByID(txCtx, accountID)
		if err != nil {
			return err
		}
		if account.Status != string(model.AccountActive) {
			return ErrAccountDisabled
		}
		for _, idHash := range idHashes {
			if strings.TrimSpace(idHash) == "" {
				return ErrSessionInvalid
			}
			raw, err := hex.DecodeString(idHash)
			if err != nil || len(raw) == 0 {
				return ErrSessionInvalid
			}
			record, err := r.SessionByHash(txCtx, raw)
			if err != nil {
				if repo.IsNotFound(err) {
					return ErrSessionInvalid
				}
				return err
			}
			if record.AccountID != accountID {
				return ErrSessionInvalid
			}
			if record.RevokedAt != nil {
				continue
			}
			if err := r.RevokeSession(txCtx, raw, now); err != nil {
				return err
			}
			revoked++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return revoked, nil
}

// createSession 在事务内创建会话记录；Permissions 投影由调用方在事务外
// 通过 projectSession 填充（evaluator 同 revision 导出）。
func (s *Service) createSession(ctx context.Context, r *repo.Unit, account model.Account) (Session, error) {
	id, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	csrf, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	revision, err := r.CurrentAuthorizationRevision(ctx)
	if err != nil {
		return Session{}, err
	}
	now := s.clock.Now().UTC()
	record := repo.SessionRecord{IDHash: digest(id), AccountID: account.ID, CSRFHash: digest(csrf), SecurityRevision: account.SecurityRevision, CreatedAt: now, LastSeenAt: now, IdleExpiresAt: now.Add(s.config.IdleTimeout), AbsoluteExpiresAt: now.Add(s.config.AbsoluteTimeout)}
	if err := r.CreateSession(ctx, &record); err != nil {
		return Session{}, err
	}
	result := sessionOutput(id, record, account, nil)
	result.AuthorizationRevision = revision
	result.CSRFToken = csrf
	return result, nil
}

// projectSession 在事务/写锁外填充 Session 的权限投影：用 evaluator 在
// 会话 revision 下导出有效权限键（受限会话只导出自助权限），不再手写展开
// 角色关系。投影失败时 fail closed，不返回空权限冒充当前状态。
func (s *Service) projectSession(ctx context.Context, session Session) (Session, error) {
	if session.ID == "" {
		return Session{}, ErrSessionInvalid
	}
	permissions, err := s.authorization.ProjectPermissions(ctx, session.Identity.AccountID, session.AuthorizationRevision, session.Identity.MustChangePassword)
	if err != nil {
		return Session{}, fmt.Errorf("project iam session permissions: %w", err)
	}
	session.Identity.Permissions = permissions
	return session, nil
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
func touchRole(ctx context.Context, r *repo.Unit, role repo.RoleRecord, now time.Time) error {
	return r.TouchRole(ctx, role.ID, role.Version, now)
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

// diffNames 计算相对于目标集合 next 的 added（新增）与 removed（移除）子集。
func diffNames(current, next map[string]struct{}) (added, removed []string) {
	for id := range next {
		if _, ok := current[id]; !ok {
			added = append(added, id)
		}
	}
	for id := range current {
		if _, ok := next[id]; !ok {
			removed = append(removed, id)
		}
	}
	return added, removed
}
func mapSetupConflict(err error) error {
	if repo.IsDuplicate(err) {
		return ErrSetupClosed
	}
	return err
}
