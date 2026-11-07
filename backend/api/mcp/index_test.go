package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"budgetyar-backend/pkg/platform"
)

type fakeStore struct {
	snapshots map[string]platform.Snapshot
	saves     int
	conflict  bool
}

func (s *fakeStore) AccountForMCPToken(_ context.Context, token string) (string, bool, error) {
	switch token {
	case "alice-write":
		return "alice", true, nil
	case "alice-read":
		return "alice", false, nil
	case "bob-write":
		return "bob", true, nil
	}
	return "", false, platform.ErrInvalidCredentials
}
func (s *fakeStore) LoadSnapshot(_ context.Context, id string) (platform.Snapshot, error) {
	v, ok := s.snapshots[id]
	if !ok {
		return v, errors.New("missing")
	}
	return v, nil
}
func (s *fakeStore) SaveSnapshot(_ context.Context, id string, version int64, data json.RawMessage) (platform.Snapshot, error) {
	if s.conflict || s.snapshots[id].Version != version {
		return platform.Snapshot{}, platform.ErrVersionConflict
	}
	v := platform.Snapshot{Version: version + 1, UpdatedAt: time.Now(), Data: data}
	s.snapshots[id] = v
	s.saves++
	return v, nil
}
func (s *fakeStore) Audit(context.Context, string, string, any) {}

const data = `{"app":"budgetyar","version":1,"transactions":[{"id":1,"type":"expense","title":"Lunch","amount":100,"date":"1405/01/01","category":"food"}],"categories":[{"key":"food","label":"Food"}],"budgets":[],"future":{"large":1234567890123456789}}`

func newFake() *fakeStore {
	return &fakeStore{snapshots: map[string]platform.Snapshot{"alice": {Version: 2, Data: json.RawMessage(data)}, "bob": {Version: 9, Data: json.RawMessage(data)}}}
}
func rpc(t *testing.T, h http.Handler, token, method string, params any) (int, string) {
	t.Helper()
	payload, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
	req := httptest.NewRequest("POST", "http://localhost/api/mcp", strings.NewReader(string(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.Header.Set("MCP-Protocol-Version", "2025-03-26")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w.Code, w.Body.String()
}
func TestAccountIsolationAndFullJSON(t *testing.T) {
	s := newFake()
	h := newMCPHandler(s)
	for _, tt := range []struct {
		token   string
		version string
	}{{"alice-read", `"version":2`}, {"bob-write", `"version":9`}} {
		status, body := rpc(t, h, tt.token, "tools/call", map[string]any{"name": "finance_snapshot_get", "arguments": map[string]any{}})
		if status != 200 || !strings.Contains(body, tt.version) || !strings.Contains(body, "1234567890123456789") {
			t.Fatalf("%d %s", status, body)
		}
	}
	status, _ := rpc(t, h, "expired", "tools/list", map[string]any{})
	if status != 401 {
		t.Fatal(status)
	}
}
func TestWritePermissionsAndConflicts(t *testing.T) {
	for _, tt := range []struct {
		name, token string
		version     int
		race        bool
		wantSaves   int
	}{{"read-only", "alice-read", 2, false, 0}, {"stale", "alice-write", 1, false, 0}, {"race", "alice-write", 2, true, 0}, {"success", "alice-write", 2, false, 1}} {
		t.Run(tt.name, func(t *testing.T) {
			s := newFake()
			s.conflict = tt.race
			h := newMCPHandler(s)
			status, body := rpc(t, h, tt.token, "tools/call", map[string]any{"name": "budgets_update", "arguments": map[string]any{"expectedVersion": tt.version, "changes": []any{map[string]any{"category": "food", "budget": 400}}}})
			if status != 200 || s.saves != tt.wantSaves {
				t.Fatalf("%d %s saves=%d", status, body, s.saves)
			}
			if tt.wantSaves == 0 && !strings.Contains(body, `"isError":true`) {
				t.Fatal(body)
			}
			if tt.wantSaves == 1 && (s.snapshots["alice"].Version != 3 || s.snapshots["bob"].Version != 9) {
				t.Fatal("account isolation failed")
			}
		})
	}
}
func TestAdvertisedTools(t *testing.T) {
	status, body := rpc(t, newMCPHandler(newFake()), "alice-read", "tools/list", map[string]any{})
	if status != 200 {
		t.Fatal(status, body)
	}
	for _, name := range []string{"finance_snapshot_get", "budgets_update", "categories_create", "categories_update", "transactions_update"} {
		if !strings.Contains(body, name) {
			t.Fatal("missing tool", name, body)
		}
	}
}
