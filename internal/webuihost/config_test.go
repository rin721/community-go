package webuihost

import (
	"context"
	"testing"
	"time"

	"github.com/rin721/go-scaffold-template/internal/kernel/config"
)

func TestDefaultHostingConfiguration(t *testing.T) {
	resolved := Default()
	if !resolved.Hosting.Enabled {
		t.Fatalf("default hosting enabled = false, want true")
	}
	if resolved.Hosting.Dir != DefaultHostingDir {
		t.Fatalf("default hosting dir = %q, want %q", resolved.Hosting.Dir, DefaultHostingDir)
	}
	if resolved.Hosting.BuildScript != DefaultBuildScript {
		t.Fatalf("default build script = %q, want %q", resolved.Hosting.BuildScript, DefaultBuildScript)
	}
	if resolved.Hosting.BuildRuntime != RuntimeNode {
		t.Fatalf("default build runtime = %q, want node", resolved.Hosting.BuildRuntime)
	}
	if resolved.Hosting.BuildTimeout != DefaultBuildTimeout {
		t.Fatalf("default build timeout = %v, want %v", resolved.Hosting.BuildTimeout, DefaultBuildTimeout)
	}
}

func TestDecodeEmptySectionReturnsDefaults(t *testing.T) {
	snapshot, err := config.New(config.MapSource("test", map[string]any{})).Load(context.Background())
	if err != nil {
		t.Fatalf("load snapshot: %v", err)
	}
	resolved, err := Decode(snapshot)
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if resolved != Default() {
		t.Fatalf("Decode() = %#v, want defaults", resolved)
	}
}

func TestDecodeSectionAppliesOverrides(t *testing.T) {
	snapshot, err := config.New(config.MapSource("test", map[string]any{
		"webui": map[string]any{
			"hosting": map[string]any{
				"enabled":      false,
				"dir":          "/srv/webui",
				"buildScript":  "webui/scripts/build-webui.sh",
				"buildRuntime": "bash",
				"buildTimeout": "90s",
			},
		},
	})).Load(context.Background())
	if err != nil {
		t.Fatalf("load snapshot: %v", err)
	}
	resolved, err := Decode(snapshot)
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	hosting := resolved.Hosting
	if hosting.Enabled {
		t.Fatalf("enabled = true, want false")
	}
	if hosting.Dir != "/srv/webui" || hosting.BuildScript != "webui/scripts/build-webui.sh" {
		t.Fatalf("paths = %q / %q", hosting.Dir, hosting.BuildScript)
	}
	if hosting.BuildRuntime != RuntimeBash {
		t.Fatalf("runtime = %q, want bash", hosting.BuildRuntime)
	}
	if hosting.BuildTimeout != 90*time.Second {
		t.Fatalf("timeout = %v, want 90s", hosting.BuildTimeout)
	}
}

func TestDecodeRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name  string
		value map[string]any
	}{
		{name: "unknown field", value: map[string]any{"webui": map[string]any{"hosting": map[string]any{"unknown": true}}}},
		{name: "empty dir", value: map[string]any{"webui": map[string]any{"hosting": map[string]any{"dir": ""}}}},
		{name: "empty script", value: map[string]any{"webui": map[string]any{"hosting": map[string]any{"buildScript": ""}}}},
		{name: "unsupported runtime", value: map[string]any{"webui": map[string]any{"hosting": map[string]any{"buildRuntime": "python"}}}},
		{name: "zero timeout", value: map[string]any{"webui": map[string]any{"hosting": map[string]any{"buildTimeout": "0s"}}}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			snapshot, err := config.New(config.MapSource("test", test.value)).Load(context.Background())
			if err != nil {
				t.Fatalf("load snapshot: %v", err)
			}
			if _, err := Decode(snapshot); err == nil {
				t.Fatalf("Decode(%#v) error = nil", test.value)
			}
		})
	}
}

func TestDecodeRejectsNULInPaths(t *testing.T) {
	for _, field := range []string{"dir", "buildScript"} {
		snapshot, err := config.New(config.MapSource("test", map[string]any{
			"webui": map[string]any{"hosting": map[string]any{field: "bad\x00path"}},
		})).Load(context.Background())
		if err != nil {
			t.Fatalf("load snapshot: %v", err)
		}
		if _, err := Decode(snapshot); err == nil {
			t.Fatalf("Decode with NUL in %s error = nil", field)
		}
	}
}

func TestBindingGeneratesHostingSection(t *testing.T) {
	target := t.TempDir() + "/generated.yaml"
	manager, err := config.NewDefaultManager(Binding())
	if err != nil {
		t.Fatalf("NewDefaultManager() error = %v", err)
	}
	if _, err := manager.Generate(context.Background(), config.GenerateRequest{Path: target}); err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
	snapshot, err := config.New(config.FileSource(target)).Load(context.Background())
	if err != nil {
		t.Fatalf("load generated configuration: %v", err)
	}
	resolved, err := Decode(snapshot)
	if err != nil {
		t.Fatalf("Decode(generated) error = %v", err)
	}
	if resolved != Default() {
		t.Fatalf("generated round-trip = %#v, want %#v", resolved, Default())
	}
}
