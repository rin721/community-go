package adapters

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
)

func TestControlRequestMatchingRequiresServicePIDAndCreateTime(t *testing.T) {
	self := ProcessInfo{PID: 10, ProcessStartTime: 20}
	valid := ControlRequest{Service: "server", Action: ControlActionStop, PID: 10, ProcessStartTime: 20}
	if !matchesCurrentProcess(valid, "server", self) {
		t.Fatal("expected matching control request")
	}

	cases := []ControlRequest{
		{Service: "db", Action: ControlActionStop, PID: 10, ProcessStartTime: 20},
		{Service: "server", Action: "restart", PID: 10, ProcessStartTime: 20},
		{Service: "server", Action: ControlActionStop, PID: 11, ProcessStartTime: 20},
		{Service: "server", Action: ControlActionStop, PID: 10, ProcessStartTime: 21},
	}
	for _, tc := range cases {
		if matchesCurrentProcess(tc, "server", self) {
			t.Fatalf("unexpected match for %#v", tc)
		}
	}
}

func TestWatchManagedServiceControlReturnsCurrentProcessInfoError(t *testing.T) {
	t.Setenv(ManagedServiceEnvName, "1")
	createTimeErr := errors.New("create time unavailable")
	oldLookupProcessCreateTime := lookupProcessCreateTime
	lookupProcessCreateTime = func(int) (int64, error) {
		return 0, createTimeErr
	}
	t.Cleanup(func() {
		lookupProcessCreateTime = oldLookupProcessCreateTime
	})

	control, err := WatchManagedServiceControl(context.Background(), "server", filepath.Join(t.TempDir(), "control.json"))

	if control != nil {
		t.Fatal("WatchManagedServiceControl() control channel != nil, want nil on metadata error")
	}
	if !errors.Is(err, createTimeErr) {
		t.Fatalf("WatchManagedServiceControl() error = %v, want %v", err, createTimeErr)
	}
	if !strings.Contains(err.Error(), "resolve current process create time") {
		t.Fatalf("WatchManagedServiceControl() error missing process metadata context: %v", err)
	}
}
