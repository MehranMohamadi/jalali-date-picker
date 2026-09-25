package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"budgetyar-backend/pkg/platform"
)

type accountRequest struct {
	Action      string `json:"action"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	OldPassword string `json:"oldPassword"`
	FullName    string `json:"fullName"`
	Remember    bool   `json:"remember"`
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
		token := r.Header.Get("X-Budgetyar-Session")
		if r.Method == http.MethodGet {
			account, err := store.AccountForSession(r.Context(), token)
			if errors.Is(err, platform.ErrInvalidCredentials) {
				platform.WriteError(w, http.StatusUnauthorized, "session expired")
			} else if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not load account")
			} else {
				platform.WriteJSON(w, http.StatusOK, map[string]any{"user": account})
			}
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", "GET, POST")
			platform.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 8192)
		var input accountRequest
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil || decoder.Decode(&struct{}{}) != io.EOF {
			platform.WriteError(w, http.StatusBadRequest, "invalid request")
			return
		}
		input.Username = platform.NormalizeUsername(input.Username)
		input.FullName = strings.TrimSpace(input.FullName)
		switch input.Action {
		case "register":
			if !platform.ValidUsername(input.Username) || !platform.ValidPassword(input.Password) || len([]rune(input.FullName)) > 80 {
				platform.WriteError(w, http.StatusBadRequest, "invalid username, password or name")
				return
			}
			if input.FullName == "" {
				input.FullName = input.Username
			}
			account, session, maxAge, err := store.RegisterAccount(r.Context(), input.Username, input.Password, input.FullName, input.Remember)
			if errors.Is(err, platform.ErrAccountExists) {
				platform.WriteError(w, http.StatusConflict, "username is already taken")
			} else if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not register account")
			} else {
				platform.WriteJSON(w, http.StatusCreated, map[string]any{"user": account, "sessionToken": session, "maxAge": maxAge})
			}
		case "login":
			if !platform.ValidUsername(input.Username) || input.Password == "" || len([]byte(input.Password)) > 256 {
				platform.WriteError(w, http.StatusUnauthorized, "invalid credentials")
				return
			}
			account, session, maxAge, err := store.LoginAccount(r.Context(), input.Username, input.Password, input.Remember)
			if errors.Is(err, platform.ErrAccountLocked) {
				platform.WriteError(w, http.StatusTooManyRequests, "too many attempts; try again in 15 minutes")
			} else if errors.Is(err, platform.ErrInvalidCredentials) {
				platform.WriteError(w, http.StatusUnauthorized, "invalid credentials")
			} else if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not log in")
			} else {
				platform.WriteJSON(w, http.StatusOK, map[string]any{"user": account, "sessionToken": session, "maxAge": maxAge})
			}
		default:
			account, err := store.AccountForSession(r.Context(), token)
			if errors.Is(err, platform.ErrInvalidCredentials) {
				platform.WriteError(w, http.StatusUnauthorized, "session expired")
				return
			}
			if err != nil {
				platform.WriteError(w, http.StatusInternalServerError, "could not load account")
				return
			}
			switch input.Action {
			case "logout":
				if err := store.LogoutAccount(r.Context(), token); err != nil {
					platform.WriteError(w, http.StatusInternalServerError, "could not log out")
				} else {
					platform.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
				}
			case "profile":
				if input.FullName == "" || len([]rune(input.FullName)) > 80 {
					platform.WriteError(w, http.StatusBadRequest, "invalid name")
					return
				}
				updated, err := store.UpdateAccountName(r.Context(), account.ID, input.FullName)
				if err != nil {
					platform.WriteError(w, http.StatusInternalServerError, "could not update profile")
				} else {
					platform.WriteJSON(w, http.StatusOK, map[string]any{"user": updated})
				}
			case "password":
				if !platform.ValidPassword(input.Password) || input.Password == input.OldPassword {
					platform.WriteError(w, http.StatusBadRequest, "invalid new password")
					return
				}
				err := store.ChangeAccountPassword(r.Context(), account.ID, token, input.OldPassword, input.Password)
				if errors.Is(err, platform.ErrInvalidCredentials) {
					platform.WriteError(w, http.StatusUnauthorized, "current password is incorrect")
				} else if err != nil {
					platform.WriteError(w, http.StatusInternalServerError, "could not change password")
				} else {
					platform.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
				}
			case "delete":
				err := store.DeleteAccount(r.Context(), account.ID, input.Password)
				if errors.Is(err, platform.ErrInvalidCredentials) {
					platform.WriteError(w, http.StatusUnauthorized, "password is incorrect")
				} else if err != nil {
					platform.WriteError(w, http.StatusInternalServerError, "could not delete account")
				} else {
					platform.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
				}
			default:
				platform.WriteError(w, http.StatusBadRequest, "unknown action")
			}
		}
	})).ServeHTTP(w, r)
}
