package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"budgetyar-backend/pkg/finance"
	"budgetyar-backend/pkg/platform"
	"github.com/jackc/pgx/v5"
)

const maxSnapshotBytes = 2 << 20

type syncRequest struct {
	ExpectedVersion int64           `json:"expectedVersion"`
	Data            json.RawMessage `json:"data"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	cfg, err := platform.LoadConfig()
	if err != nil {
		platform.WriteError(w, http.StatusServiceUnavailable, "backend is not configured")
		return
	}
	platform.RequireAuth(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		store, err := platform.OpenStore(r.Context(), cfg.DatabaseURL)
		if err != nil {
			platform.WriteError(w, http.StatusServiceUnavailable, "database is unavailable")
			return
		}
		account, err := store.AccountForSession(r.Context(), r.Header.Get("X-Budgetyar-Session"))
		if errors.Is(err, platform.ErrInvalidCredentials) {
			platform.WriteError(w, http.StatusUnauthorized, "session expired")
			return
		}
		if err != nil {
			platform.WriteError(w, http.StatusInternalServerError, "could not load account")
			return
		}
		switch r.Method {
		case http.MethodGet:
			snapshot, err := store.LoadSnapshot(r.Context(), account.ID)
			if errors.Is(err, pgx.ErrNoRows) {
				platform.WriteError(w, http.StatusNotFound, "no cloud snapshot exists")
				return
			}
			if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not load snapshot")
				return
			}
			platform.WriteJSON(w, http.StatusOK, snapshot)
		case http.MethodPut:
			r.Body = http.MaxBytesReader(w, r.Body, maxSnapshotBytes)
			var request syncRequest
			decoder := json.NewDecoder(r.Body)
			decoder.DisallowUnknownFields()
			if err := decoder.Decode(&request); err != nil || len(request.Data) == 0 {
				platform.WriteError(w, http.StatusBadRequest, "invalid snapshot payload")
				return
			}
			if _, err := finance.DecodeSnapshot(request.Data); err != nil {
				platform.WriteError(w, http.StatusBadRequest, "invalid Budgetyar data")
				return
			}
			snapshot, err := store.SaveSnapshot(r.Context(), account.ID, request.ExpectedVersion, request.Data)
			if errors.Is(err, platform.ErrVersionConflict) {
				platform.WriteError(w, http.StatusConflict, "cloud snapshot changed; download it before uploading again")
				return
			}
			if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not save snapshot")
				return
			}
			platform.WriteJSON(w, http.StatusOK, map[string]any{
				"version":   snapshot.Version,
				"updatedAt": snapshot.UpdatedAt,
			})
		default:
			w.Header().Set("Allow", "GET, PUT")
			platform.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})).ServeHTTP(w, r)
}
