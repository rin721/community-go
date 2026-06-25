package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteSSEWritesEventAndFlushes(t *testing.T) {
	recorder := httptest.NewRecorder()

	if err := writeSSE(recorder, recorder, "ready", map[string]string{"status": "ok"}); err != nil {
		t.Fatalf("writeSSE() error = %v", err)
	}

	body := recorder.Body.String()
	if !strings.Contains(body, "event: ready\n") || !strings.Contains(body, `data: {"status":"ok"}`) {
		t.Fatalf("writeSSE() body = %q, want event and json data", body)
	}
	if !recorder.Flushed {
		t.Fatal("writeSSE() should flush the stream")
	}
}

func TestWriteSSEReturnsEventWriteError(t *testing.T) {
	writeErr := errors.New("client disconnected")
	writer := &failingSSEWriter{failAt: 1, err: writeErr}

	err := writeSSE(writer, writer, "ready", map[string]string{"status": "ok"})

	if !errors.Is(err, writeErr) {
		t.Fatalf("writeSSE() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write sse event") {
		t.Fatalf("writeSSE() error missing event context: %v", err)
	}
	if writer.flushed {
		t.Fatal("writeSSE() should not flush after event write failure")
	}
}

func TestWriteSSEReturnsDataWriteError(t *testing.T) {
	writeErr := errors.New("client disconnected")
	writer := &failingSSEWriter{failAt: 2, err: writeErr}

	err := writeSSE(writer, writer, "update", map[string]string{"status": "changed"})

	if !errors.Is(err, writeErr) {
		t.Fatalf("writeSSE() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write sse data") {
		t.Fatalf("writeSSE() error missing data context: %v", err)
	}
	if writer.flushed {
		t.Fatal("writeSSE() should not flush after data write failure")
	}
}

type failingSSEWriter struct {
	header  http.Header
	failAt  int
	writes  int
	err     error
	flushed bool
}

func (w *failingSSEWriter) Header() http.Header {
	if w.header == nil {
		w.header = http.Header{}
	}
	return w.header
}

func (w *failingSSEWriter) Write(data []byte) (int, error) {
	w.writes++
	if w.failAt == w.writes {
		return 0, w.err
	}
	return len(data), nil
}

func (w *failingSSEWriter) WriteHeader(int) {}

func (w *failingSSEWriter) Flush() {
	w.flushed = true
}
