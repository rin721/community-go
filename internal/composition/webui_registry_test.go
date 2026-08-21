package composition

import (
	"strings"
	"testing"
)

func TestGenerateWebUIRegistryIncludesEntriesAndLocales(t *testing.T) {
	generated, err := GenerateWebUIRegistry()
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`"auth.login": () => import("../../../internal/module/auth/binding/webui/web/LoginPage")`,
		`"ops.dashboard": () => import("../../../internal/module/ops/binding/webui/web/DashboardPage")`,
		`"webui.auth": () => import("../../../internal/module/auth/binding/webui/web/locale/zh-CN.json")`,
		`"webui.ops": () => import("../../../internal/module/ops/binding/webui/web/locale/zh-CN.json")`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("generated registry does not contain %s:\n%s", expected, generated)
		}
	}
	if strings.Index(generated, `"auth.login"`) > strings.Index(generated, `"ops.dashboard"`) {
		t.Fatalf("generated entries are not stable:\n%s", generated)
	}
}
