package lifecycleapp

import (
	"context"
	"errors"
	"testing"

	"github.com/open-console/console-platform/internal/app/initapp"
	"github.com/open-console/console-platform/pkg/httpserver"
	"github.com/open-console/console-platform/pkg/logger"
	"github.com/open-console/console-platform/pkg/rpcserver"
)

func TestStartShutsDownHTTPWhenRPCStartFails(t *testing.T) {
	t.Parallel()

	httpSrv := &fakeLifecycleHTTPServer{}
	rpcSrv := &fakeLifecycleRPCServer{startErr: errors.New("bind failed")}

	err := Start(context.Background(), initapp.Transport{HTTPServer: httpSrv, RPCServer: rpcSrv})
	if err == nil {
		t.Fatal("Start() error = nil, want RPC start error")
	}
	if httpSrv.starts != 1 {
		t.Fatalf("HTTP starts = %d, want 1", httpSrv.starts)
	}
	if httpSrv.shutdowns != 1 {
		t.Fatalf("HTTP shutdowns = %d, want rollback shutdown", httpSrv.shutdowns)
	}
	if rpcSrv.starts != 1 {
		t.Fatalf("RPC starts = %d, want 1", rpcSrv.starts)
	}
}

func TestStartReturnsRollbackErrorsWhenRPCStartFails(t *testing.T) {
	t.Parallel()

	rpcStartErr := errors.New("rpc bind failed")
	httpShutdownErr := errors.New("http shutdown failed")
	backgroundShutdownErr := errors.New("background shutdown failed")
	httpSrv := &fakeLifecycleHTTPServer{shutdownErr: httpShutdownErr}
	rpcSrv := &fakeLifecycleRPCServer{startErr: rpcStartErr}
	bg := &fakeBackgroundService{shutdownErr: backgroundShutdownErr}

	err := Start(context.Background(), initapp.Transport{
		HTTPServer: httpSrv,
		RPCServer:  rpcSrv,
		Background: []initapp.BackgroundService{bg},
	})

	if !errors.Is(err, rpcStartErr) {
		t.Fatalf("expected RPC start error in result, got %v", err)
	}
	if !errors.Is(err, httpShutdownErr) {
		t.Fatalf("expected HTTP rollback shutdown error in result, got %v", err)
	}
	if !errors.Is(err, backgroundShutdownErr) {
		t.Fatalf("expected background rollback shutdown error in result, got %v", err)
	}
	if bg.shutdowns != 1 {
		t.Fatalf("background shutdowns = %d, want 1", bg.shutdowns)
	}
}

func TestRunWaitsForHTTPRuntimeError(t *testing.T) {
	t.Parallel()

	waitErr := errors.New("serve failed")
	httpSrv := &fakeLifecycleHTTPServer{waitErr: waitErr}
	rpcSrv := &fakeLifecycleRPCServer{}

	err := Run(context.Background(), initapp.Transport{HTTPServer: httpSrv, RPCServer: rpcSrv})
	if !errors.Is(err, waitErr) {
		t.Fatalf("Run() error = %v, want wrapped wait error", err)
	}
	if httpSrv.starts != 1 {
		t.Fatalf("HTTP starts = %d, want 1", httpSrv.starts)
	}
	if httpSrv.waits != 1 {
		t.Fatalf("HTTP waits = %d, want 1", httpSrv.waits)
	}
	if rpcSrv.starts != 1 {
		t.Fatalf("RPC starts = %d, want 1", rpcSrv.starts)
	}
}

func TestShutdownStopsHTTPAndRPC(t *testing.T) {
	t.Parallel()

	httpSrv := &fakeLifecycleHTTPServer{}
	rpcSrv := &fakeLifecycleRPCServer{}

	if err := Shutdown(context.Background(), initapp.Core{}, initapp.Infrastructure{}, initapp.Transport{
		HTTPServer: httpSrv,
		RPCServer:  rpcSrv,
	}); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	if httpSrv.shutdowns != 1 {
		t.Fatalf("HTTP shutdowns = %d, want 1", httpSrv.shutdowns)
	}
	if rpcSrv.shutdowns != 1 {
		t.Fatalf("RPC shutdowns = %d, want 1", rpcSrv.shutdowns)
	}
}

func TestShutdownReturnsUnderlyingErrors(t *testing.T) {
	t.Parallel()

	httpErr := errors.New("http shutdown failed")
	rpcErr := errors.New("rpc shutdown failed")
	httpSrv := &fakeLifecycleHTTPServer{shutdownErr: httpErr}
	rpcSrv := &fakeLifecycleRPCServer{shutdownErr: rpcErr}

	err := Shutdown(context.Background(), initapp.Core{}, initapp.Infrastructure{}, initapp.Transport{
		HTTPServer: httpSrv,
		RPCServer:  rpcSrv,
	})

	if !errors.Is(err, httpErr) {
		t.Fatalf("expected HTTP shutdown error in result, got %v", err)
	}
	if !errors.Is(err, rpcErr) {
		t.Fatalf("expected RPC shutdown error in result, got %v", err)
	}
	if httpSrv.shutdowns != 1 || rpcSrv.shutdowns != 1 {
		t.Fatalf("shutdowns = %d/%d, want 1/1", httpSrv.shutdowns, rpcSrv.shutdowns)
	}
}

func TestShutdownReturnsLoggerSyncError(t *testing.T) {
	t.Parallel()

	syncErr := errors.New("logger sync failed")
	log := &fakeLifecycleLogger{syncErr: syncErr}

	err := Shutdown(context.Background(), initapp.Core{Logger: log}, initapp.Infrastructure{}, initapp.Transport{})

	if !errors.Is(err, syncErr) {
		t.Fatalf("expected logger sync error in result, got %v", err)
	}
	if log.syncs != 1 {
		t.Fatalf("logger syncs = %d, want 1", log.syncs)
	}
	if !log.hasInfo("application shutdown complete") {
		t.Fatalf("expected shutdown complete log before sync, got %#v", log.infos)
	}
}

func TestShutdownJoinsLoggerSyncWithResourceErrors(t *testing.T) {
	t.Parallel()

	httpErr := errors.New("http shutdown failed")
	syncErr := errors.New("logger sync failed")
	httpSrv := &fakeLifecycleHTTPServer{shutdownErr: httpErr}
	log := &fakeLifecycleLogger{syncErr: syncErr}

	err := Shutdown(context.Background(), initapp.Core{Logger: log}, initapp.Infrastructure{}, initapp.Transport{
		HTTPServer: httpSrv,
	})

	if !errors.Is(err, httpErr) {
		t.Fatalf("expected HTTP shutdown error in result, got %v", err)
	}
	if !errors.Is(err, syncErr) {
		t.Fatalf("expected logger sync error in result, got %v", err)
	}
	if log.syncs != 1 {
		t.Fatalf("logger syncs = %d, want 1", log.syncs)
	}
}

func TestStartAndShutdownManageBackgroundServices(t *testing.T) {
	t.Parallel()

	httpSrv := &fakeLifecycleHTTPServer{}
	bg := &fakeBackgroundService{}
	transport := initapp.Transport{HTTPServer: httpSrv, Background: []initapp.BackgroundService{bg}}

	if err := Start(context.Background(), transport); err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if bg.starts != 1 {
		t.Fatalf("background starts = %d, want 1", bg.starts)
	}
	if err := Shutdown(context.Background(), initapp.Core{}, initapp.Infrastructure{}, transport); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	if bg.shutdowns != 1 {
		t.Fatalf("background shutdowns = %d, want 1", bg.shutdowns)
	}
}

func TestStartReturnsBackgroundRollbackErrors(t *testing.T) {
	t.Parallel()

	startErr := errors.New("second background failed")
	shutdownErr := errors.New("first background shutdown failed")
	first := &fakeBackgroundService{shutdownErr: shutdownErr}
	second := &fakeBackgroundService{startErr: startErr}

	err := Start(context.Background(), initapp.Transport{
		HTTPServer: &fakeLifecycleHTTPServer{},
		Background: []initapp.BackgroundService{
			first,
			second,
		},
	})

	if !errors.Is(err, startErr) {
		t.Fatalf("expected background start error in result, got %v", err)
	}
	if !errors.Is(err, shutdownErr) {
		t.Fatalf("expected background rollback shutdown error in result, got %v", err)
	}
	if first.shutdowns != 1 {
		t.Fatalf("first background shutdowns = %d, want 1", first.shutdowns)
	}
	if second.shutdowns != 0 {
		t.Fatalf("second background shutdowns = %d, want 0", second.shutdowns)
	}
}

type fakeLifecycleHTTPServer struct {
	httpserver.HTTPServer
	starts      int
	waits       int
	shutdowns   int
	startErr    error
	shutdownErr error
	waitErr     error
}

func (s *fakeLifecycleHTTPServer) Start(context.Context) error {
	s.starts++
	return s.startErr
}

func (s *fakeLifecycleHTTPServer) Shutdown(context.Context) error {
	s.shutdowns++
	return s.shutdownErr
}

func (s *fakeLifecycleHTTPServer) Wait(context.Context) error {
	s.waits++
	return s.waitErr
}

type fakeLifecycleRPCServer struct {
	rpcserver.Server
	starts      int
	shutdowns   int
	startErr    error
	shutdownErr error
}

func (s *fakeLifecycleRPCServer) Start(context.Context) error {
	s.starts++
	return s.startErr
}

func (s *fakeLifecycleRPCServer) Shutdown(context.Context) error {
	s.shutdowns++
	return s.shutdownErr
}

type fakeBackgroundService struct {
	starts      int
	shutdowns   int
	startErr    error
	shutdownErr error
}

func (s *fakeBackgroundService) Start(context.Context) error {
	s.starts++
	return s.startErr
}

func (s *fakeBackgroundService) Shutdown(context.Context) error {
	s.shutdowns++
	return s.shutdownErr
}

type fakeLifecycleLogger struct {
	infos   []string
	syncs   int
	syncErr error
}

func (l *fakeLifecycleLogger) Debug(string, ...interface{}) {}

func (l *fakeLifecycleLogger) Info(message string, _ ...interface{}) {
	l.infos = append(l.infos, message)
}

func (l *fakeLifecycleLogger) Warn(string, ...interface{}) {}

func (l *fakeLifecycleLogger) Error(string, ...interface{}) {}

func (l *fakeLifecycleLogger) Fatal(string, ...interface{}) {}

func (l *fakeLifecycleLogger) With(...interface{}) logger.Logger {
	return l
}

func (l *fakeLifecycleLogger) Sync() error {
	l.syncs++
	return l.syncErr
}

func (l *fakeLifecycleLogger) Reload(*logger.Config) error {
	return nil
}

func (l *fakeLifecycleLogger) hasInfo(message string) bool {
	for _, item := range l.infos {
		if item == message {
			return true
		}
	}
	return false
}
