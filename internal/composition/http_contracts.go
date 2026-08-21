package composition

import (
	authwebui "github.com/rin721/go-scaffold-template/internal/module/auth/binding/webui"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	opswebui "github.com/rin721/go-scaffold-template/internal/module/ops/binding/webui"
	todohttp "github.com/rin721/go-scaffold-template/internal/module/todo/binding/http"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
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

// applicationWebUIModules 是 WebUI runtime 与前端生成器共享的唯一 registration 汇总点。
// 新模块必须在这里显式选择并声明 Activation；目录存在不代表应用会发布它。
func applicationWebUIModules() []webuicontract.ModuleRegistration {
	return []webuicontract.ModuleRegistration{
		{Binding: authwebui.Binding(), Activation: webuicontract.ActivationEnabled},
		{Binding: opswebui.Binding(), Activation: webuicontract.ActivationEnabled},
	}
}

func applicationWebUISDKInventory() webuicontract.SDKInventory {
	return webuicontract.SDKInventory{
		"runtime": 1,
		"http":    1,
		"i18n":    1,
		"query":   1,
		"ui":      1,
	}
}

// applicationWebUIAvailability 是当前应用的通用 availability provider。
// 真实外部依赖接入时由 composition 提供 route capability 快照；没有快照不能在 handler 内猜测为可用。
func applicationWebUIAvailability(string) webuicontract.Availability {
	return webuicontract.Availability{State: webuicontract.AvailabilityAvailable}
}

// applicationWebUICatalog 是 WebUI runtime 与前端生成器共享的唯一声明汇总点。
func applicationWebUICatalog() (webuicontract.Catalog, error) {
	registrations := applicationWebUIModules()
	catalog, err := webuicontract.BuildApplicationCatalog(registrations, applicationWebUISDKInventory())
	if err != nil {
		return webuicontract.Catalog{}, err
	}
	operations := make(map[string]struct{})
	for _, module := range applicationHTTPModules() {
		for _, operation := range module.Operations {
			operations[string(operation.ID)] = struct{}{}
		}
	}
	operations["ops.diagnostics"] = struct{}{}
	operations["ops.metrics"] = struct{}{}
	operations[authmodel.OperationWebUISession] = struct{}{}
	if err := catalog.ValidateOperationReferences(operations); err != nil {
		return webuicontract.Catalog{}, err
	}
	return catalog, nil
}
