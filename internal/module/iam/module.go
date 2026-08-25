// Package iam 负责身份、凭据、会话与 Core RBAC 的局部装配。
package iam

import (
	"fmt"

	"github.com/rin721/go-scaffold-template/internal/module"
	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/iam/adapter/password"
	"github.com/rin721/go-scaffold-template/internal/module/iam/authorization"
	configbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/config"
	httpbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/http"
	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
)

const moduleID module.ID = "iam"

type Dependencies struct {
	Database    repo.Access
	Clock       clock.Clock
	IDGenerator idgen.Generator
	Config      configbinding.Config
	Permissions permissioncatalog.Catalog
}
type HTTPDependencies struct {
	Dependencies
	AllowedOrigins []string
}

// Module 是 IAM 局部装配后的完成品；根组合只通过窄 facet 使用 IAM。
type Module struct {
	Sessions       SessionResolver
	Authorization  Authorization
	Accounts       AccountDirectory
	Administration Administration
	Mutation       MutationGuard
	Contribution   module.Contribution
}
type HTTPModule struct {
	Module
	Handler *httpbinding.Handler
	// Service 是 HTTP profile 的完成品服务，供 composition 注入跨模块能力
	// （如业务操作审计 writer）与窄协议装配；普通模块协作仍走 Module facet。
	Service *service.Service
}

func New(dependencies Dependencies) (Module, error) {
	core, _, err := newModule(dependencies)
	return core, err
}

// newModule 构造 IAM module-local composition；iamService 只返回给
// 模块内部的 HTTP/Handler 装配使用，根组合通过窄 facet 访问 IAM。
func newModule(dependencies Dependencies) (Module, *service.Service, error) {
	store, err := repo.New(dependencies.Database)
	if err != nil {
		return Module{}, nil, err
	}
	runtime, err := authorization.New(store, dependencies.Permissions)
	if err != nil {
		return Module{}, nil, fmt.Errorf("compose iam authorization runtime: %w", err)
	}
	local := dependencies.Config.Local
	iamService, err := service.New(store, dependencies.Clock, dependencies.IDGenerator, passwordadapter.Hasher{}, service.Config{SetupToken: local.SetupToken, IdleTimeout: local.IdleTimeout, AbsoluteTimeout: local.AbsoluteTimeout, MaxFailedAttempts: local.MaxFailedAttempts, LockDuration: local.LockDuration, PasswordPolicy: model.PasswordPolicy{MinLength: local.PasswordPolicy.MinLength, MaxLength: local.PasswordPolicy.MaxLength, RequireComplexity: local.PasswordPolicy.RequireComplexity, HistorySize: local.PasswordPolicy.HistorySize, MaxPasswordAge: local.PasswordPolicy.MaxPasswordAge}, MaxSessionsPerAccount: local.MaxSessionsPerAccount}, dependencies.Permissions, runtime)
	if err != nil {
		return Module{}, nil, fmt.Errorf("compose iam service: %w", err)
	}
	contribution := module.Contribution{ID: moduleID}
	if err := module.ValidateContributions(contribution); err != nil {
		return Module{}, nil, err
	}
	return Module{
		Sessions: iamService, Authorization: runtime, Accounts: iamService,
		Administration: iamService, Mutation: iamService, Contribution: contribution,
	}, iamService, nil
}
func NewHTTP(dependencies HTTPDependencies) (HTTPModule, error) {
	core, iamService, err := newModule(dependencies.Dependencies)
	if err != nil {
		return HTTPModule{}, err
	}
	handler, err := httpbinding.NewHandler(iamService, dependencies.AllowedOrigins)
	if err != nil {
		return HTTPModule{}, fmt.Errorf("compose iam HTTP handler: %w", err)
	}
	return HTTPModule{Module: core, Handler: handler, Service: iamService}, nil
}
