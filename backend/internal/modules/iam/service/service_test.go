package service_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/app/testsupport"
	"github.com/open-console/console-platform/internal/modules/iam/model"
	"github.com/open-console/console-platform/internal/modules/iam/repository"

	. "github.com/open-console/console-platform/internal/modules/iam/service"
)

func permissionContext(scope string, object string, action string) PermissionContext {
	return PermissionContext{Scope: scope, Object: object, Action: action}
}

func hasPermissionGrant(grants []PermissionGrant, scope, code string) bool {
	for _, grant := range grants {
		if grant.Scope == scope && grant.Code == code {
			return true
		}
	}
	return false
}

func TestIAMLifecycle(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	if admin.OrgID == 0 || admin.UserID == 0 {
		t.Fatalf("unexpected principal: %#v", admin)
	}

	allowed, err := svc.Authorize(ctx, *admin, permissionContext(model.PermissionScopeTenant, "audit", "read"))
	if err != nil || !allowed {
		t.Fatalf("owner should read audit logs, allowed=%v err=%v", allowed, err)
	}

	login, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"})
	if err != nil {
		t.Fatalf("Login() failed: %v", err)
	}
	if !hasPermissionGrant(login.Permissions, model.PermissionScopePlatform, "permission:sync") {
		t.Fatalf("platform owner login should expose permission:sync grant: %#v", login.Permissions)
	}
	principal, err := svc.AuthenticateToken(ctx, login.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken() failed: %v", err)
	}
	if principal.UserID != admin.UserID || principal.OrgID != admin.OrgID {
		t.Fatalf("unexpected authenticated principal: %#v", principal)
	}
	session, err := svc.CurrentSession(ctx, principal)
	if err != nil {
		t.Fatalf("CurrentSession() failed: %v", err)
	}
	if !hasPermissionGrant(session.Permissions, model.PermissionScopePlatform, "permission:sync") {
		t.Fatalf("platform owner session should expose permission:sync grant: %#v", session.Permissions)
	}

	refreshed, err := svc.Refresh(ctx, RefreshInput{RefreshToken: login.RefreshToken})
	if err != nil {
		t.Fatalf("Refresh() failed: %v", err)
	}
	if refreshed.AccessToken == "" || refreshed.RefreshToken == "" || refreshed.RefreshToken == login.RefreshToken {
		t.Fatalf("refresh rotation failed: %#v", refreshed)
	}
	if !hasPermissionGrant(refreshed.Permissions, model.PermissionScopePlatform, "permission:sync") {
		t.Fatalf("platform owner refresh should expose permission:sync grant: %#v", refreshed.Permissions)
	}

	inviteDelivery, err := svc.InviteUser(ctx, InviteUserInput{Principal: principal, Email: "member@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser() failed: %v", err)
	}
	if inviteDelivery.Token == "" || inviteDelivery.URL == "" {
		t.Fatalf("expected debug invitation delivery, got %#v", inviteDelivery)
	}
	if !inviteDelivery.Debug {
		t.Fatalf("expected debug invitation delivery flag, got %#v", inviteDelivery)
	}
	member, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: inviteDelivery.Token, Username: "member", Password: "password123"})
	if err != nil {
		t.Fatalf("AcceptInvitation() failed: %v", err)
	}
	memberAllowed, err := svc.Authorize(ctx, *member, permissionContext(model.PermissionScopeTenant, "audit", "read"))
	if err != nil {
		t.Fatalf("Authorize(member) failed: %v", err)
	}
	if memberAllowed {
		t.Fatal("member should not read audit logs")
	}
	memberLogin, err := svc.Login(ctx, LoginInput{Identifier: "member@example.com", Password: "password123", OrgCode: "acme"})
	if err != nil {
		t.Fatalf("member Login() before reset failed: %v", err)
	}
	if hasPermissionGrant(memberLogin.Permissions, model.PermissionScopePlatform, "permission:sync") {
		t.Fatalf("member login should not expose platform sync grant: %#v", memberLogin.Permissions)
	}

	resetDelivery, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: "member@example.com"})
	if err != nil {
		t.Fatalf("ForgotPassword() failed: %v", err)
	}
	if resetDelivery.Token == "" || resetDelivery.URL == "" {
		t.Fatalf("expected debug password reset delivery, got %#v", resetDelivery)
	}
	if !resetDelivery.Debug {
		t.Fatalf("expected debug password reset delivery flag, got %#v", resetDelivery)
	}
	if err := svc.ResetPassword(ctx, ResetPasswordInput{Token: resetDelivery.Token, NewPassword: "newpassword123"}); err != nil {
		t.Fatalf("ResetPassword() failed: %v", err)
	}
	if _, err := svc.Refresh(ctx, RefreshInput{RefreshToken: memberLogin.RefreshToken}); err != ErrSessionRevoked {
		t.Fatalf("old refresh after password reset = %v, want ErrSessionRevoked", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Identifier: "member@example.com", Password: "newpassword123", OrgCode: "acme"}); err != nil {
		t.Fatalf("member login after reset failed: %v", err)
	}
}

func TestDirectSignupCreatesOwnerSession(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	signup, err := svc.Signup(ctx, SignupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "owner",
		Email:    "owner@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Signup() failed: %v", err)
	}
	if signup.Status != SignupStatusAuthenticated || signup.Session == nil || signup.Tokens.AccessToken == "" {
		t.Fatalf("unexpected signup result: %#v", signup)
	}
	principal, err := svc.AuthenticateToken(ctx, signup.Tokens.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(signup token) failed: %v", err)
	}
	allowed, err := svc.Authorize(ctx, principal, permissionContext(model.PermissionScopeTenant, "audit", "read"))
	if err != nil || !allowed {
		t.Fatalf("signup owner should read audit logs, allowed=%v err=%v", allowed, err)
	}
	platformAllowed, err := svc.Authorize(ctx, principal, permissionContext(model.PermissionScopePlatform, "config", "read"))
	if err != nil {
		t.Fatalf("Authorize(platform config) failed: %v", err)
	}
	if platformAllowed {
		t.Fatal("signup owner should not read platform config")
	}
	if _, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{
		Principal: principal,
		UserID:    principal.UserID,
		RoleCode:  model.RolePlatformOwner,
		Days:      1,
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("tenant owner CreateAPIToken(platform_owner) error = %v, want ErrForbidden", err)
	}
	orgs, err := svc.ListMyOrganizations(ctx, principal)
	if err != nil || len(orgs) != 1 || orgs[0].Code != "acme" {
		t.Fatalf("unexpected signup organizations: %#v err=%v", orgs, err)
	}
	if _, err := svc.CreateRole(ctx, CreateRoleInput{
		Principal:   principal,
		Code:        "operator",
		Name:        "Operator",
		Permissions: []string{"audit:read", "user:read"},
	}); err != nil {
		t.Fatalf("CreateRole() failed: %v", err)
	}
	roles, err := svc.ListRoles(ctx, principal)
	if err != nil {
		t.Fatalf("ListRoles() failed: %v", err)
	}
	var operator *model.Role
	for i := range roles {
		if roles[i].Code == model.RolePlatformOwner {
			t.Fatal("tenant signup organization should not expose platform_owner role")
		}
		if roles[i].Code == "operator" {
			operator = &roles[i]
		}
	}
	if operator == nil || !containsString(operator.Permissions, "audit:read") || !containsString(operator.Permissions, "user:read") {
		t.Fatalf("operator permissions not hydrated: %#v", operator)
	}

	if _, err := svc.Signup(ctx, SignupInput{OrgCode: "acme", OrgName: "Other", Username: "other", Email: "other@example.com", Password: "password123"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("duplicate org signup error = %v, want ErrDuplicate", err)
	}
	if _, err := svc.Signup(ctx, SignupInput{OrgCode: "other", OrgName: "Other", Username: "owner", Email: "other@example.com", Password: "password123"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("duplicate username signup error = %v, want ErrDuplicate", err)
	}
	if _, err := svc.Signup(ctx, SignupInput{OrgCode: "other", OrgName: "Other", Username: "other", Email: "owner@example.com", Password: "password123"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("duplicate email signup error = %v, want ErrDuplicate", err)
	}
}

func TestIAMCacheFailuresWarnAndFallBack(t *testing.T) {
	ctx := context.Background()
	moduleDB := testsupport.IAMSQLiteDatabase(t, "iam.db")
	deps := testsupport.NewIAMDeps(t)
	repo := repository.New(moduleDB)
	cfg := Config{
		RegistrationMode:     RegistrationModeDirect,
		MFAIssuer:            "console-platform-test",
		MFASecretKey:         "01234567890123456789012345678901",
		LoginMaxFailures:     3,
		LoginLockDuration:    time.Minute,
		InvitationTTL:        time.Hour,
		EmailVerificationTTL: time.Hour,
		PasswordResetTTL:     time.Hour,
		NotificationDriver:   "debug",
		PublicBaseURL:        "/admin",
	}
	bootstrapSvc := New(repo, deps.Passwords, deps.Tokens, deps.Authz, deps.IDs, deps.TOTP, cfg, NoopNotifier{})
	admin, err := bootstrapSvc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}

	logger := &captureWarningLogger{}
	svc := New(repo, deps.Passwords, deps.Tokens, deps.Authz, deps.IDs, deps.TOTP, cfg, NoopNotifier{},
		WithCacheStore(failingCacheStore{err: errors.New("cache backend unavailable")}),
		WithLogger(logger),
	)
	orgs, err := svc.ListMyOrganizations(ctx, *admin)
	if err != nil {
		t.Fatalf("ListMyOrganizations() failed: %v", err)
	}
	if len(orgs) != 1 || orgs[0].Code != "acme" {
		t.Fatalf("unexpected organizations despite cache failure: %#v", orgs)
	}
	if _, err := svc.CreateOrganization(ctx, *admin, "beta", "Beta"); err != nil {
		t.Fatalf("CreateOrganization() failed despite cache failure: %v", err)
	}
	for _, message := range []string{
		"iam cache epoch read failed",
		"iam cache read failed",
		"iam cache write failed",
		"iam cache epoch bump failed",
	} {
		if !warningMessagesContain(logger.entries, message) {
			t.Fatalf("expected warning %q in %#v", message, logger.entries)
		}
	}
}

func TestEmailVerificationSignupConfirmsPendingAccount(t *testing.T) {
	ctx := context.Background()
	notifier := &recordingNotifier{}
	svc, repo, deps, cleanup := newTestServiceWithNotifier(t, RegistrationModeEmailVerification, notifier)
	defer cleanup()

	signup, err := svc.Signup(ctx, SignupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "owner",
		Email:    "owner@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Signup() failed: %v", err)
	}
	if signup.Status != SignupStatusVerificationPending || signup.Session != nil || signup.Tokens.AccessToken != "" {
		t.Fatalf("unexpected email verification signup result: %#v", signup)
	}
	if signup.Delivery == nil || !signup.Delivery.Debug || signup.Delivery.Token == "" || signup.Delivery.URL == "" {
		t.Fatalf("expected debug verification delivery, got %#v", signup.Delivery)
	}
	if notifier.emailVerification == nil || notifier.emailVerification.Token != signup.Delivery.Token {
		t.Fatalf("notifier did not receive verification notice: %#v", notifier.emailVerification)
	}
	if _, err := svc.Login(ctx, LoginInput{Identifier: "owner@example.com", Password: "password123", OrgCode: "acme"}); !errors.Is(err, ErrAccountDisabled) {
		t.Fatalf("pending account login error = %v, want ErrAccountDisabled", err)
	}
	verification, err := repo.FindEmailVerificationByTokenHash(ctx, deps.Tokens.HashRefreshToken(signup.Delivery.Token))
	if err != nil {
		t.Fatalf("FindEmailVerificationByTokenHash() failed: %v", err)
	}
	if verification.Status != model.StatusPending {
		t.Fatalf("verification status = %q, want pending", verification.Status)
	}

	pair, err := svc.ConfirmEmailVerification(ctx, ConfirmEmailVerificationInput{Token: signup.Delivery.Token})
	if err != nil {
		t.Fatalf("ConfirmEmailVerification() failed: %v", err)
	}
	principal, err := svc.AuthenticateToken(ctx, pair.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(verification token) failed: %v", err)
	}
	if principal.Email != "owner@example.com" || principal.OrgID == 0 {
		t.Fatalf("unexpected principal after verification: %#v", principal)
	}
	platformAllowed, err := svc.Authorize(ctx, principal, permissionContext(model.PermissionScopePlatform, "config", "read"))
	if err != nil {
		t.Fatalf("Authorize(platform config) failed: %v", err)
	}
	if platformAllowed {
		t.Fatal("email verification owner should not read platform config")
	}
	verification, err = repo.FindEmailVerificationByTokenHash(ctx, deps.Tokens.HashRefreshToken(signup.Delivery.Token))
	if err != nil {
		t.Fatalf("FindEmailVerificationByTokenHash() after confirm failed: %v", err)
	}
	if verification.Status != model.StatusUsed || verification.VerifiedAt == nil {
		t.Fatalf("verification after confirm = %#v, want used with verifiedAt", verification)
	}
}

func TestEmailVerificationSignupQueuesOutboxWhenNotificationFails(t *testing.T) {
	ctx := context.Background()
	current := time.Date(2026, 6, 23, 10, 0, 0, 0, time.UTC)
	notifier := &switchableNotifier{err: errors.New("smtp down")}
	svc, repo, deps, cleanup := newTestServiceWithNotifier(t, RegistrationModeEmailVerification, notifier, func(cfg *Config) {
		cfg.Now = func() time.Time { return current }
		cfg.NotificationRetryInterval = time.Minute
		cfg.NotificationRetryMaxAttempts = 3
	})
	defer cleanup()

	input := SignupInput{OrgCode: "acme", OrgName: "Acme", Username: "owner", Email: "owner@example.com", Password: "password123"}
	if _, err := svc.Signup(ctx, input); !errors.Is(err, ErrNotificationDelivery) {
		t.Fatalf("Signup() error = %v, want ErrNotificationDelivery", err)
	}
	if notifier.emailVerification == nil || notifier.emailVerification.Token == "" {
		t.Fatalf("notifier did not receive email verification notice: %#v", notifier.emailVerification)
	}
	verification, err := repo.FindEmailVerificationByTokenHash(ctx, deps.Tokens.HashRefreshToken(notifier.emailVerification.Token))
	if err != nil {
		t.Fatalf("FindEmailVerificationByTokenHash() failed: %v", err)
	}
	if verification.Status != model.StatusPending {
		t.Fatalf("verification status = %q, want pending", verification.Status)
	}
	notifier.err = nil
	current = current.Add(time.Minute + time.Second)
	result, err := svc.DispatchNotificationOutbox(ctx, NotificationOutboxDispatchInput{Limit: 10})
	if err != nil {
		t.Fatalf("DispatchNotificationOutbox() failed: %v", err)
	}
	if result.Sent != 1 || result.Scanned != 1 {
		t.Fatalf("dispatch result = %#v, want one sent item", result)
	}
	if _, err := svc.ConfirmEmailVerification(ctx, ConfirmEmailVerificationInput{Token: notifier.emailVerification.Token}); err != nil {
		t.Fatalf("ConfirmEmailVerification(after retry) failed: %v", err)
	}
}

func TestListNotificationOutboxReturnsSanitizedView(t *testing.T) {
	ctx := context.Background()
	notifier := &switchableNotifier{err: errors.New("smtp down")}
	svc, _, _, cleanup := newTestServiceWithNotifier(t, RegistrationModeEmailVerification, notifier, func(cfg *Config) {
		cfg.NotificationRetryMaxAttempts = 3
	})
	defer cleanup()

	if _, err := svc.Signup(ctx, SignupInput{OrgCode: "acme", OrgName: "Acme", Username: "owner", Email: "owner@example.com", Password: "password123"}); !errors.Is(err, ErrNotificationDelivery) {
		t.Fatalf("Signup() error = %v, want ErrNotificationDelivery", err)
	}
	page, err := svc.ListNotificationOutbox(ctx, Principal{}, NotificationOutboxFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListNotificationOutbox() failed: %v", err)
	}
	if page.Total != 1 || len(page.Items) != 1 {
		t.Fatalf("outbox page = %#v, want one item", page)
	}
	item := page.Items[0]
	if item.Status != model.NotificationOutboxStatusPending || item.Kind != model.NotificationOutboxKindEmailVerification {
		t.Fatalf("outbox item = %#v, want pending email verification", item)
	}
	raw, err := json.Marshal(page)
	if err != nil {
		t.Fatalf("marshal outbox page: %v", err)
	}
	body := string(raw)
	if strings.Contains(body, `"token"`) || strings.Contains(body, `"url"`) || strings.Contains(body, notifier.emailVerification.Token) {
		t.Fatalf("sanitized outbox response leaked token or url: %s", body)
	}
}

func TestRetryNotificationOutboxDeliversPendingTask(t *testing.T) {
	ctx := context.Background()
	notifier := &switchableNotifier{err: errors.New("smtp down")}
	svc, repo, _, cleanup := newTestServiceWithNotifier(t, RegistrationModeEmailVerification, notifier, func(cfg *Config) {
		cfg.NotificationRetryMaxAttempts = 1
	})
	defer cleanup()

	if _, err := svc.Signup(ctx, SignupInput{OrgCode: "acme", OrgName: "Acme", Username: "owner", Email: "owner@example.com", Password: "password123"}); !errors.Is(err, ErrNotificationDelivery) {
		t.Fatalf("Signup() error = %v, want ErrNotificationDelivery", err)
	}
	page, err := svc.ListNotificationOutbox(ctx, Principal{}, NotificationOutboxFilter{Status: model.NotificationOutboxStatusFailed})
	if err != nil {
		t.Fatalf("ListNotificationOutbox(failed) failed: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("failed outbox page = %#v, want one item", page)
	}
	user, err := repo.FindUserByIdentifier(ctx, "owner@example.com")
	if err != nil {
		t.Fatalf("FindUserByIdentifier() failed: %v", err)
	}
	org, err := repo.FindOrganizationByCode(ctx, "acme")
	if err != nil {
		t.Fatalf("FindOrganizationByCode() failed: %v", err)
	}
	notifier.err = nil
	notifier.emailVerification = nil
	view, err := svc.RetryNotificationOutbox(ctx, RetryNotificationOutboxInput{
		Principal: Principal{UserID: user.ID, OrgID: org.ID, ProductCode: "console-platform", ClientType: "pc_web"},
		OutboxID:  page.Items[0].ID,
		UserAgent: "test",
		IPAddress: "127.0.0.1",
	})
	if err != nil {
		t.Fatalf("RetryNotificationOutbox() failed: %v", err)
	}
	if view.Status != model.NotificationOutboxStatusSent || view.SentAt == nil {
		t.Fatalf("retry view = %#v, want sent with sentAt", view)
	}
	if notifier.emailVerification == nil || notifier.emailVerification.Token == "" || notifier.emailVerification.URL == "" {
		t.Fatalf("notifier did not receive retried email verification notice: %#v", notifier.emailVerification)
	}
}

func TestConfirmEmailVerificationMarksExpiredTokenAndReturnsInvalid(t *testing.T) {
	ctx := context.Background()
	current := time.Date(2026, 6, 22, 10, 0, 0, 0, time.UTC)
	svc, repo, deps, cleanup := newTestServiceWithNotifier(t, RegistrationModeEmailVerification, NoopNotifier{}, func(cfg *Config) {
		cfg.Now = func() time.Time { return current }
		cfg.EmailVerificationTTL = time.Minute
	})
	defer cleanup()

	signup, err := svc.Signup(ctx, SignupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "owner",
		Email:    "owner@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Signup() failed: %v", err)
	}

	current = current.Add(2 * time.Minute)
	if _, err := svc.ConfirmEmailVerification(ctx, ConfirmEmailVerificationInput{Token: signup.Delivery.Token}); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("ConfirmEmailVerification(expired) error = %v, want ErrInvalidToken", err)
	}
	verification, err := repo.FindEmailVerificationByTokenHash(ctx, deps.Tokens.HashRefreshToken(signup.Delivery.Token))
	if err != nil {
		t.Fatalf("FindEmailVerificationByTokenHash() failed: %v", err)
	}
	if verification.Status != model.StatusExpired {
		t.Fatalf("verification status = %q, want %q", verification.Status, model.StatusExpired)
	}
}

func TestConfirmEmailVerificationReturnsExpiredSaveError(t *testing.T) {
	ctx := context.Background()
	current := time.Date(2026, 6, 22, 10, 0, 0, 0, time.UTC)
	svc, repoGate, _, cleanup := newTestServiceWithRepositoryGateAndConfig(t, RegistrationModeEmailVerification, func(cfg *Config) {
		cfg.Now = func() time.Time { return current }
		cfg.EmailVerificationTTL = time.Minute
	})
	defer cleanup()

	signup, err := svc.Signup(ctx, SignupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "owner",
		Email:    "owner@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Signup() failed: %v", err)
	}

	current = current.Add(2 * time.Minute)
	repoGate.saveEmailVerificationErr = errors.New("save email verification failed")
	if _, err := svc.ConfirmEmailVerification(ctx, ConfirmEmailVerificationInput{Token: signup.Delivery.Token}); !errors.Is(err, repoGate.saveEmailVerificationErr) {
		t.Fatalf("ConfirmEmailVerification(expired save) error = %v, want %v", err, repoGate.saveEmailVerificationErr)
	}
}

func TestInviteUserQueuesOutboxWhenNotificationFails(t *testing.T) {
	ctx := context.Background()
	current := time.Date(2026, 6, 23, 10, 0, 0, 0, time.UTC)
	notifier := &switchableNotifier{err: errors.New("smtp down")}
	svc, repo, deps, cleanup := newTestServiceWithNotifier(t, RegistrationModeDirect, notifier, func(cfg *Config) {
		cfg.Now = func() time.Time { return current }
		cfg.NotificationRetryInterval = time.Minute
		cfg.NotificationRetryMaxAttempts = 3
	})
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	delivery, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
	if !errors.Is(err, ErrNotificationDelivery) {
		t.Fatalf("InviteUser() error = %v, want ErrNotificationDelivery", err)
	}
	if delivery.Token != "" || delivery.URL != "" {
		t.Fatalf("smtp failure should not expose debug delivery: %#v", delivery)
	}
	if notifier.invitation == nil || notifier.invitation.Token == "" {
		t.Fatalf("notifier did not receive invitation notice: %#v", notifier.invitation)
	}
	invitation, err := repo.FindInvitationByTokenHash(ctx, deps.Tokens.HashRefreshToken(notifier.invitation.Token))
	if err != nil {
		t.Fatalf("FindInvitationByTokenHash() failed: %v", err)
	}
	if invitation.Status != model.StatusPending {
		t.Fatalf("invitation status = %q, want %q", invitation.Status, model.StatusPending)
	}
	notifier.err = nil
	current = current.Add(time.Minute + time.Second)
	result, err := svc.DispatchNotificationOutbox(ctx, NotificationOutboxDispatchInput{Limit: 10})
	if err != nil {
		t.Fatalf("DispatchNotificationOutbox() failed: %v", err)
	}
	if result.Sent != 1 || result.Scanned != 1 {
		t.Fatalf("dispatch result = %#v, want one sent item", result)
	}
	if _, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: notifier.invitation.Token, Username: "member", Password: "password123"}); err != nil {
		t.Fatalf("AcceptInvitation(after retry) failed: %v", err)
	}
}

func TestInviteUserRejectsPlatformOwnerRole(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	_, err = svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "owner@example.com", RoleCode: model.RolePlatformOwner})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("InviteUser(platform_owner) error = %v, want ErrForbidden", err)
	}
}

func TestUpdateUserRejectsPlatformOwnerMembershipMutation(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}

	tests := []struct {
		name  string
		input UpdateUserInput
	}{
		{
			name: "roles",
			input: UpdateUserInput{
				Principal: *admin,
				UserID:    admin.UserID,
				Roles:     []string{model.RoleAdmin},
				HasRoles:  true,
			},
		},
		{
			name: "status",
			input: UpdateUserInput{
				Principal: *admin,
				UserID:    admin.UserID,
				Status:    ptrString(model.StatusDisabled),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := svc.UpdateUser(ctx, tt.input); !errors.Is(err, ErrForbidden) {
				t.Fatalf("UpdateUser(platform_owner %s) error = %v, want ErrForbidden", tt.name, err)
			}
			roles, err := repoGate.ListUserRoleCodes(ctx, admin.OrgID, admin.UserID)
			if err != nil {
				t.Fatalf("ListUserRoleCodes() failed: %v", err)
			}
			if !testRolesContain(roles, model.RolePlatformOwner) {
				t.Fatalf("platform_owner role was removed after rejected %s update: %#v", tt.name, roles)
			}
			if testRolesContain(roles, model.RoleAdmin) {
				t.Fatalf("admin role was added after rejected %s update: %#v", tt.name, roles)
			}
			membership, err := repoGate.FindMembershipAnyStatus(ctx, admin.OrgID, admin.UserID)
			if err != nil {
				t.Fatalf("FindMembershipAnyStatus() failed: %v", err)
			}
			if membership.Status != model.StatusActive {
				t.Fatalf("membership status = %q, want %q", membership.Status, model.StatusActive)
			}
		})
	}
}

func TestRoleMutationsRejectInvalidOrUnassignablePermissions(t *testing.T) {
	ctx := context.Background()
	setup := func(t *testing.T) (Service, *Principal, func()) {
		t.Helper()
		svc, cleanup := newTestService(t)
		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			cleanup()
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		return svc, admin, cleanup
	}
	findRole := func(t *testing.T, svc Service, principal Principal, code string) *model.Role {
		t.Helper()
		roles, err := svc.ListRoles(ctx, principal)
		if err != nil {
			t.Fatalf("ListRoles() failed: %v", err)
		}
		for i := range roles {
			if roles[i].Code == code {
				return &roles[i]
			}
		}
		return nil
	}

	t.Run("create rejects unknown tenant permission", func(t *testing.T) {
		svc, admin, cleanup := setup(t)
		defer cleanup()

		_, err := svc.CreateRole(ctx, CreateRoleInput{
			Principal:   *admin,
			Code:        "operator",
			Name:        "Operator",
			Permissions: []string{"audit:read", "unknown:read"},
		})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("CreateRole() error = %v, want ErrInvalidInput", err)
		}
		if role := findRole(t, svc, *admin, "operator"); role != nil {
			t.Fatalf("CreateRole() persisted role after invalid permission: %#v", role)
		}
	})

	t.Run("create rejects platform permission", func(t *testing.T) {
		svc, admin, cleanup := setup(t)
		defer cleanup()

		_, err := svc.CreateRole(ctx, CreateRoleInput{
			Principal:   *admin,
			Code:        "operator",
			Name:        "Operator",
			Permissions: []string{"config:read"},
		})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("CreateRole(platform permission) error = %v, want ErrInvalidInput", err)
		}
		if role := findRole(t, svc, *admin, "operator"); role != nil {
			t.Fatalf("CreateRole() persisted role after platform permission: %#v", role)
		}
	})

	t.Run("update rolls back invalid permission replacement", func(t *testing.T) {
		svc, admin, cleanup := setup(t)
		defer cleanup()

		role, err := svc.CreateRole(ctx, CreateRoleInput{
			Principal:   *admin,
			Code:        "operator",
			Name:        "Operator",
			Permissions: []string{"audit:read"},
		})
		if err != nil {
			t.Fatalf("CreateRole() failed: %v", err)
		}
		_, err = svc.UpdateRole(ctx, UpdateRoleInput{
			Principal:      *admin,
			RoleID:         role.ID,
			Name:           "Operator Changed",
			Permissions:    []string{"user:read", "config:read"},
			HasPermissions: true,
		})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("UpdateRole(platform permission) error = %v, want ErrInvalidInput", err)
		}
		updated := findRole(t, svc, *admin, "operator")
		if updated == nil {
			t.Fatal("UpdateRole() removed role after invalid permission")
		}
		if updated.Name != "Operator" || !containsString(updated.Permissions, "audit:read") || containsString(updated.Permissions, "config:read") {
			t.Fatalf("UpdateRole() did not roll back invalid replacement: %#v", updated)
		}
	})
}

func TestPolicyReloadErrorsAreReturnedForRoleMutations(t *testing.T) {
	tests := []struct {
		name string
		run  func(context.Context, Service, *Principal, *loadRulesGateEnforcer) error
	}{
		{
			name: "create role",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *loadRulesGateEnforcer) error {
				gate.failLoadRules = true
				_, err := svc.CreateRole(ctx, CreateRoleInput{
					Principal:   *admin,
					Code:        "operator",
					Name:        "Operator",
					Permissions: []string{"audit:read"},
				})
				return err
			},
		},
		{
			name: "update role permissions",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *loadRulesGateEnforcer) error {
				role, err := svc.CreateRole(ctx, CreateRoleInput{
					Principal:   *admin,
					Code:        "operator",
					Name:        "Operator",
					Permissions: []string{"audit:read"},
				})
				if err != nil {
					return err
				}
				gate.failLoadRules = true
				_, err = svc.UpdateRole(ctx, UpdateRoleInput{
					Principal:      *admin,
					RoleID:         role.ID,
					Name:           role.Name,
					Permissions:    []string{"user:read"},
					HasPermissions: true,
				})
				return err
			},
		},
		{
			name: "update user roles",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *loadRulesGateEnforcer) error {
				invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
				if err != nil {
					return err
				}
				member, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: "member", Password: "password123"})
				if err != nil {
					return err
				}
				gate.failLoadRules = true
				_, err = svc.UpdateUser(ctx, UpdateUserInput{
					Principal: *admin,
					UserID:    member.UserID,
					Roles:     []string{model.RoleAdmin},
					HasRoles:  true,
				})
				return err
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			svc, gate, cleanup := newTestServiceWithLoadRulesGate(t)
			defer cleanup()
			admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
			if err != nil {
				t.Fatalf("BootstrapAdmin() failed: %v", err)
			}

			err = tt.run(ctx, svc, admin, gate)
			if !errors.Is(err, gate.err) {
				t.Fatalf("%s error = %v, want %v", tt.name, err, gate.err)
			}
		})
	}
}

func TestListUsersReturnsRoleReadError(t *testing.T) {
	ctx := context.Background()
	svc, gate, cleanup := newTestServiceWithLoadRulesGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	gate.getRolesErr = errors.New("role read failed")

	if _, err := svc.ListUsers(ctx, *admin, UserListFilter{}); !errors.Is(err, gate.getRolesErr) {
		t.Fatalf("ListUsers() error = %v, want %v", err, gate.getRolesErr)
	}
}

func TestAccountStatePersistenceErrorsAreReturned(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	repoGate.saveUserErr = errors.New("save user failed")

	if _, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"}); !errors.Is(err, repoGate.saveUserErr) {
		t.Fatalf("Login() error = %v, want %v", err, repoGate.saveUserErr)
	}
}

func TestVerifyMFAReturnsFactorSaveError(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	secret, _, err := svc.SetupMFA(ctx, *admin)
	if err != nil {
		t.Fatalf("SetupMFA() failed: %v", err)
	}
	repoGate.saveMFAFactorErr = errors.New("save mfa factor failed")
	code := testsupport.IAMTOTPCode(t, secret, time.Now())

	if err := svc.VerifyMFA(ctx, *admin, code); !errors.Is(err, repoGate.saveMFAFactorErr) {
		t.Fatalf("VerifyMFA() error = %v, want %v", err, repoGate.saveMFAFactorErr)
	}
}

func TestListRolesReturnsPermissionHydrationError(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	repoGate.listRolePermissionsErr = errors.New("list role permissions failed")

	if _, err := svc.ListRoles(ctx, *admin); !errors.Is(err, repoGate.listRolePermissionsErr) {
		t.Fatalf("ListRoles() error = %v, want %v", err, repoGate.listRolePermissionsErr)
	}
}

func TestAuditErrorsAreReturnedForIAMMutations(t *testing.T) {
	tests := []struct {
		name string
		run  func(context.Context, Service, *Principal, *repositoryGate, error) error
	}{
		{
			name: "login",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"})
				return err
			},
		},
		{
			name: "update organization",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.UpdateOrganization(ctx, UpdateOrganizationInput{Principal: *admin, OrgID: admin.OrgID, Name: "Acme Updated"})
				return err
			},
		},
		{
			name: "invite user",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
				return err
			},
		},
		{
			name: "forgot password",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: admin.Email})
				return err
			},
		},
		{
			name: "reset password",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				reset, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: admin.Email})
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				return svc.ResetPassword(ctx, ResetPasswordInput{Token: reset.Token, NewPassword: "newpassword123"})
			},
		},
		{
			name: "revoke invitation",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				if _, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember}); err != nil {
					return err
				}
				invitation, err := latestInvitation(ctx, gate, admin.OrgID)
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				return svc.RevokeInvitation(ctx, *admin, invitation.ID, "", "")
			},
		},
		{
			name: "setup mfa",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, _, err := svc.SetupMFA(ctx, *admin)
				return err
			},
		},
		{
			name: "verify mfa",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				secret, _, err := svc.SetupMFA(ctx, *admin)
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				code := testsupport.IAMTOTPCode(t, secret, time.Now())
				return svc.VerifyMFA(ctx, *admin, code)
			},
		},
		{
			name: "update user status",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
				if err != nil {
					return err
				}
				member, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: "member", Password: "password123"})
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				_, err = svc.UpdateUser(ctx, UpdateUserInput{Principal: *admin, UserID: member.UserID, Status: ptrString(model.StatusDisabled)})
				return err
			},
		},
		{
			name: "update user roles",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
				if err != nil {
					return err
				}
				member, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: "member", Password: "password123"})
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				_, err = svc.UpdateUser(ctx, UpdateUserInput{Principal: *admin, UserID: member.UserID, Roles: []string{model.RoleAdmin}, HasRoles: true})
				return err
			},
		},
		{
			name: "create api token",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{Principal: *admin, UserID: admin.UserID, RoleCode: model.RolePlatformOwner, Days: 1})
				return err
			},
		},
		{
			name: "create role",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				gate.createAuditLogErr = auditErr
				_, err := svc.CreateRole(ctx, CreateRoleInput{Principal: *admin, Code: "operator", Name: "Operator", Permissions: []string{"audit:read"}})
				return err
			},
		},
		{
			name: "update role",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				role, err := svc.CreateRole(ctx, CreateRoleInput{Principal: *admin, Code: "operator", Name: "Operator", Permissions: []string{"audit:read"}})
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				_, err = svc.UpdateRole(ctx, UpdateRoleInput{Principal: *admin, RoleID: role.ID, Name: "Operator Plus", Permissions: []string{"user:read"}, HasPermissions: true})
				return err
			},
		},
		{
			name: "revoke api token",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				token, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{Principal: *admin, UserID: admin.UserID, RoleCode: model.RolePlatformOwner, Days: 1})
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				return svc.RevokeAPIToken(ctx, RevokeAPITokenInput{Principal: *admin, TokenID: token.Item.ID})
			},
		},
		{
			name: "revoke session",
			run: func(ctx context.Context, svc Service, admin *Principal, gate *repositoryGate, auditErr error) error {
				login, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"})
				if err != nil {
					return err
				}
				principal, err := svc.AuthenticateToken(ctx, login.AccessToken)
				if err != nil {
					return err
				}
				gate.createAuditLogErr = auditErr
				return svc.RevokeSession(ctx, RevokeSessionInput{Principal: *admin, SessionID: principal.SessionID})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
			defer cleanup()

			admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
			if err != nil {
				t.Fatalf("BootstrapAdmin() failed: %v", err)
			}
			auditErr := errors.New("create audit log failed")

			err = tt.run(ctx, svc, admin, repoGate, auditErr)
			if !errors.Is(err, auditErr) {
				t.Fatalf("%s error = %v, want %v", tt.name, err, auditErr)
			}
		})
	}
}

func TestAuditErrorsRollbackTransactionalIAMMutations(t *testing.T) {
	t.Run("login", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("Login() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		sessions, err := repoGate.ListSessionsByUser(ctx, admin.UserID)
		if err != nil {
			t.Fatalf("ListSessionsByUser() failed: %v", err)
		}
		if len(sessions) != 0 {
			t.Fatalf("login audit failure should rollback created session: %#v", sessions)
		}
		user, err := repoGate.FindUserByID(ctx, admin.UserID)
		if err != nil {
			t.Fatalf("FindUserByID() failed: %v", err)
		}
		if user.LastLoginAt != nil {
			t.Fatalf("login audit failure should rollback LastLoginAt, got %v", user.LastLoginAt)
		}
	})

	t.Run("update organization", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.UpdateOrganization(ctx, UpdateOrganizationInput{Principal: *admin, OrgID: admin.OrgID, Name: "Changed"}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("UpdateOrganization() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		org, err := repoGate.FindOrganizationByID(ctx, admin.OrgID)
		if err != nil {
			t.Fatalf("FindOrganizationByID() failed: %v", err)
		}
		if org.Name == "Changed" {
			t.Fatalf("organization name was committed despite audit failure")
		}
	})

	t.Run("invite user", func(t *testing.T) {
		ctx := context.Background()
		notifier := &recordingNotifier{}
		svc, repoGate, _, cleanup := newTestServiceWithRepositoryGateAndNotifier(t, RegistrationModeDirect, notifier)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("InviteUser() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		if notifier.invitation != nil {
			t.Fatalf("audit failure should not send invitation notice: %#v", notifier.invitation)
		}
		if _, err := latestInvitation(ctx, repoGate, admin.OrgID); !errors.Is(err, ErrNotFound) {
			t.Fatalf("latestInvitation() error = %v, want ErrNotFound", err)
		}
	})

	t.Run("forgot password", func(t *testing.T) {
		ctx := context.Background()
		notifier := &recordingNotifier{}
		svc, repoGate, _, cleanup := newTestServiceWithRepositoryGateAndNotifier(t, RegistrationModeDirect, notifier)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: admin.Email}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("ForgotPassword() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		if notifier.passwordReset != nil {
			t.Fatalf("audit failure should not send password reset notice: %#v", notifier.passwordReset)
		}
	})

	t.Run("user status", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, member := bootstrapMemberForAuditRollback(t, ctx, svc)
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.UpdateUser(ctx, UpdateUserInput{Principal: *admin, UserID: member.UserID, Status: ptrString(model.StatusDisabled)}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("UpdateUser(status) error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		membership, err := repoGate.FindMembershipAnyStatus(ctx, admin.OrgID, member.UserID)
		if err != nil {
			t.Fatalf("FindMembershipAnyStatus() failed: %v", err)
		}
		if membership.Status != model.StatusActive {
			t.Fatalf("membership status = %q, want %q", membership.Status, model.StatusActive)
		}
	})

	t.Run("revoke invitation", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		if _, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember}); err != nil {
			t.Fatalf("InviteUser() failed: %v", err)
		}
		invitation, err := latestInvitation(ctx, repoGate, admin.OrgID)
		if err != nil {
			t.Fatalf("latestInvitation() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if err := svc.RevokeInvitation(ctx, *admin, invitation.ID, "", ""); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("RevokeInvitation() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		invitation, err = repoGate.FindInvitationByID(ctx, invitation.ID)
		if err != nil {
			t.Fatalf("FindInvitationByID() failed: %v", err)
		}
		if invitation.Status != model.StatusPending {
			t.Fatalf("invitation status = %q, want %q", invitation.Status, model.StatusPending)
		}
	})

	t.Run("reset password", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		reset, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: admin.Email})
		if err != nil {
			t.Fatalf("ForgotPassword() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if err := svc.ResetPassword(ctx, ResetPasswordInput{Token: reset.Token, NewPassword: "newpassword123"}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("ResetPassword() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		repoGate.createAuditLogErr = nil
		if _, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"}); err != nil {
			t.Fatalf("old password should remain valid after rollback: %v", err)
		}
		if _, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "newpassword123", OrgCode: "acme"}); !errors.Is(err, ErrUnauthorized) {
			t.Fatalf("new password should not be committed, error = %v", err)
		}
	})

	t.Run("setup mfa", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, _, err := svc.SetupMFA(ctx, *admin); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("SetupMFA() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		if _, err := repoGate.FindActiveMFAFactor(ctx, admin.UserID); !errors.Is(err, ErrNotFound) {
			t.Fatalf("FindActiveMFAFactor() error = %v, want ErrNotFound", err)
		}
	})

	t.Run("verify mfa", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		secret, _, err := svc.SetupMFA(ctx, *admin)
		if err != nil {
			t.Fatalf("SetupMFA() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		code := testsupport.IAMTOTPCode(t, secret, time.Now())
		if err := svc.VerifyMFA(ctx, *admin, code); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("VerifyMFA() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		user, err := repoGate.FindUserByID(ctx, admin.UserID)
		if err != nil {
			t.Fatalf("FindUserByID() failed: %v", err)
		}
		if user.MFAEnabled {
			t.Fatal("MFAEnabled was committed despite audit failure")
		}
		factor, err := repoGate.FindActiveMFAFactor(ctx, admin.UserID)
		if err != nil {
			t.Fatalf("FindActiveMFAFactor() failed: %v", err)
		}
		if factor.ConfirmedAt != nil {
			t.Fatalf("MFA factor confirmation committed despite audit failure: %v", factor.ConfirmedAt)
		}
	})

	t.Run("create api token", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{Principal: *admin, UserID: admin.UserID, RoleCode: model.RolePlatformOwner, Days: 1}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("CreateAPIToken() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		_, total, err := repoGate.ListAPITokens(ctx, admin.OrgID, APITokenFilter{Now: time.Now()})
		if err != nil {
			t.Fatalf("ListAPITokens() failed: %v", err)
		}
		if total != 0 {
			t.Fatalf("api token was committed despite audit failure, total=%d", total)
		}
	})

	t.Run("revoke api token", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		token, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{Principal: *admin, UserID: admin.UserID, RoleCode: model.RolePlatformOwner, Days: 1})
		if err != nil {
			t.Fatalf("CreateAPIToken() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if err := svc.RevokeAPIToken(ctx, RevokeAPITokenInput{Principal: *admin, TokenID: token.Item.ID}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("RevokeAPIToken() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		apiToken, err := repoGate.FindAPITokenByID(ctx, token.Item.ID)
		if err != nil {
			t.Fatalf("FindAPITokenByID() failed: %v", err)
		}
		if apiToken.Status != model.StatusActive || apiToken.RevokedAt != nil {
			t.Fatalf("api token revoke committed despite audit failure: %#v", apiToken)
		}
	})

	t.Run("revoke session", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		login, err := svc.Login(ctx, LoginInput{Identifier: admin.Email, Password: "password123", OrgCode: "acme"})
		if err != nil {
			t.Fatalf("Login() failed: %v", err)
		}
		principal, err := svc.AuthenticateToken(ctx, login.AccessToken)
		if err != nil {
			t.Fatalf("AuthenticateToken() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if err := svc.RevokeSession(ctx, RevokeSessionInput{Principal: *admin, SessionID: principal.SessionID}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("RevokeSession() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		session, err := repoGate.FindSessionByID(ctx, principal.SessionID)
		if err != nil {
			t.Fatalf("FindSessionByID() failed: %v", err)
		}
		if session.RevokedAt != nil {
			t.Fatalf("session revoke committed despite audit failure: %#v", session)
		}
	})

	t.Run("create role", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.CreateRole(ctx, CreateRoleInput{Principal: *admin, Code: "operator", Name: "Operator", Permissions: []string{"audit:read"}}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("CreateRole() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		if _, err := repoGate.FindRole(ctx, admin.OrgID, "operator"); !errors.Is(err, ErrNotFound) {
			t.Fatalf("FindRole(operator) error = %v, want ErrNotFound", err)
		}
	})

	t.Run("update role", func(t *testing.T) {
		ctx := context.Background()
		svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
		defer cleanup()

		admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
		if err != nil {
			t.Fatalf("BootstrapAdmin() failed: %v", err)
		}
		role, err := svc.CreateRole(ctx, CreateRoleInput{Principal: *admin, Code: "operator", Name: "Operator", Permissions: []string{"audit:read"}})
		if err != nil {
			t.Fatalf("CreateRole() failed: %v", err)
		}
		repoGate.createAuditLogErr = errors.New("create audit log failed")
		if _, err := svc.UpdateRole(ctx, UpdateRoleInput{Principal: *admin, RoleID: role.ID, Name: "Changed", Permissions: []string{"user:read"}, HasPermissions: true}); !errors.Is(err, repoGate.createAuditLogErr) {
			t.Fatalf("UpdateRole() error = %v, want %v", err, repoGate.createAuditLogErr)
		}
		updated, err := repoGate.FindRoleByID(ctx, role.ID)
		if err != nil {
			t.Fatalf("FindRoleByID() failed: %v", err)
		}
		if updated.Name != "Operator" {
			t.Fatalf("role name = %q, want Operator", updated.Name)
		}
	})
}

func TestAuditMetadataMarshalErrorIsReturned(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}

	err = svc.RecordAudit(ctx, *admin, "test.audit", "test", "1", "", "", map[string]any{"unsupported": make(chan int)})
	var unsupported *json.UnsupportedTypeError
	if !errors.As(err, &unsupported) {
		t.Fatalf("RecordAudit() error = %v, want json.UnsupportedTypeError", err)
	}
}

func TestSMTPNotificationDriverDoesNotExposeDebugDelivery(t *testing.T) {
	ctx := context.Background()
	notifier := &recordingNotifier{}
	svc, _, _, cleanup := newTestServiceWithNotifier(t, RegistrationModeDirect, notifier, func(cfg *Config) {
		cfg.NotificationDriver = "smtp"
	})
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser() failed: %v", err)
	}
	if invite.Debug || invite.Token != "" || invite.URL != "" {
		t.Fatalf("smtp invitation should not expose debug delivery: %#v", invite)
	}
	if notifier.invitation == nil || notifier.invitation.Token == "" {
		t.Fatalf("notifier did not receive invitation notice: %#v", notifier.invitation)
	}

	reset, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: "admin@example.com"})
	if err != nil {
		t.Fatalf("ForgotPassword() failed: %v", err)
	}
	if reset.Debug || reset.Token != "" || reset.URL != "" {
		t.Fatalf("smtp password reset should not expose debug delivery: %#v", reset)
	}
	if notifier.passwordReset == nil || notifier.passwordReset.Token == "" {
		t.Fatalf("notifier did not receive password reset notice: %#v", notifier.passwordReset)
	}
}

func TestReloadNotificationRuntimeStopsDebugDelivery(t *testing.T) {
	ctx := context.Background()
	reloadable := NewReloadableNotifier(NoopNotifier{})
	svc, _, _, cleanup := newTestServiceWithNotifier(t, RegistrationModeDirect, reloadable)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	debugInvite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "debug@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser(debug) failed: %v", err)
	}
	if !debugInvite.Debug || debugInvite.Token == "" || debugInvite.URL == "" {
		t.Fatalf("expected debug delivery before reload, got %#v", debugInvite)
	}

	notifier := &recordingNotifier{}
	reloadable.Replace(notifier)
	reloader, ok := svc.(NotificationRuntimeReloader)
	if !ok {
		t.Fatal("service does not implement NotificationRuntimeReloader")
	}
	reloader.ReloadNotificationRuntime(NotificationRuntimeConfig{NotificationDriver: "smtp", PublicBaseURL: "/admin"})

	smtpInvite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "smtp@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser(smtp) failed: %v", err)
	}
	if smtpInvite.Debug || smtpInvite.Token != "" || smtpInvite.URL != "" {
		t.Fatalf("expected no debug delivery after smtp reload, got %#v", smtpInvite)
	}
	if notifier.invitation == nil || notifier.invitation.Email != "smtp@example.com" {
		t.Fatalf("reloaded notifier did not receive smtp invitation: %#v", notifier.invitation)
	}
}

func TestForgotPasswordQueuesOutboxWhenNotificationFails(t *testing.T) {
	ctx := context.Background()
	current := time.Date(2026, 6, 23, 10, 0, 0, 0, time.UTC)
	notifier := &switchableNotifier{err: errors.New("smtp down")}
	svc, repo, deps, cleanup := newTestServiceWithNotifier(t, RegistrationModeDirect, notifier, func(cfg *Config) {
		cfg.Now = func() time.Time { return current }
		cfg.NotificationRetryInterval = time.Minute
		cfg.NotificationRetryMaxAttempts = 3
	})
	defer cleanup()

	if _, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	}); err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	delivery, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: "admin@example.com"})
	if !errors.Is(err, ErrNotificationDelivery) {
		t.Fatalf("ForgotPassword() error = %v, want ErrNotificationDelivery", err)
	}
	if delivery.Token != "" || delivery.URL != "" {
		t.Fatalf("smtp failure should not expose debug delivery: %#v", delivery)
	}
	if notifier.passwordReset == nil || notifier.passwordReset.Token == "" {
		t.Fatalf("notifier did not receive password reset notice: %#v", notifier.passwordReset)
	}
	reset, err := repo.FindPasswordResetByTokenHash(ctx, deps.Tokens.HashRefreshToken(notifier.passwordReset.Token))
	if err != nil {
		t.Fatalf("FindPasswordResetByTokenHash() failed: %v", err)
	}
	if reset.Status != model.StatusPending {
		t.Fatalf("password reset status = %q, want %q", reset.Status, model.StatusPending)
	}
	notifier.err = nil
	current = current.Add(time.Minute + time.Second)
	result, err := svc.DispatchNotificationOutbox(ctx, NotificationOutboxDispatchInput{Limit: 10})
	if err != nil {
		t.Fatalf("DispatchNotificationOutbox() failed: %v", err)
	}
	if result.Sent != 1 || result.Scanned != 1 {
		t.Fatalf("dispatch result = %#v, want one sent item", result)
	}
	if err := svc.ResetPassword(ctx, ResetPasswordInput{Token: notifier.passwordReset.Token, NewPassword: "newpassword123"}); err != nil {
		t.Fatalf("ResetPassword(after retry) failed: %v", err)
	}
}

func TestForgotPasswordKeepsEmptySuccessForUnknownEmail(t *testing.T) {
	ctx := context.Background()
	notifier := &failingNotifier{err: errors.New("smtp down")}
	svc, cleanup := newTestServiceWithCustomNotifier(t, notifier)
	defer cleanup()

	delivery, err := svc.ForgotPassword(ctx, ForgotPasswordInput{Email: "missing@example.com"})
	if err != nil {
		t.Fatalf("ForgotPassword(unknown email) failed: %v", err)
	}
	if delivery.Token != "" || delivery.URL != "" {
		t.Fatalf("unknown email should return empty delivery: %#v", delivery)
	}
	if notifier.invitation != nil || notifier.passwordReset != nil {
		t.Fatalf("notifier should not be called for unknown email: %#v", notifier)
	}
}

func TestListOrganizationsFiltersAndPaginates(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "core",
		OrgName:  "Core Org",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	if _, err := svc.CreateOrganization(ctx, *admin, "alpha", "Alpha Team"); err != nil {
		t.Fatalf("CreateOrganization(alpha) failed: %v", err)
	}
	if _, err := svc.CreateOrganization(ctx, *admin, "beta", "Beta Team"); err != nil {
		t.Fatalf("CreateOrganization(beta) failed: %v", err)
	}
	if _, err := svc.CreateOrganization(ctx, *admin, "support", "Support Desk"); err != nil {
		t.Fatalf("CreateOrganization(support) failed: %v", err)
	}

	firstPage, err := svc.ListOrganizations(ctx, *admin, OrganizationListFilter{
		Keyword:  "team",
		OrderKey: "code",
		Page:     1,
		PageSize: 1,
	})
	if err != nil {
		t.Fatalf("ListOrganizations(page 1) failed: %v", err)
	}
	if firstPage.Total != 2 || firstPage.Page != 1 || firstPage.PageSize != 1 || len(firstPage.Items) != 1 || firstPage.Items[0].Code != "alpha" || firstPage.StorageStatus != "persisted" {
		t.Fatalf("unexpected first page: %#v", firstPage)
	}

	secondPage, err := svc.ListOrganizations(ctx, *admin, OrganizationListFilter{
		Keyword:  "team",
		OrderKey: "code",
		Page:     2,
		PageSize: 1,
	})
	if err != nil {
		t.Fatalf("ListOrganizations(page 2) failed: %v", err)
	}
	if len(secondPage.Items) != 1 || secondPage.Items[0].Code != "beta" {
		t.Fatalf("unexpected second page: %#v", secondPage)
	}

	filtered, err := svc.ListOrganizations(ctx, *admin, OrganizationListFilter{
		Code:     "sup",
		Name:     "desk",
		Status:   model.StatusActive,
		OrderKey: "name",
		Desc:     true,
	})
	if err != nil {
		t.Fatalf("ListOrganizations(filtered) failed: %v", err)
	}
	if filtered.Total != 1 || len(filtered.Items) != 1 || filtered.Items[0].Code != "support" {
		t.Fatalf("unexpected filtered organizations: %#v", filtered)
	}
}

func TestInitialAdminSetupCreatesPlatformOwnerAndClosesSetup(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestServiceWithRegistrationMode(t, RegistrationModeDisabled)
	defer cleanup()

	status, err := svc.SetupStatus(ctx)
	if err != nil {
		t.Fatalf("SetupStatus() failed: %v", err)
	}
	if !status.Required {
		t.Fatal("SetupStatus().Required = false, want true for empty IAM users")
	}

	pair, err := svc.InitialAdminSetup(ctx, InitialAdminSetupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("InitialAdminSetup() failed: %v", err)
	}
	principal, err := svc.AuthenticateToken(ctx, pair.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(initial setup token) failed: %v", err)
	}
	for _, tc := range []struct {
		scope string
		obj   string
		act   string
	}{
		{scope: model.PermissionScopeTenant, obj: "audit", act: "read"},
		{scope: model.PermissionScopeTenant, obj: "session", act: "read"},
		{scope: model.PermissionScopePlatform, obj: "org", act: "read"},
		{scope: model.PermissionScopeTenant, obj: "user", act: "read"},
	} {
		allowed, err := svc.Authorize(ctx, principal, permissionContext(tc.scope, tc.obj, tc.act))
		if err != nil || !allowed {
			t.Fatalf("initial platform owner should %s:%s, allowed=%v err=%v", tc.obj, tc.act, allowed, err)
		}
	}
	token, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{
		Principal: principal,
		UserID:    principal.UserID,
		RoleCode:  model.RolePlatformOwner,
		Days:      1,
	})
	if err != nil {
		t.Fatalf("CreateAPIToken(platform_owner) failed: %v", err)
	}
	if token.Token == "" || token.Item.RoleCode != model.RolePlatformOwner {
		t.Fatalf("unexpected platform owner token: %#v", token)
	}
	orgs, err := svc.ListMyOrganizations(ctx, principal)
	if err != nil || len(orgs) != 1 || orgs[0].Code != "acme" {
		t.Fatalf("unexpected setup organizations: %#v err=%v", orgs, err)
	}
	status, err = svc.SetupStatus(ctx)
	if err != nil {
		t.Fatalf("SetupStatus(after setup) failed: %v", err)
	}
	if status.Required {
		t.Fatal("SetupStatus().Required = true after initial setup, want false")
	}
	if _, err := svc.InitialAdminSetup(ctx, InitialAdminSetupInput{OrgCode: "other", OrgName: "Other", Username: "other", Email: "other@example.com", Password: "password123"}); !errors.Is(err, ErrSetupCompleted) {
		t.Fatalf("second InitialAdminSetup() error = %v, want ErrSetupCompleted", err)
	}
}

func TestAuthenticateAPITokenReturnsLastUsedSaveError(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	token, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{
		Principal: *admin,
		UserID:    admin.UserID,
		RoleCode:  model.RolePlatformOwner,
		Days:      1,
	})
	if err != nil {
		t.Fatalf("CreateAPIToken() failed: %v", err)
	}

	repoGate.saveAPITokenErr = errors.New("save api token failed")
	if _, err := svc.AuthenticateToken(ctx, token.Token); !errors.Is(err, repoGate.saveAPITokenErr) {
		t.Fatalf("AuthenticateToken(api token) error = %v, want %v", err, repoGate.saveAPITokenErr)
	}
}

func TestListAPITokensReturnsUserHydrationError(t *testing.T) {
	ctx := context.Background()
	svc, repoGate, cleanup := newTestServiceWithRepositoryGate(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	if _, err := svc.CreateAPIToken(ctx, CreateAPITokenInput{
		Principal: *admin,
		UserID:    admin.UserID,
		RoleCode:  model.RolePlatformOwner,
		Days:      1,
	}); err != nil {
		t.Fatalf("CreateAPIToken() failed: %v", err)
	}

	repoGate.findUserByIDErr = errors.New("find api token user failed")
	if _, err := svc.ListAPITokens(ctx, *admin, APITokenFilter{}); !errors.Is(err, repoGate.findUserByIDErr) {
		t.Fatalf("ListAPITokens() error = %v, want %v", err, repoGate.findUserByIDErr)
	}
}

func TestSetupStatusIncludesPasswordPolicyAndPasswordErrorExplainsRules(t *testing.T) {
	ctx := context.Background()
	policy := PasswordPolicy{
		MinLength:     10,
		RequireLower:  true,
		RequireUpper:  true,
		RequireNumber: true,
	}
	svc, cleanup := newTestServiceWithRegistrationMode(t, RegistrationModeDisabled, func(cfg *Config) {
		cfg.PasswordPolicy = policy
	})
	defer cleanup()

	status, err := svc.SetupStatus(ctx)
	if err != nil {
		t.Fatalf("SetupStatus() failed: %v", err)
	}
	if status.PasswordPolicy.MinLength != 10 || !status.PasswordPolicy.RequireLower || !status.PasswordPolicy.RequireUpper || !status.PasswordPolicy.RequireNumber || status.PasswordPolicy.RequireSymbol {
		t.Fatalf("unexpected setup password policy: %#v", status.PasswordPolicy)
	}

	_, err = svc.InitialAdminSetup(ctx, InitialAdminSetupInput{
		OrgCode:  "acme",
		OrgName:  "Acme",
		Username: "admin",
		Email:    "admin@example.com",
		Password: "password123",
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("InitialAdminSetup() error = %v, want ErrInvalidInput", err)
	}
	for _, want := range []string{"密码必须", "至少 10 位", "包含小写字母", "包含大写字母", "包含数字"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("password policy error missing %q: %v", want, err)
		}
	}
}

func TestSignupDisabled(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestServiceWithRegistrationMode(t, RegistrationModeDisabled)
	defer cleanup()

	_, err := svc.Signup(ctx, SignupInput{OrgCode: "acme", OrgName: "Acme", Username: "owner", Email: "owner@example.com", Password: "password123"})
	if err != ErrSignupDisabled {
		t.Fatalf("Signup() error = %v, want ErrSignupDisabled", err)
	}
}

func TestCreateOrganizationAddsCurrentUserAsOwner(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	login, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"})
	if err != nil {
		t.Fatalf("Login() failed: %v", err)
	}
	principal, err := svc.AuthenticateToken(ctx, login.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken() failed: %v", err)
	}
	org, err := svc.CreateOrganization(ctx, principal, "beta", "Beta")
	if err != nil {
		t.Fatalf("CreateOrganization() failed: %v", err)
	}
	switched, err := svc.SwitchOrg(ctx, principal, org.ID, "", "")
	if err != nil {
		t.Fatalf("SwitchOrg(created org) failed: %v", err)
	}
	newPrincipal, err := svc.AuthenticateToken(ctx, switched.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(new org) failed: %v", err)
	}
	if newPrincipal.UserID != admin.UserID || newPrincipal.OrgID != org.ID {
		t.Fatalf("unexpected switched principal: %#v", newPrincipal)
	}
	allowed, err := svc.Authorize(ctx, newPrincipal, permissionContext(model.PermissionScopeTenant, "role", "create"))
	if err != nil || !allowed {
		t.Fatalf("created org owner should create roles, allowed=%v err=%v", allowed, err)
	}
}

func TestListUsersFiltersAndPaginates(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	for _, input := range []struct {
		email    string
		username string
		roleCode string
	}{
		{email: "alice@example.com", username: "alice", roleCode: model.RoleMember},
		{email: "bob@example.com", username: "bob", roleCode: model.RoleAdmin},
	} {
		invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: input.email, RoleCode: input.roleCode})
		if err != nil {
			t.Fatalf("InviteUser(%s) failed: %v", input.email, err)
		}
		if _, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: input.username, Password: "password123"}); err != nil {
			t.Fatalf("AcceptInvitation(%s) failed: %v", input.email, err)
		}
	}

	all, err := svc.ListUsers(ctx, *admin, UserListFilter{Page: 1, PageSize: 2, Desc: true})
	if err != nil {
		t.Fatalf("ListUsers() failed: %v", err)
	}
	if all.Total != 3 || len(all.Items) != 2 || all.Page != 1 || all.PageSize != 2 {
		t.Fatalf("unexpected first page: %#v", all)
	}

	memberPage, err := svc.ListUsers(ctx, *admin, UserListFilter{RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("ListUsers(member) failed: %v", err)
	}
	if memberPage.Total != 1 || memberPage.Items[0].User.Username != "alice" {
		t.Fatalf("unexpected member filter page: %#v", memberPage)
	}

	keywordPage, err := svc.ListUsers(ctx, *admin, UserListFilter{Keyword: "bob"})
	if err != nil {
		t.Fatalf("ListUsers(keyword) failed: %v", err)
	}
	if keywordPage.Total != 1 || keywordPage.Items[0].User.Email != "bob@example.com" {
		t.Fatalf("unexpected keyword filter page: %#v", keywordPage)
	}

	if _, err := svc.UpdateUser(ctx, UpdateUserInput{Principal: *admin, UserID: keywordPage.Items[0].User.ID, Status: ptrString(model.StatusDisabled)}); err != nil {
		t.Fatalf("UpdateUser(disable bob) failed: %v", err)
	}
	disabledPage, err := svc.ListUsers(ctx, *admin, UserListFilter{Status: model.StatusDisabled})
	if err != nil {
		t.Fatalf("ListUsers(disabled) failed: %v", err)
	}
	if disabledPage.Total != 1 || disabledPage.Items[0].User.Username != "bob" {
		t.Fatalf("unexpected disabled filter page: %#v", disabledPage)
	}
}

func TestListSessionsFiltersPaginatesAndScopesOrganization(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()

	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	adminLogin, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme", IPAddress: "127.0.0.1", UserAgent: "Edge"})
	if err != nil {
		t.Fatalf("Login(admin) failed: %v", err)
	}
	principal, err := svc.AuthenticateToken(ctx, adminLogin.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(admin) failed: %v", err)
	}
	invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: principal, Email: "member@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser() failed: %v", err)
	}
	if _, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: "member", Password: "password123"}); err != nil {
		t.Fatalf("AcceptInvitation() failed: %v", err)
	}
	memberLogin, err := svc.Login(ctx, LoginInput{Identifier: "member@example.com", Password: "password123", OrgCode: "acme", IPAddress: "10.0.0.2", UserAgent: "Firefox", ProductCode: principal.ProductCode, ClientType: "mobile_web"})
	if err != nil {
		t.Fatalf("Login(member) failed: %v", err)
	}
	memberPrincipal, err := svc.AuthenticateToken(ctx, memberLogin.AccessToken)
	if err != nil {
		t.Fatalf("AuthenticateToken(member) failed: %v", err)
	}
	loginLogs, err := svc.ListAuditLogs(ctx, principal, AuditLogFilter{Action: "auth.login", Limit: 10})
	if err != nil {
		t.Fatalf("ListAuditLogs(auth.login) failed: %v", err)
	}
	foundMemberLoginAudit := false
	for _, log := range loginLogs {
		if log.UserID != nil && *log.UserID == memberPrincipal.UserID {
			foundMemberLoginAudit = true
			if log.ProductCode != principal.ProductCode || log.ClientType != "mobile_web" {
				t.Fatalf("expected login audit to carry product and client type: %#v", log)
			}
		}
	}
	if !foundMemberLoginAudit {
		t.Fatalf("expected member login audit in logs: %#v", loginLogs)
	}
	beta, err := svc.CreateOrganization(ctx, principal, "beta", "Beta")
	if err != nil {
		t.Fatalf("CreateOrganization(beta) failed: %v", err)
	}
	if _, err := svc.SwitchOrg(ctx, principal, beta.ID, "Safari", "172.16.0.1"); err != nil {
		t.Fatalf("SwitchOrg(beta) failed: %v", err)
	}

	ownPage, err := svc.ListSessions(ctx, principal, SessionListFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSessions(own) failed: %v", err)
	}
	if ownPage.Total != 1 || len(ownPage.Items) != 1 || ownPage.Items[0].UserID != admin.UserID || ownPage.Items[0].OrgID != principal.OrgID {
		t.Fatalf("unexpected own sessions: %#v", ownPage)
	}

	orgPage, err := svc.ListSessions(ctx, principal, SessionListFilter{Scope: "org", Keyword: "fire", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSessions(org keyword) failed: %v", err)
	}
	if orgPage.Total != 1 || len(orgPage.Items) != 1 || orgPage.Items[0].UserID != memberPrincipal.UserID || orgPage.Items[0].OrgID != principal.OrgID {
		t.Fatalf("unexpected org keyword sessions: %#v", orgPage)
	}
	if orgPage.Items[0].ProductCode != principal.ProductCode || orgPage.Items[0].ClientType != "mobile_web" {
		t.Fatalf("expected member session to carry product and client type: %#v", orgPage.Items[0])
	}

	mobilePage, err := svc.ListSessions(ctx, principal, SessionListFilter{Scope: "org", ProductCode: principal.ProductCode, ClientType: "mobile_web", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSessions(org platform) failed: %v", err)
	}
	if mobilePage.Total != 1 || len(mobilePage.Items) != 1 || mobilePage.Items[0].UserID != memberPrincipal.UserID {
		t.Fatalf("unexpected platform-filtered sessions: %#v", mobilePage)
	}

	platformKeywordPage, err := svc.ListSessions(ctx, principal, SessionListFilter{Scope: "org", Keyword: "mobile_web", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSessions(org platform keyword) failed: %v", err)
	}
	if platformKeywordPage.Total != 1 || len(platformKeywordPage.Items) != 1 || platformKeywordPage.Items[0].UserID != memberPrincipal.UserID {
		t.Fatalf("unexpected platform keyword sessions: %#v", platformKeywordPage)
	}

	adminOrgSessions, err := svc.ListSessions(ctx, principal, SessionListFilter{UserID: admin.UserID, Scope: "org", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSessions(admin user) failed: %v", err)
	}
	if adminOrgSessions.Total != 1 || len(adminOrgSessions.Items) != 1 || adminOrgSessions.Items[0].OrgID != principal.OrgID {
		t.Fatalf("expected beta session to be filtered out: %#v", adminOrgSessions)
	}

	if err := svc.RevokeSession(ctx, RevokeSessionInput{Principal: principal, SessionID: adminOrgSessions.Items[0].ID}); err != nil {
		t.Fatalf("RevokeSession() failed: %v", err)
	}
	revokedPage, err := svc.ListSessions(ctx, principal, SessionListFilter{Scope: "org", Status: "revoked"})
	if err != nil {
		t.Fatalf("ListSessions(revoked) failed: %v", err)
	}
	if revokedPage.Total != 1 || len(revokedPage.Items) != 1 || revokedPage.Items[0].ID != adminOrgSessions.Items[0].ID {
		t.Fatalf("unexpected revoked sessions: %#v", revokedPage)
	}
}

func TestMFASetupAndLogin(t *testing.T) {
	ctx := context.Background()
	svc, cleanup := newTestService(t)
	defer cleanup()
	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	secret, _, err := svc.SetupMFA(ctx, *admin)
	if err != nil {
		t.Fatalf("SetupMFA() failed: %v", err)
	}
	oldCode := testsupport.IAMTOTPCode(t, secret, time.Now())
	secret, _, err = svc.SetupMFA(ctx, *admin)
	if err != nil {
		t.Fatalf("second SetupMFA() failed: %v", err)
	}
	if err := svc.VerifyMFA(ctx, *admin, oldCode); err == nil {
		t.Fatal("VerifyMFA() should reject code from replaced setup secret")
	}
	code := testsupport.IAMTOTPCode(t, secret, time.Now())
	if err := svc.VerifyMFA(ctx, *admin, code); err != nil {
		t.Fatalf("VerifyMFA() failed: %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"}); err != ErrMFARequired {
		t.Fatalf("expected ErrMFARequired, got %v", err)
	}
	code = testsupport.IAMTOTPCode(t, secret, time.Now())
	if _, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme", MFACode: code}); err != nil {
		t.Fatalf("MFA login failed: %v", err)
	}
}

func TestLoginCaptchaWhenEnabled(t *testing.T) {
	svc, cleanup := newTestServiceWithRegistrationMode(t, RegistrationModeDirect, func(cfg *Config) {
		cfg.CaptchaEnabled = true
		cfg.CaptchaTTL = time.Minute
	})
	defer cleanup()
	ctx := context.Background()

	if _, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", Username: "admin", Email: "admin@example.com", Password: "password123"}); err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}

	challenge, err := svc.Captcha(ctx)
	if err != nil {
		t.Fatalf("Captcha() error = %v", err)
	}
	if !challenge.Enabled || challenge.CaptchaID == "" || !strings.HasPrefix(challenge.Image, "data:image/svg+xml;base64,") {
		t.Fatalf("unexpected captcha challenge: %#v", challenge)
	}
	if _, err := svc.Login(ctx, LoginInput{Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"}); !errors.Is(err, ErrCaptchaRequired) {
		t.Fatalf("expected captcha required error, got %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{CaptchaID: challenge.CaptchaID, CaptchaCode: "bad", Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"}); !errors.Is(err, ErrCaptchaInvalid) {
		t.Fatalf("expected captcha invalid error, got %v", err)
	}

	challenge, err = svc.Captcha(ctx)
	if err != nil {
		t.Fatalf("Captcha() second error = %v", err)
	}
	answer := captchaAnswer(t, challenge.Image)
	if _, err := svc.Login(ctx, LoginInput{CaptchaID: challenge.CaptchaID, CaptchaCode: answer, Identifier: "admin@example.com", Password: "password123", OrgCode: "acme"}); err != nil {
		t.Fatalf("Login() with captcha failed: %v", err)
	}
}

func newTestService(t *testing.T) (Service, func()) {
	return newTestServiceWithRegistrationMode(t, RegistrationModeDirect)
}

type testServiceOption func(*Config)

func newTestServiceWithRegistrationMode(t *testing.T, registrationMode string, options ...testServiceOption) (Service, func()) {
	svc, _, _, cleanup := newTestServiceWithNotifier(t, registrationMode, NoopNotifier{}, options...)
	return svc, cleanup
}

func newTestServiceWithCustomNotifier(t *testing.T, notifier Notifier, options ...testServiceOption) (Service, func()) {
	svc, _, _, cleanup := newTestServiceWithNotifier(t, RegistrationModeDirect, notifier, options...)
	return svc, cleanup
}

func newTestServiceWithNotifier(t *testing.T, registrationMode string, notifier Notifier, options ...testServiceOption) (Service, Repository, testsupport.IAMDeps, func()) {
	return newTestServiceWithConfiguredDeps(t, registrationMode, notifier, nil, options...)
}

func newTestServiceWithConfiguredDeps(t *testing.T, registrationMode string, notifier Notifier, configureDeps func(*testsupport.IAMDeps), options ...testServiceOption) (Service, Repository, testsupport.IAMDeps, func()) {
	t.Helper()
	moduleDB := testsupport.IAMSQLiteDatabase(t, "iam.db")
	deps := testsupport.NewIAMDeps(t)
	if configureDeps != nil {
		configureDeps(&deps)
	}
	repo := repository.New(moduleDB)
	cfg := Config{
		RegistrationMode:     registrationMode,
		MFAIssuer:            "console-platform-test",
		MFASecretKey:         "01234567890123456789012345678901",
		LoginMaxFailures:     3,
		LoginLockDuration:    time.Minute,
		InvitationTTL:        time.Hour,
		EmailVerificationTTL: time.Hour,
		PasswordResetTTL:     time.Hour,
		NotificationDriver:   "debug",
		PublicBaseURL:        "/admin",
	}
	for _, option := range options {
		option(&cfg)
	}
	svc := New(repo, deps.Passwords, deps.Tokens, deps.Authz, deps.IDs, deps.TOTP, cfg, notifier)
	return svc, repo, deps, func() {}
}

func newTestServiceWithLoadRulesGate(t *testing.T) (Service, *loadRulesGateEnforcer, func()) {
	t.Helper()
	gate := &loadRulesGateEnforcer{err: errors.New("policy reload failed")}
	svc, _, _, cleanup := newTestServiceWithConfiguredDeps(t, RegistrationModeDirect, NoopNotifier{}, func(deps *testsupport.IAMDeps) {
		gate.AuthorizerEnforcer = deps.Authz
		deps.Authz = gate
	})
	return svc, gate, cleanup
}

type loadRulesGateEnforcer struct {
	AuthorizerEnforcer
	err           error
	failLoadRules bool
	getRolesErr   error
}

func (e *loadRulesGateEnforcer) LoadRules(ctx context.Context, rules []AuthorizationRule) error {
	if e.failLoadRules {
		return e.err
	}
	return e.AuthorizerEnforcer.LoadRules(ctx, rules)
}

func (e *loadRulesGateEnforcer) GetRolesForUser(ctx context.Context, user string, domain string) ([]string, error) {
	if e.getRolesErr != nil {
		return nil, e.getRolesErr
	}
	return e.AuthorizerEnforcer.GetRolesForUser(ctx, user, domain)
}

func newTestServiceWithRepositoryGate(t *testing.T) (Service, *repositoryGate, func()) {
	svc, gate, _, cleanup := newTestServiceWithRepositoryGateAndConfig(t, RegistrationModeDirect)
	return svc, gate, cleanup
}

func newTestServiceWithRepositoryGateAndConfig(t *testing.T, registrationMode string, options ...testServiceOption) (Service, *repositoryGate, testsupport.IAMDeps, func()) {
	return newTestServiceWithRepositoryGateAndNotifier(t, registrationMode, NoopNotifier{}, options...)
}

func newTestServiceWithRepositoryGateAndNotifier(t *testing.T, registrationMode string, notifier Notifier, options ...testServiceOption) (Service, *repositoryGate, testsupport.IAMDeps, func()) {
	t.Helper()
	moduleDB := testsupport.IAMSQLiteDatabase(t, "iam.db")
	deps := testsupport.NewIAMDeps(t)
	gate := &repositoryGate{Repository: repository.New(moduleDB)}
	cfg := Config{
		RegistrationMode:     registrationMode,
		MFAIssuer:            "console-platform-test",
		MFASecretKey:         "01234567890123456789012345678901",
		LoginMaxFailures:     3,
		LoginLockDuration:    time.Minute,
		InvitationTTL:        time.Hour,
		EmailVerificationTTL: time.Hour,
		PasswordResetTTL:     time.Hour,
		NotificationDriver:   "debug",
		PublicBaseURL:        "/admin",
	}
	for _, option := range options {
		option(&cfg)
	}
	svc := New(gate, deps.Passwords, deps.Tokens, deps.Authz, deps.IDs, deps.TOTP, cfg, notifier)
	return svc, gate, deps, func() {}
}

type repositoryGate struct {
	Repository
	saveUserErr              error
	saveAPITokenErr          error
	findUserByIDErr          error
	saveEmailVerificationErr error
	saveMFAFactorErr         error
	listRolePermissionsErr   error
	createAuditLogErr        error
}

func (r *repositoryGate) SaveUser(ctx context.Context, user *model.User) error {
	if r.saveUserErr != nil {
		return r.saveUserErr
	}
	return r.Repository.SaveUser(ctx, user)
}

func (r *repositoryGate) SaveAPIToken(ctx context.Context, token *model.APIToken) error {
	if r.saveAPITokenErr != nil {
		return r.saveAPITokenErr
	}
	return r.Repository.SaveAPIToken(ctx, token)
}

func (r *repositoryGate) FindUserByID(ctx context.Context, id int64) (*model.User, error) {
	if r.findUserByIDErr != nil {
		return nil, r.findUserByIDErr
	}
	return r.Repository.FindUserByID(ctx, id)
}

func (r *repositoryGate) SaveEmailVerification(ctx context.Context, verification *model.EmailVerification) error {
	if r.saveEmailVerificationErr != nil {
		return r.saveEmailVerificationErr
	}
	return r.Repository.SaveEmailVerification(ctx, verification)
}

func (r *repositoryGate) SaveMFAFactor(ctx context.Context, factor *model.MFAFactor) error {
	if r.saveMFAFactorErr != nil {
		return r.saveMFAFactorErr
	}
	return r.Repository.SaveMFAFactor(ctx, factor)
}

func (r *repositoryGate) ListRolePermissions(ctx context.Context, orgID int64, roleSubject string) ([]RolePermission, error) {
	if r.listRolePermissionsErr != nil {
		return nil, r.listRolePermissionsErr
	}
	return r.Repository.ListRolePermissions(ctx, orgID, roleSubject)
}

func (r *repositoryGate) WithTx(ctx context.Context, fn func(context.Context, Repository) error) error {
	return r.Repository.WithTx(ctx, func(txCtx context.Context, txRepo Repository) error {
		txGate := *r
		txGate.Repository = txRepo
		return fn(txCtx, &txGate)
	})
}

func (r *repositoryGate) CreateAuditLog(ctx context.Context, log *model.AuditLog) error {
	if r.createAuditLogErr != nil {
		return r.createAuditLogErr
	}
	return r.Repository.CreateAuditLog(ctx, log)
}

func bootstrapMemberForAuditRollback(t *testing.T, ctx context.Context, svc Service) (*Principal, *Principal) {
	t.Helper()
	admin, err := svc.BootstrapAdmin(ctx, BootstrapAdminInput{OrgCode: "acme", OrgName: "Acme", Username: "admin", Email: "admin@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("BootstrapAdmin() failed: %v", err)
	}
	invite, err := svc.InviteUser(ctx, InviteUserInput{Principal: *admin, Email: "member@example.com", RoleCode: model.RoleMember})
	if err != nil {
		t.Fatalf("InviteUser() failed: %v", err)
	}
	member, err := svc.AcceptInvitation(ctx, AcceptInvitationInput{Token: invite.Token, Username: "member", Password: "password123"})
	if err != nil {
		t.Fatalf("AcceptInvitation() failed: %v", err)
	}
	return admin, member
}

func latestInvitation(ctx context.Context, repo Repository, orgID int64) (*model.Invitation, error) {
	invitations, err := repo.ListInvitationsByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if len(invitations) == 0 {
		return nil, ErrNotFound
	}
	return &invitations[len(invitations)-1], nil
}

type failingNotifier struct {
	err               error
	invitation        *InvitationNotice
	passwordReset     *PasswordResetNotice
	emailVerification *EmailVerificationNotice
}

type recordingNotifier struct {
	invitation        *InvitationNotice
	passwordReset     *PasswordResetNotice
	emailVerification *EmailVerificationNotice
}

type switchableNotifier struct {
	err               error
	invitation        *InvitationNotice
	passwordReset     *PasswordResetNotice
	emailVerification *EmailVerificationNotice
}

type failingCacheStore struct {
	err error
}

func (s failingCacheStore) GetJSON(context.Context, string, any) (bool, error) {
	return false, s.err
}

func (s failingCacheStore) SetJSON(context.Context, string, any, time.Duration) error {
	return s.err
}

func (s failingCacheStore) Delete(context.Context, ...string) error {
	return s.err
}

func (s failingCacheStore) Incr(context.Context, string, time.Duration) (int64, error) {
	return 0, s.err
}

type captureWarningLogger struct {
	entries []warningLogEntry
}

type warningLogEntry struct {
	message       string
	keysAndValues []interface{}
}

func (l *captureWarningLogger) Warn(message string, keysAndValues ...interface{}) {
	l.entries = append(l.entries, warningLogEntry{
		message:       message,
		keysAndValues: append([]interface{}(nil), keysAndValues...),
	})
}

func warningMessagesContain(entries []warningLogEntry, message string) bool {
	for _, entry := range entries {
		if entry.message == message {
			return true
		}
	}
	return false
}

func (n *recordingNotifier) SendInvitation(_ context.Context, notice InvitationNotice) error {
	noticeCopy := notice
	n.invitation = &noticeCopy
	return nil
}

func (n *recordingNotifier) SendPasswordReset(_ context.Context, notice PasswordResetNotice) error {
	noticeCopy := notice
	n.passwordReset = &noticeCopy
	return nil
}

func (n *recordingNotifier) SendEmailVerification(_ context.Context, notice EmailVerificationNotice) error {
	noticeCopy := notice
	n.emailVerification = &noticeCopy
	return nil
}

func (n *failingNotifier) SendInvitation(_ context.Context, notice InvitationNotice) error {
	noticeCopy := notice
	n.invitation = &noticeCopy
	return n.deliveryError()
}

func (n *failingNotifier) SendPasswordReset(_ context.Context, notice PasswordResetNotice) error {
	noticeCopy := notice
	n.passwordReset = &noticeCopy
	return n.deliveryError()
}

func (n *failingNotifier) SendEmailVerification(_ context.Context, notice EmailVerificationNotice) error {
	noticeCopy := notice
	n.emailVerification = &noticeCopy
	return n.deliveryError()
}

func (n *failingNotifier) deliveryError() error {
	if n.err != nil {
		return n.err
	}
	return errors.New("notification failed")
}

func (n *switchableNotifier) SendInvitation(_ context.Context, notice InvitationNotice) error {
	noticeCopy := notice
	n.invitation = &noticeCopy
	return n.err
}

func (n *switchableNotifier) SendPasswordReset(_ context.Context, notice PasswordResetNotice) error {
	noticeCopy := notice
	n.passwordReset = &noticeCopy
	return n.err
}

func (n *switchableNotifier) SendEmailVerification(_ context.Context, notice EmailVerificationNotice) error {
	noticeCopy := notice
	n.emailVerification = &noticeCopy
	return n.err
}

func captchaAnswer(t *testing.T, dataURL string) string {
	t.Helper()
	const prefix = "data:image/svg+xml;base64,"
	if !strings.HasPrefix(dataURL, prefix) {
		t.Fatalf("unexpected captcha data URL: %s", dataURL)
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(dataURL, prefix))
	if err != nil {
		t.Fatalf("decode captcha SVG: %v", err)
	}
	matches := regexp.MustCompile(`([1-9]) \+ ([1-9])`).FindStringSubmatch(string(raw))
	if len(matches) != 3 {
		t.Fatalf("captcha SVG missing addition question: %s", string(raw))
	}
	left, _ := strconv.Atoi(matches[1])
	right, _ := strconv.Atoi(matches[2])
	return strconv.Itoa(left + right)
}

func ptrString(value string) *string {
	return &value
}

func testRolesContain(values []string, want string) bool {
	for _, value := range values {
		normalized := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(value)), "role:")
		if normalized == want {
			return true
		}
	}
	return false
}

func containsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
