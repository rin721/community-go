package queue

import (
	"sync"
	"testing"
)

func TestDeployQueueSingleSlot(t *testing.T) {
	q := New()

	// Initially empty
	if c, ok := q.Pop(); ok || c != "" {
		t.Errorf("expected empty queue, got %q, %v", c, ok)
	}

	// Push once
	q.Push("commit1")
	if !q.HasPending() {
		t.Error("expected pending item")
	}

	// Pop once
	if c, ok := q.Pop(); !ok || c != "commit1" {
		t.Errorf("expected commit1, got %q, %v", c, ok)
	}

	// Queue should be empty now
	if q.HasPending() {
		t.Error("expected no pending items")
	}
}

func TestDeployQueueOverwrite(t *testing.T) {
	q := New()

	// Push multiple times
	q.Push("commit1")
	q.Push("commit2")
	q.Push("commit3")

	if !q.HasPending() {
		t.Error("expected pending item")
	}

	// Pop should return the latest pushed commit
	if c, ok := q.Pop(); !ok || c != "commit3" {
		t.Errorf("expected commit3, got %q, %v", c, ok)
	}

	// Queue should be empty
	if c, ok := q.Pop(); ok || c != "" {
		t.Errorf("expected empty, got %q, %v", c, ok)
	}
}

func TestDeployQueueConcurrent(t *testing.T) {
	q := New()
	var wg sync.WaitGroup

	// Start concurrent pushers
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(val string) {
			defer wg.Done()
			q.Push(val)
		}(t.Name())
	}

	wg.Wait()

	// Pop should return something pushed (since all pushers pushed the same Name in this test)
	if c, ok := q.Pop(); !ok || c != t.Name() {
		t.Errorf("expected %q, got %q, %v", t.Name(), c, ok)
	}
}
