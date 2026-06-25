package service

import "testing"

func TestCacheKeyHashFailureWarnsAndFallsBack(t *testing.T) {
	logger := &captureCacheWarningLogger{}
	svc := &service{logger: logger}

	got := svc.hashCacheValue(cacheScopeOrgUsers, map[string]any{"bad": func() {}})
	if got == "" {
		t.Fatalf("hashCacheValue() returned empty key fragment")
	}
	if len(logger.entries) != 1 {
		t.Fatalf("warning count = %d, want 1", len(logger.entries))
	}
	entry := logger.entries[0]
	if entry.message != "iam cache key hash failed" {
		t.Fatalf("warning message = %q, want iam cache key hash failed", entry.message)
	}
	if len(entry.keysAndValues) < 2 || entry.keysAndValues[0] != "key" || entry.keysAndValues[1] != cacheScopeOrgUsers {
		t.Fatalf("warning fields = %#v, want cache scope key", entry.keysAndValues)
	}
}

type captureCacheWarningLogger struct {
	entries []cacheWarningEntry
}

type cacheWarningEntry struct {
	message       string
	keysAndValues []interface{}
}

func (l *captureCacheWarningLogger) Warn(message string, keysAndValues ...interface{}) {
	l.entries = append(l.entries, cacheWarningEntry{
		message:       message,
		keysAndValues: append([]interface{}(nil), keysAndValues...),
	})
}
