// Package iam 负责身份、凭据、会话与 Core RBAC 的局部装配。
package iam

import (
	"fmt"

	"github.com/rin721/go-scaffold-template/internal/module"
	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/iam/adapter/password"
	configbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/config"
	httpbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/http"
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
type Module struct {
	Service      *service.Service
	Contribution module.Contribution
}
type HTTPModule struct {
	Module
	Handler *httpbinding.Handler
}

func New(dependencies Dependencies) (Module, error) {
	store, err := repo.New(dependencies.Database)
	if err != nil {
		return Module{}, err
	}
	local := dependencies.Config.Local
	iamService, err := service.New(store, dependencies.Clock, dependencies.IDGenerator, passwordadapter.Hasher{}, service.Config{SetupToken: local.SetupToken, IdleTimeout: local.IdleTimeout, AbsoluteTimeout: local.AbsoluteTimeout, MaxFailedAttempts: local.MaxFailedAttempts, LockDuration: local.LockDuration}, dependencies.Permissions)
	if err != nil {
		return Module{}, fmt.Errorf("compose iam service: %w", err)
	}
	contribution := module.Contribution{ID: moduleID}
	if err := module.ValidateContributions(contribution); err != nil {
		return Module{}, err
	}
	return Module{Service: iamService, Contribution: contribution}, nil
}
func NewHTTP(dependencies HTTPDependencies) (HTTPModule, error) {
	core, err := New(dependencies.Dependencies)
	if err != nil {
		return HTTPModule{}, err
	}
	handler, err := httpbinding.NewHandler(core.Service, dependencies.AllowedOrigins)
	if err != nil {
		return HTTPModule{}, fmt.Errorf("compose iam HTTP handler: %w", err)
	}
	return HTTPModule{Module: core, Handler: handler}, nil
}
