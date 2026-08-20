package initapp

import (
	"context"
	"errors"
	"testing"
)

func TestBackgroundGroupStartReturnsRollbackErrors(t *testing.T) {
	t.Parallel()

	startErr := errors.New("start failed")
	shutdownErr := errors.New("shutdown failed")
	first := &fakeBackgroundGroupService{shutdownErr: shutdownErr}
	second := &fakeBackgroundGroupService{startErr: startErr}

	group := newBackgroundGroup(first, second)
	if group == nil {
		t.Fatal("expected background group")
	}

	err := group.Start(context.Background())
	if !errors.Is(err, startErr) {
		t.Fatalf("expected start error in result, got %v", err)
	}
	if !errors.Is(err, shutdownErr) {
		t.Fatalf("expected rollback shutdown error in result, got %v", err)
	}
	if first.shutdowns != 1 {
		t.Fatalf("first shutdowns = %d, want 1", first.shutdowns)
	}
	if second.shutdowns != 0 {
		t.Fatalf("second shutdowns = %d, want 0", second.shutdowns)
	}
}

func TestBackgroundGroupShutdownReturnsAllErrors(t *testing.T) {
	t.Parallel()

	firstErr := errors.New("first shutdown failed")
	secondErr := errors.New("second shutdown failed")
	first := &fakeBackgroundGroupService{shutdownErr: firstErr}
	second := &fakeBackgroundGroupService{shutdownErr: secondErr}

	group := newBackgroundGroup(first, second)
	if group == nil {
		t.Fatal("expected background group")
	}

	err := group.Shutdown(context.Background())
	if !errors.Is(err, firstErr) {
		t.Fatalf("expected first shutdown error in result, got %v", err)
	}
	if !errors.Is(err, secondErr) {
		t.Fatalf("expected second shutdown error in result, got %v", err)
	}
	if first.shutdowns != 1 || second.shutdowns != 1 {
		t.Fatalf("shutdowns = %d/%d, want 1/1", first.shutdowns, second.shutdowns)
	}
}

type fakeBackgroundGroupService struct {
	starts      int
	shutdowns   int
	startErr    error
	shutdownErr error
}

func (s *fakeBackgroundGroupService) Start(context.Context) error {
	s.starts++
	return s.startErr
}

func (s *fakeBackgroundGroupService) Shutdown(context.Context) error {
	s.shutdowns++
	return s.shutdownErr
}
