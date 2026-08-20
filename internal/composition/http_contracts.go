package composition

import (
	admincontract "github.com/rin721/go-scaffold-template/internal/admin"
	authadmin "github.com/rin721/go-scaffold-template/internal/module/auth/binding/admin"
	opsadmin "github.com/rin721/go-scaffold-template/internal/module/ops/binding/admin"
	todohttp "github.com/rin721/go-scaffold-template/internal/module/todo/binding/http"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

// applicationHTTPModules 返回当前应用接入的全部 HTTP 契约模块（装配汇总点）。
//
// 这是 composition 内“哪些模块提供 HTTP 公开契约”的唯一汇总：policy 汇总
// （operationPolicies）、observability operation inventory（opsOperations）与路由
// dispatcher（newContractDispatcher）都从该汇总消费，避免各处硬编码具体模块契约
// （例如 service.go/ops.go 各自直接读 todohttp.ModuleContract）。新增 HTTP 业务模块时
// 在此追加一项，并同时扩展其运行时在 composition 的装配。
func applicationHTTPModules() []contract.Module {
	return []contract.Module{
		todohttp.ModuleContract(),
	}
}

// applicationAdminCatalog 是 Admin runtime 与前端生成器共享的唯一声明汇总点。
func applicationAdminCatalog() (admincontract.Catalog, error) {
	catalog, err := admincontract.BuildCatalog(authadmin.Binding(), opsadmin.Binding())
	if err != nil {
		return admincontract.Catalog{}, err
	}
	operations := make(map[string]struct{})
	for _, module := range applicationHTTPModules() {
		for _, operation := range module.Operations {
			operations[string(operation.ID)] = struct{}{}
		}
	}
	operations["ops.diagnostics"] = struct{}{}
	operations["ops.metrics"] = struct{}{}
	if err := catalog.ValidateOperationReferences(operations); err != nil {
		return admincontract.Catalog{}, err
	}
	return catalog, nil
}
