package composition

import (
	"context"
	"fmt"
	"net/http"

	"github.com/rin721/go-scaffold-template/internal/module/auth"
	authconfig "github.com/rin721/go-scaffold-template/internal/module/auth/binding/config"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	authservice "github.com/rin721/go-scaffold-template/internal/module/auth/service"
	"github.com/rin721/go-scaffold-template/internal/module/iam"
	"github.com/rin721/go-scaffold-template/internal/module/iam/authorization"
	iamconfig "github.com/rin721/go-scaffold-template/internal/module/iam/binding/config"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	organizationservice "github.com/rin721/go-scaffold-template/internal/module/organization/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/internal/transport/http"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
	"github.com/rin721/go-scaffold-template/pkg/logger"
)

// navigationMutationGuard 是 Navigation 消费的 mutation guard 契约；
// identity-access 切片不 import 业务模块，只依赖这个窄同名接口。
type navigationMutationGuard interface{ ValidateMutation(*http.Request) error }

// identityAccessInput 是 identity-access 切片的 typed 输入；字段只能由该
// 切片真实消费，不得扩展为全应用依赖包。
type identityAccessInput struct {
	Database       repo.Access
	Logger         logger.Logger
	IAMConfig      iamconfig.Config
	AuthConfig     authconfig.Config
	Permissions    permissioncatalog.Catalog
	Policies       []authmodel.Policy
	AllowedOrigins []string
}

// identityAccess 是根 Generation 消费的 typed 完成品。
type identityAccess struct {
	IAM              iam.HTTPModule
	Auth             auth.Module
	OperationGate    httptransport.OperationGate
	MutationGuard    navigationMutationGuard
	AccountDirectory organizationservice.AccountDirectory
}

// composeIdentityAccess 是有边界的 identity-access 子装配：构造 IAM
// module-local composition，完成 owner reconcile、evaluator 加载与
// 兼容性检查，把 IAM Session/Authorization facet 适配为 Auth
// SessionSource/DecisionPoint，构造 Auth Module 与 OperationGate。
// 它不构造平台资源、业务模块或监听器。
func composeIdentityAccess(ctx context.Context, input identityAccessInput) (identityAccess, error) {
	if ctx == nil {
		return identityAccess{}, fmt.Errorf("identity access context is nil")
	}
	if nilDependency(input.Database) {
		return identityAccess{}, fmt.Errorf("identity access database is nil")
	}
	iamModule, err := iam.NewHTTP(iam.HTTPDependencies{
		Dependencies: iam.Dependencies{
			Database: input.Database, Clock: clock.System(), IDGenerator: idgen.UUID(),
			Config: input.IAMConfig, Permissions: input.Permissions,
		},
		AllowedOrigins: input.AllowedOrigins,
	})
	if err != nil {
		return identityAccess{}, fmt.Errorf("compose iam module: %w", err)
	}
	if err := iamModule.Administration.ReconcileOwnerCatalog(ctx); err != nil {
		return identityAccess{}, fmt.Errorf("reconcile iam owner catalog: %w", err)
	}
	if err := iamModule.Authorization.Load(ctx); err != nil {
		return identityAccess{}, fmt.Errorf("load iam authorization evaluator: %w", err)
	}
	if err := iamModule.Administration.Compatible(ctx); err != nil {
		return identityAccess{}, fmt.Errorf("verify iam catalog compatibility: %w", err)
	}
	sessionSource, err := newIAMSessionAuthAdapter(iamModule.Sessions)
	if err != nil {
		return identityAccess{}, err
	}
	decisionPoint, err := newIAMRBACDecisionAdapter(iamModule.Authorization)
	if err != nil {
		return identityAccess{}, err
	}
	authModule, err := auth.NewHTTP(auth.Dependencies{
		Clock: clock.System(), Logger: input.Logger, Config: input.AuthConfig,
		Policies: input.Policies, SessionSource: sessionSource, DecisionPoint: decisionPoint,
	})
	if err != nil {
		return identityAccess{}, fmt.Errorf("compose auth module: %w", err)
	}
	operationGate, err := newOperationGate(authModule.Service, authModule.BearerSource, authModule.SessionSource)
	if err != nil {
		return identityAccess{}, err
	}
	mutationGuard, err := newIAMMutationGuard(iamModule.Mutation, input.AllowedOrigins)
	if err != nil {
		return identityAccess{}, err
	}
	accounts, err := newOrganizationAccountDirectory(iamModule.Accounts)
	if err != nil {
		return identityAccess{}, err
	}
	return identityAccess{
		IAM: iamModule, Auth: authModule, OperationGate: operationGate,
		MutationGuard: mutationGuard, AccountDirectory: accounts,
	}, nil
}

// iamRBACDecisionAdapter 是 IAM Authorization facet 到 Auth DecisionPoint
// 的唯一中介：只转换 Subject、Permission、revision 与错误，不读取数据库、
// 不缓存、不审计、不做业务判断。
type iamRBACDecisionAdapter struct {
	authorization iam.Authorization
}

func newIAMRBACDecisionAdapter(value iam.Authorization) (authservice.DecisionPoint, error) {
	if nilDependency(value) {
		return nil, fmt.Errorf("iam authorization facet is nil")
	}
	return iamRBACDecisionAdapter{authorization: value}, nil
}

func (adapter iamRBACDecisionAdapter) Decide(ctx context.Context, request authservice.AuthorizationRequest) (authservice.AuthorizationDecision, error) {
	decision, err := adapter.authorization.Decide(ctx, authorization.Request{
		Subject: request.Subject, Permission: permissioncatalog.Key(request.Permission),
		Revision: request.Revision, Restricted: request.Restricted,
	})
	if err != nil {
		return authservice.AuthorizationDecision{}, err
	}
	if decision.Allowed {
		return authservice.AuthorizationDecision{Allowed: true, Reason: authmodel.ReasonAllowed}, nil
	}
	return authservice.AuthorizationDecision{Allowed: false, Reason: authmodel.ReasonRBACDenied}, nil
}

var _ authservice.DecisionPoint = iamRBACDecisionAdapter{}
var _ service.AuthorizationPublisher = (*authorization.Runtime)(nil)
