package initapp

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

func TestCleanupPartialInfrastructureResourcesClosesInReverseOrder(t *testing.T) {
	t.Parallel()

	var calls []string

	err := cleanupPartialInfrastructureResources(infrastructureCleanupResources{
		Storage:  &recordCloseResource{name: "storage", calls: &calls},
		Executor: &recordShutdownResource{name: "executor", calls: &calls},
		Cache:    &recordCloseResource{name: "cache", calls: &calls},
		Database: &recordCloseResource{name: "database", calls: &calls},
	})
	if err != nil {
		t.Fatalf("cleanupPartialInfrastructureResources() error = %v", err)
	}

	want := []string{"close:storage", "shutdown:executor", "close:cache", "close:database"}
	if !reflect.DeepEqual(calls, want) {
		t.Fatalf("cleanup order = %v, want %v", calls, want)
	}
}

func TestCleanupPartialInfrastructureResourcesPreservesCloseErrors(t *testing.T) {
	t.Parallel()

	var calls []string
	storageErr := errors.New("storage close failed")
	executorErr := errors.New("executor shutdown failed")
	cacheErr := errors.New("cache close failed")
	databaseErr := errors.New("database close failed")

	err := cleanupPartialInfrastructureResources(infrastructureCleanupResources{
		Storage:  &recordCloseResource{name: "storage", calls: &calls, err: storageErr},
		Executor: &recordShutdownResource{name: "executor", calls: &calls, err: executorErr},
		Cache:    &recordCloseResource{name: "cache", calls: &calls, err: cacheErr},
		Database: &recordCloseResource{name: "database", calls: &calls, err: databaseErr},
	})
	if err == nil {
		t.Fatal("cleanupPartialInfrastructureResources() error = nil, want joined error")
	}
	for _, wantErr := range []error{storageErr, executorErr, cacheErr, databaseErr} {
		if !errors.Is(err, wantErr) {
			t.Fatalf("joined error should preserve %v, got %v", wantErr, err)
		}
	}

	want := []string{"close:storage", "shutdown:executor", "close:cache", "close:database"}
	if !reflect.DeepEqual(calls, want) {
		t.Fatalf("cleanup order = %v, want %v", calls, want)
	}
}

func TestMergeInfrastructureCleanupErrorPreservesRunAndCleanupErrors(t *testing.T) {
	t.Parallel()

	runErr := errors.New("initialize storage failed")
	databaseErr := errors.New("database close failed")

	err := mergeInfrastructureCleanupResourcesError(runErr, infrastructureCleanupResources{
		Database: &recordCloseResource{err: databaseErr},
	})
	if !errors.Is(err, runErr) {
		t.Fatalf("merged error should preserve run error, got %v", err)
	}
	if !errors.Is(err, databaseErr) {
		t.Fatalf("merged error should preserve cleanup error, got %v", err)
	}
	if !strings.Contains(err.Error(), "cleanup partial infrastructure") {
		t.Fatalf("merged error should include cleanup context, got %v", err)
	}
}

type recordCloseResource struct {
	name  string
	calls *[]string
	err   error
}

func (r *recordCloseResource) Close() error {
	if r.calls != nil {
		*r.calls = append(*r.calls, "close:"+r.name)
	}
	return r.err
}

type recordShutdownResource struct {
	name  string
	calls *[]string
	err   error
}

func (r *recordShutdownResource) Shutdown() error {
	if r.calls != nil {
		*r.calls = append(*r.calls, "shutdown:"+r.name)
	}
	return r.err
}
