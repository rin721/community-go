package gate

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/modules/deploy/ipc"
)

func TestStartupGateNoIPC(t *testing.T) {
	err := Run(context.Background(), Config{})
	if err != nil {
		t.Errorf("expected no error when IPC address is empty, got %v", err)
	}
}

func TestStartupGateReady(t *testing.T) {
	srv, err := ipc.NewServer()
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	errChan := make(chan error, 1)
	go func() {
		errChan <- Run(ctx, Config{
			IPCAddr:           srv.Addr(),
			HeartbeatInterval: 10 * time.Millisecond,
			GateBuffer:        10 * time.Millisecond,
		})
	}()

	// Wait for server to receive MsgReady
	select {
	case msg := <-srv.Messages():
		if msg.Type != ipc.MsgReady {
			t.Errorf("expected MsgReady, got %v", msg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for ready message")
	}

	err = <-errChan
	if err != nil {
		t.Errorf("expected nil error on success, got %v", err)
	}
}

func TestStartupGateAbort(t *testing.T) {
	srv, err := ipc.NewServer()
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	errChan := make(chan error, 1)
	go func() {
		errChan <- Run(ctx, Config{
			IPCAddr:           srv.Addr(),
			HeartbeatInterval: 100 * time.Millisecond,
			GateBuffer:        100 * time.Millisecond,
		})
	}()

	// Wait briefly for connection
	time.Sleep(10 * time.Millisecond)

	// Send restart required from server
	srvMsg := ipc.Message{
		Type:       ipc.MsgRestartRequired,
		CommitHash: "new_hash",
		SentAt:     time.Now(),
	}
	if err := srv.Send(srvMsg); err != nil {
		t.Fatalf("failed to send: %v", err)
	}

	// Server should receive MsgAbort
	select {
	case msg := <-srv.Messages():
		if msg.Type != ipc.MsgAbort {
			t.Errorf("expected MsgAbort, got %v", msg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for abort message")
	}

	err = <-errChan
	if !errors.Is(err, ErrRestartRequired) {
		t.Errorf("expected ErrRestartRequired, got %v", err)
	}
}

func TestStartupGateDisconnect(t *testing.T) {
	srv, err := ipc.NewServer()
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	errChan := make(chan error, 1)
	go func() {
		errChan <- Run(ctx, Config{
			IPCAddr:           srv.Addr(),
			HeartbeatInterval: 1 * time.Second,
			GateBuffer:        1 * time.Second,
		})
	}()

	// Wait briefly for connection
	time.Sleep(50 * time.Millisecond)

	// Close server to trigger client disconnect
	srv.Close()

	err = <-errChan
	if err != nil {
		t.Errorf("expected nil error on disconnect, got %v", err)
	}
}
