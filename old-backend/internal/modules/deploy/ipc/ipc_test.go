package ipc

import (
	"testing"
	"time"
)

func TestIPCRoundtrip(t *testing.T) {
	srv, err := NewServer()
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}
	defer srv.Close()

	cli, err := Dial(srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}
	defer cli.Close()

	// Wait briefly for accept
	time.Sleep(10 * time.Millisecond)

	// Send from server to client
	srvMsg := Message{
		Type:       MsgRestartRequired,
		CommitHash: "abc12345",
		SentAt:     time.Now(),
	}
	if err := srv.Send(srvMsg); err != nil {
		t.Fatalf("server failed to send: %v", err)
	}

	// Client receives
	select {
	case msg := <-cli.Messages():
		if msg.Type != MsgRestartRequired || msg.CommitHash != "abc12345" {
			t.Errorf("unexpected client message: %+v", msg)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for client message")
	}

	// Send from client to server
	cliMsg := Message{
		Type:   MsgReady,
		SentAt: time.Now(),
	}
	if err := cli.Send(cliMsg); err != nil {
		t.Fatalf("client failed to send: %v", err)
	}

	// Server receives
	select {
	case msg := <-srv.Messages():
		if msg.Type != MsgReady {
			t.Errorf("unexpected server message: %+v", msg)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for server message")
	}
}
