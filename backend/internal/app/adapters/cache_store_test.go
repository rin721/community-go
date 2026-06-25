package adapters

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/open-console/console-platform/pkg/cache"
)

func TestJSONCacheStoreIncrReturnsTTLFailure(t *testing.T) {
	ttlErr := errors.New("expire failed")
	inner := &fakeCache{incrValue: 3, expireErr: ttlErr}
	store := NewJSONCacheStore(inner)

	next, err := store.Incr(context.Background(), "iam:login:failures:1", time.Minute)
	if next != 3 {
		t.Fatalf("Incr() next = %d, want partial counter value 3", next)
	}
	if !errors.Is(err, ttlErr) {
		t.Fatalf("Incr() error = %v, want ttl error", err)
	}
	if !inner.expireCalled {
		t.Fatal("Incr() should attempt to apply ttl when ttl > 0")
	}
}

func TestJSONCacheStoreIncrSkipsTTLWhenUnset(t *testing.T) {
	inner := &fakeCache{incrValue: 5, expireErr: errors.New("should not be called")}
	store := NewJSONCacheStore(inner)

	next, err := store.Incr(context.Background(), "iam:epoch:users", 0)
	if err != nil {
		t.Fatalf("Incr() error = %v", err)
	}
	if next != 5 {
		t.Fatalf("Incr() next = %d, want 5", next)
	}
	if inner.expireCalled {
		t.Fatal("Incr() should not apply ttl when ttl is zero")
	}
}

type fakeCache struct {
	incrValue    int64
	incrErr      error
	expireErr    error
	expireCalled bool
}

var _ cache.Cache = (*fakeCache)(nil)

func (c *fakeCache) Get(context.Context, string) (string, error) {
	return "", errors.New("not implemented")
}

func (c *fakeCache) Set(context.Context, string, interface{}, time.Duration) error {
	return errors.New("not implemented")
}

func (c *fakeCache) Delete(context.Context, ...string) error {
	return errors.New("not implemented")
}

func (c *fakeCache) Exists(context.Context, ...string) (int64, error) {
	return 0, errors.New("not implemented")
}

func (c *fakeCache) MGet(context.Context, ...string) ([]interface{}, error) {
	return nil, errors.New("not implemented")
}

func (c *fakeCache) MSet(context.Context, ...interface{}) error {
	return errors.New("not implemented")
}

func (c *fakeCache) Expire(context.Context, string, time.Duration) error {
	c.expireCalled = true
	return c.expireErr
}

func (c *fakeCache) TTL(context.Context, string) (time.Duration, error) {
	return 0, errors.New("not implemented")
}

func (c *fakeCache) Incr(context.Context, string) (int64, error) {
	return c.incrValue, c.incrErr
}

func (c *fakeCache) Decr(context.Context, string) (int64, error) {
	return 0, errors.New("not implemented")
}

func (c *fakeCache) IncrBy(context.Context, string, int64) (int64, error) {
	return 0, errors.New("not implemented")
}

func (c *fakeCache) Ping(context.Context) error {
	return nil
}

func (c *fakeCache) Close() error {
	return nil
}

func (c *fakeCache) Reload(context.Context, *cache.Config) error {
	return nil
}
