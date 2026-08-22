// Package model 定义 IAM 的身份、角色与会话业务模型。
package model

import (
	"errors"
	"regexp"
	"strings"
	"time"

	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
)

const (
	// OwnerRoleCode 是不可改名、不可归档的系统所有者角色编码。
	OwnerRoleCode    = "owner"
	MinPasswordRunes = 15
	MaxPasswordRunes = 128
)

var (
	ErrInvalidID       = errors.New("iam id is invalid")
	ErrInvalidUsername = errors.New("iam username is invalid")
	ErrInvalidName     = errors.New("iam name is invalid")
	ErrInvalidPassword = errors.New("iam password is invalid")
	ErrInvalidTime     = errors.New("iam time is invalid")
	ErrOwnerInvariant  = errors.New("iam owner invariant would be violated")
	usernamePattern    = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$`)
	roleCodePattern    = regexp.MustCompile(`^[a-z][a-z0-9._-]{1,63}$`)
)

type AccountStatus string

const (
	AccountActive   AccountStatus = "active"
	AccountDisabled AccountStatus = "disabled"
)

type Account struct {
	ID, Username, DisplayName string
	Status                    AccountStatus
	Archived                  bool
	MustChangePassword        bool
	SecurityRevision, Version uint64
	FailedAttempts            int
	LockedUntil               *time.Time
	CreatedAt, UpdatedAt      time.Time
}

type Role struct {
	ID, Code, Name, Description string
	Active, Archived, System    bool
	Version                     uint64
	CreatedAt, UpdatedAt        time.Time
}

type SessionIdentity struct {
	AccountID, Username, DisplayName string
	Permissions                      []permissioncatalog.Key
	MustChangePassword               bool
	SecurityRevision                 uint64
	AuthenticatedAt                  time.Time
}

func NormalizeUsername(value string) (string, error) {
	value = strings.TrimSpace(value)
	if !usernamePattern.MatchString(value) {
		return "", ErrInvalidUsername
	}
	return strings.ToLower(value), nil
}

func NormalizeRoleCode(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if !roleCodePattern.MatchString(value) {
		return "", ErrInvalidName
	}
	return value, nil
}

func NormalizeName(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > 128 {
		return "", ErrInvalidName
	}
	return value, nil
}

func ValidatePassword(value string) error {
	size := len([]rune(value))
	if size < MinPasswordRunes || size > MaxPasswordRunes {
		return ErrInvalidPassword
	}
	return nil
}

func NewAccount(id, username, displayName string, mustChange bool, now time.Time) (Account, error) {
	if err := idgen.Validate(id); err != nil {
		return Account{}, ErrInvalidID
	}
	username, err := NormalizeUsername(username)
	if err != nil {
		return Account{}, err
	}
	displayName, err = NormalizeName(displayName)
	if err != nil {
		return Account{}, err
	}
	if now.IsZero() {
		return Account{}, ErrInvalidTime
	}
	now = now.UTC()
	return Account{ID: id, Username: username, DisplayName: displayName, Status: AccountActive, MustChangePassword: mustChange, SecurityRevision: 1, CreatedAt: now, UpdatedAt: now}, nil
}

func NewRole(id, code, name, description string, system bool, now time.Time) (Role, error) {
	if err := idgen.Validate(id); err != nil {
		return Role{}, ErrInvalidID
	}
	code, err := NormalizeRoleCode(code)
	if err != nil {
		return Role{}, err
	}
	name, err = NormalizeName(name)
	if err != nil {
		return Role{}, err
	}
	if now.IsZero() {
		return Role{}, ErrInvalidTime
	}
	now = now.UTC()
	return Role{ID: id, Code: code, Name: name, Description: strings.TrimSpace(description), Active: true, System: system, CreatedAt: now, UpdatedAt: now}, nil
}

func (a Account) Assignable() bool { return a.Status == AccountActive && !a.Archived }

// AccountName 是账号显示名的受控更新结果；空值表示未变更。
type AccountName struct {
	DisplayName string
}
