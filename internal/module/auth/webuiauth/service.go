// Package webuiauth 实现 Auth module 的本地 WebUI 用户与有状态 Session。
package webuiauth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/auth/adapter/password"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/database"
)

const (
	SessionCookieName = "__Host-community-go_webui_session"
	maxUsernameRunes  = 128
	minPasswordRunes  = 15
	maxPasswordRunes  = 128
	maxFailedAttempts = 5
	lockDuration      = 15 * time.Minute
)

var (
	ErrSetupClosed           = errors.New("webui setup is closed")
	ErrInvalidCredentials    = errors.New("invalid webui credentials")
	errUsernameInvalid       = errors.New("webui username is invalid")
	errPasswordLengthInvalid = errors.New("webui password length is invalid")
	ErrWebUILocked           = errors.New("webui account is locked")
	ErrSessionInvalid        = errors.New("webui session is invalid")
)

// Access 是 Auth 使用方提供的短生命周期数据库租约。
type Access interface {
	Use(context.Context, func(database.Client) error) error
	WithinTx(context.Context, func(context.Context, database.Client, database.Tx) error) error
}

// Config 保存 WebUI Session 和首次设置的安全输入。
type Config struct {
	SetupToken      string
	IdleTimeout     time.Duration
	AbsoluteTimeout time.Duration
	AllowedOrigins  []string
}

// Service 拥有 WebUI user/session 的业务语义，不拥有数据库连接关闭权。
type Service struct {
	access         Access
	clock          clock.Clock
	config         Config
	dummyHash      string
	allowedOrigins map[string]struct{}
}

// User 是不含密码哈希的安全输出。
type User struct {
	ID, Username string
	Scopes       []authmodel.Scope
}

// Session 是只返回给当前请求的认证材料；数据库只保存 ID/CSRF 摘要。
type Session struct {
	ID                string
	CSRFToken         string
	User              User
	CreatedAt         time.Time
	LastSeenAt        time.Time
	IdleExpiresAt     time.Time
	AbsoluteExpiresAt time.Time
}

// New 创建 Auth WebUI service；不打开连接、不打印任何机密。
func New(access Access, currentClock clock.Clock, config Config) (*Service, error) {
	if access == nil || currentClock == nil {
		return nil, fmt.Errorf("webui auth dependencies are incomplete")
	}
	if config.IdleTimeout <= 0 || config.AbsoluteTimeout <= config.IdleTimeout {
		return nil, fmt.Errorf("webui session timeouts are invalid")
	}
	dummy, err := passwordadapter.Hash("dummy-password-for-fixed-cost-check")
	if err != nil {
		return nil, fmt.Errorf("create webui password verifier: %w", err)
	}
	allowedOrigins := make(map[string]struct{}, len(config.AllowedOrigins))
	for _, origin := range config.AllowedOrigins {
		allowedOrigins[origin] = struct{}{}
	}
	config.AllowedOrigins = append([]string(nil), config.AllowedOrigins...)
	return &Service{access: access, clock: currentClock, config: config, dummyHash: dummy, allowedOrigins: allowedOrigins}, nil
}

// Setup 原子创建唯一初始 WebUI 用户；成功后 setup token 永久失效。
func (s *Service) Setup(ctx context.Context, setupToken, username, password string) (Session, error) {
	if subtle.ConstantTimeCompare([]byte(setupToken), []byte(s.config.SetupToken)) != 1 || strings.TrimSpace(s.config.SetupToken) == "" {
		return Session{}, ErrInvalidCredentials
	}
	username, err := normalizeUsername(username)
	if err != nil {
		return Session{}, err
	}
	if err := validatePassword(password); err != nil {
		return Session{}, err
	}
	hash, err := passwordadapter.Hash(password)
	if err != nil {
		return Session{}, fmt.Errorf("hash webui password: %w", err)
	}
	var result Session
	err = s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		users, sessions, err := repositories(client, tx)
		if err != nil {
			return err
		}
		count, err := users.Count(txCtx, database.Query{})
		if err != nil {
			return err
		}
		if count != 0 {
			return ErrSetupClosed
		}
		userID, err := randomID()
		if err != nil {
			return err
		}
		user := userRecord{ID: userID, Username: username, PasswordHash: hash, Scopes: "management:read", CreatedAt: s.clock.Now().UTC(), UpdatedAt: s.clock.Now().UTC()}
		if err := users.Create(txCtx, &user); err != nil {
			return err
		}
		result, err = s.createSession(txCtx, sessions, user)
		return err
	})
	return result, err
}

// Login 校验密码、执行固定成本失败路径并在成功时轮换 Session。
func (s *Service) Login(ctx context.Context, username, password string) (Session, error) {
	username = strings.TrimSpace(username)
	var result Session
	err := s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		users, sessions, err := repositories(client, tx)
		if err != nil {
			return err
		}
		user, findErr := users.First(txCtx, database.Query{Filters: []database.Filter{{Field: "Username", Operator: database.OpEqual, Value: username}}})
		if findErr != nil {
			_ = passwordadapter.Compare(s.dummyHash, password)
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if user.LockedUntil != nil && now.Before(*user.LockedUntil) {
			_ = passwordadapter.Compare(user.PasswordHash, password)
			return ErrWebUILocked
		}
		if !passwordadapter.Compare(user.PasswordHash, password) {
			user.FailedAttempts++
			if user.FailedAttempts >= maxFailedAttempts {
				locked := now.Add(lockDuration)
				user.LockedUntil = &locked
				user.FailedAttempts = 0
			}
			user.UpdatedAt = now
			_, updateErr := users.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: user.ID}}}, database.Changes{"FailedAttempts": user.FailedAttempts, "LockedUntil": user.LockedUntil, "UpdatedAt": user.UpdatedAt})
			if updateErr != nil {
				return updateErr
			}
			if user.LockedUntil != nil {
				return ErrWebUILocked
			}
			return ErrInvalidCredentials
		}
		user.FailedAttempts = 0
		user.LockedUntil = nil
		user.UpdatedAt = now
		if _, err := users.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: user.ID}}}, database.Changes{"FailedAttempts": user.FailedAttempts, "LockedUntil": user.LockedUntil, "UpdatedAt": user.UpdatedAt}); err != nil {
			return err
		}
		result, err = s.createSession(txCtx, sessions, user)
		return err
	})
	return result, err
}

// Resolve 校验 Cookie 中的 opaque Session ID，并返回 Auth Principal。
func (s *Service) Resolve(ctx context.Context, sessionID string) (Session, authmodel.Principal, error) {
	if sessionID == "" {
		return Session{}, authmodel.Principal{}, ErrSessionInvalid
	}
	hash := digest(sessionID)
	var session sessionRecord
	var user userRecord
	err := s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		users, sessions, err := repositories(client, tx)
		if err != nil {
			return err
		}
		session, err = sessions.First(txCtx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}})
		if err != nil {
			return ErrSessionInvalid
		}
		now := s.clock.Now().UTC()
		if session.RevokedAt != nil || !now.Before(session.AbsoluteExpiresAt) || !now.Before(session.IdleExpiresAt) {
			return ErrSessionInvalid
		}
		user, err = users.First(txCtx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: session.UserID}}})
		if err != nil {
			return ErrSessionInvalid
		}
		if now.Sub(session.LastSeenAt) >= time.Minute {
			session.LastSeenAt = now
			session.IdleExpiresAt = now.Add(s.config.IdleTimeout)
			_, err = sessions.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}}, database.Changes{"LastSeenAt": session.LastSeenAt, "IdleExpiresAt": session.IdleExpiresAt})
		}
		return err
	})
	if err != nil {
		return Session{}, authmodel.Principal{}, err
	}
	principal, err := principalForUser(s.clock.Now(), user)
	if err != nil {
		return Session{}, authmodel.Principal{}, err
	}
	return sessionOutput(sessionID, session, user), principal, nil
}

// Logout 撤销服务端 Session；不存在的 Session 不回显差异。
func (s *Service) Logout(ctx context.Context, sessionID string) error {
	hash := digest(sessionID)
	return s.access.Use(ctx, func(client database.Client) error {
		_, sessions, err := repositories(client, nil)
		if err != nil {
			return err
		}
		now := s.clock.Now().UTC()
		_, err = sessions.Update(ctx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}}, database.Changes{"RevokedAt": &now})
		return err
	})
}

// ResetPassword 更新本地 WebUI 用户密码并撤销该用户的全部 Session。
func (s *Service) ResetPassword(ctx context.Context, username, password string) error {
	username, err := normalizeUsername(username)
	if err != nil {
		return err
	}
	if err := validatePassword(password); err != nil {
		return err
	}
	hash, err := passwordadapter.Hash(password)
	if err != nil {
		return err
	}
	return s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		users, sessions, err := repositories(client, tx)
		if err != nil {
			return err
		}
		user, err := users.First(txCtx, database.Query{Filters: []database.Filter{{Field: "Username", Operator: database.OpEqual, Value: username}}})
		if err != nil {
			return ErrInvalidCredentials
		}
		now := s.clock.Now().UTC()
		if _, err := users.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "ID", Operator: database.OpEqual, Value: user.ID}}}, database.Changes{"PasswordHash": hash, "FailedAttempts": 0, "LockedUntil": (*time.Time)(nil), "UpdatedAt": now}); err != nil {
			return err
		}
		_, err = sessions.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "UserID", Operator: database.OpEqual, Value: user.ID}}}, database.Changes{"RevokedAt": &now})
		return err
	})
}

// RotateCSRF 为已存在的 Session 生成新的内存令牌，数据库只保存摘要。
func (s *Service) RotateCSRF(ctx context.Context, sessionID string) (string, error) {
	hash := digest(sessionID)
	var token string
	err := s.access.WithinTx(ctx, func(txCtx context.Context, client database.Client, tx database.Tx) error {
		_, sessions, err := repositories(client, tx)
		if err != nil {
			return err
		}
		session, err := sessions.First(txCtx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}})
		if err != nil {
			return ErrSessionInvalid
		}
		now := s.clock.Now().UTC()
		if session.RevokedAt != nil || !now.Before(session.AbsoluteExpiresAt) || !now.Before(session.IdleExpiresAt) {
			return ErrSessionInvalid
		}
		value, _, err := randomBytes(32)
		if err != nil {
			return err
		}
		token = base64.RawURLEncoding.EncodeToString(value)
		_, err = sessions.Update(txCtx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: hash}}}, database.Changes{"CSRFHash": digest(token)})
		return err
	})
	return token, err
}

// ValidateCSRF 校验 Session 绑定的 header token，不接受 cookie 或 URL 参数替代。
func (s *Service) ValidateCSRF(ctx context.Context, sessionID, token string) error {
	if sessionID == "" || token == "" {
		return ErrSessionInvalid
	}
	return s.access.Use(ctx, func(client database.Client) error {
		_, sessions, err := repositories(client, nil)
		if err != nil {
			return err
		}
		session, err := sessions.First(ctx, database.Query{Filters: []database.Filter{{Field: "IDHash", Operator: database.OpEqual, Value: digest(sessionID)}}})
		if err != nil {
			return ErrSessionInvalid
		}
		now := s.clock.Now().UTC()
		if session.RevokedAt != nil || !now.Before(session.AbsoluteExpiresAt) || !now.Before(session.IdleExpiresAt) {
			return ErrSessionInvalid
		}
		if subtle.ConstantTimeCompare(session.CSRFHash, digest(token)) != 1 {
			return ErrSessionInvalid
		}
		return nil
	})
}

func (s *Service) createSession(ctx context.Context, sessions *database.BaseRepository[sessionRecord], user userRecord) (Session, error) {
	identifier, csrf, err := randomBytes(32)
	if err != nil {
		return Session{}, err
	}
	now := s.clock.Now().UTC()
	session := sessionRecord{IDHash: digest(base64.RawURLEncoding.EncodeToString(identifier)), UserID: user.ID, CSRFHash: digest(base64.RawURLEncoding.EncodeToString(csrf)), CreatedAt: now, LastSeenAt: now, IdleExpiresAt: now.Add(s.config.IdleTimeout), AbsoluteExpiresAt: now.Add(s.config.AbsoluteTimeout)}
	if err := sessions.Create(ctx, &session); err != nil {
		return Session{}, err
	}
	result := sessionOutput(base64.RawURLEncoding.EncodeToString(identifier), session, user)
	result.CSRFToken = base64.RawURLEncoding.EncodeToString(csrf)
	return result, nil
}

func repositories(client database.Client, tx database.Tx) (*database.BaseRepository[userRecord], *database.BaseRepository[sessionRecord], error) {
	users, err := database.NewRepository[userRecord](client, userSchema())
	if err != nil {
		return nil, nil, err
	}
	sessions, err := database.NewRepository[sessionRecord](client, sessionSchema())
	if err != nil {
		return nil, nil, err
	}
	if tx != nil {
		users, err = users.WithTx(tx)
		if err != nil {
			return nil, nil, err
		}
		sessions, err = sessions.WithTx(tx)
		if err != nil {
			return nil, nil, err
		}
	}
	return users, sessions, nil
}

func normalizeUsername(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > maxUsernameRunes {
		return "", errUsernameInvalid
	}
	return value, nil
}
func validatePassword(value string) error {
	size := len([]rune(value))
	if size < minPasswordRunes || size > maxPasswordRunes {
		return errPasswordLengthInvalid
	}
	return nil
}
func randomBytes(size int) ([]byte, []byte, error) {
	first := make([]byte, size)
	second := make([]byte, size)
	if _, err := rand.Read(first); err != nil {
		return nil, nil, err
	}
	if _, err := rand.Read(second); err != nil {
		return nil, nil, err
	}
	return first, second, nil
}
func randomID() (string, error) {
	value, _, err := randomBytes(16)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}
func digest(value string) []byte { sum := sha256.Sum256([]byte(value)); return sum[:] }
func sessionOutput(id string, session sessionRecord, user userRecord) Session {
	scopes := parseScopes(user.Scopes)
	return Session{ID: id, User: User{ID: user.ID, Username: user.Username, Scopes: scopes}, CreatedAt: session.CreatedAt, LastSeenAt: session.LastSeenAt, IdleExpiresAt: session.IdleExpiresAt, AbsoluteExpiresAt: session.AbsoluteExpiresAt}
}
func principalForUser(now time.Time, user userRecord) (authmodel.Principal, error) {
	return authmodel.NewPrincipal(user.ID, authmodel.ActorService, parseScopes(user.Scopes), now, user.CreatedAt)
}
func parseScopes(value string) []authmodel.Scope {
	values := strings.Split(value, ",")
	result := make([]authmodel.Scope, 0, len(values))
	for _, item := range values {
		if strings.TrimSpace(item) != "" {
			result = append(result, authmodel.Scope(strings.TrimSpace(item)))
		}
	}
	return result
}

type userRecord struct {
	ID             string
	Username       string
	PasswordHash   string
	Scopes         string
	FailedAttempts int
	LockedUntil    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
type sessionRecord struct {
	IDHash            []byte
	UserID            string
	CSRFHash          []byte
	CreatedAt         time.Time
	LastSeenAt        time.Time
	IdleExpiresAt     time.Time
	AbsoluteExpiresAt time.Time
	RevokedAt         *time.Time
}

func userSchema() database.Schema {
	return database.Schema{Table: "webui_users", Fields: []database.Field{{Name: "ID", Column: "id", Type: database.FieldString, PrimaryKey: true, Length: 128}, {Name: "Username", Column: "username", Type: database.FieldString, Length: 128}, {Name: "PasswordHash", Column: "password_hash", Type: database.FieldString}, {Name: "Scopes", Column: "scopes", Type: database.FieldString}, {Name: "FailedAttempts", Column: "failed_attempts", Type: database.FieldInt}, {Name: "LockedUntil", Column: "locked_until", Type: database.FieldTime, Nullable: true}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "UpdatedAt", Column: "updated_at", Type: database.FieldTime}}, Indexes: []database.Index{{Name: "ux_webui_users_username", Fields: []string{"Username"}, Unique: true}}}
}
func sessionSchema() database.Schema {
	return database.Schema{Table: "webui_sessions", Fields: []database.Field{{Name: "IDHash", Column: "id_hash", Type: database.FieldBytes, PrimaryKey: true}, {Name: "UserID", Column: "user_id", Type: database.FieldString, Length: 128}, {Name: "CSRFHash", Column: "csrf_hash", Type: database.FieldBytes}, {Name: "CreatedAt", Column: "created_at", Type: database.FieldTime}, {Name: "LastSeenAt", Column: "last_seen_at", Type: database.FieldTime}, {Name: "IdleExpiresAt", Column: "idle_expires_at", Type: database.FieldTime}, {Name: "AbsoluteExpiresAt", Column: "absolute_expires_at", Type: database.FieldTime}, {Name: "RevokedAt", Column: "revoked_at", Type: database.FieldTime, Nullable: true}}, References: []database.Reference{{Field: "UserID", Table: "webui_users", ReferenceField: "ID", OnDelete: database.ReferenceCascade}}}
}
