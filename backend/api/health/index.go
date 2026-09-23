package handler

import (
	"net/http"
	"os"

	"budgetyar-backend/internal/platform"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		platform.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	_, err := platform.LoadConfig()
	platform.WriteJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"configured": err == nil,
		"service":    "budgetyar-backend",
		"revision":   os.Getenv("VERCEL_GIT_COMMIT_SHA"),
	})
}
