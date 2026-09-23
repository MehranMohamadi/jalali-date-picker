package platform

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL   string
	APIToken      string
	UserID        string
	AllowedOrigin string
}

func LoadConfig() (Config, error) {
	cfg := Config{
		DatabaseURL:   strings.TrimSpace(os.Getenv("DATABASE_URL")),
		APIToken:      strings.TrimSpace(os.Getenv("BUDGETYAR_API_TOKEN")),
		UserID:        strings.TrimSpace(os.Getenv("BUDGETYAR_USER_ID")),
		AllowedOrigin: strings.TrimRight(strings.TrimSpace(os.Getenv("BUDGETYAR_ALLOWED_ORIGIN")), "/"),
	}
	if cfg.UserID == "" {
		cfg.UserID = "owner"
	}
	if cfg.DatabaseURL == "" || len(cfg.APIToken) < 32 {
		return Config{}, errors.New("DATABASE_URL and a BUDGETYAR_API_TOKEN of at least 32 characters are required")
	}
	return cfg, nil
}

func (c Config) Authorize(r *http.Request) bool {
	const prefix = "Bearer "
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, prefix) {
		return false
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	if len(token) != len(c.APIToken) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(token), []byte(c.APIToken)) == 1
}

func (c Config) ApplyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin != "" && c.AllowedOrigin != "" && origin == c.AllowedOrigin {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
	}
	if r.Method == http.MethodOptions {
		if origin == "" || c.AllowedOrigin == "" || origin != c.AllowedOrigin {
			http.Error(w, "origin is not allowed", http.StatusForbidden)
		} else {
			w.WriteHeader(http.StatusNoContent)
		}
		return true
	}
	return false
}

func RequireAuth(cfg Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cfg.ApplyCORS(w, r) {
			return
		}
		if !cfg.Authorize(r) {
			w.Header().Set("WWW-Authenticate", `Bearer realm="budgetyar"`)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
