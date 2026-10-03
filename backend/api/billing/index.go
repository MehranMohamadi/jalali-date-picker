package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"budgetyar-backend/pkg/platform"
)

type billingRequest struct {
	Action string `json:"action"`
	PaymentID string `json:"paymentId"`
	Outcome string `json:"outcome"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	cfg, err := platform.LoadConfig()
	if err != nil { platform.WriteError(w, 503, "backend is not configured"); return }
	platform.RequireAuth(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		store, err := platform.OpenStore(r.Context(), cfg.DatabaseURL)
		if err != nil { platform.WriteError(w, 503, "database is unavailable"); return }
		account, err := store.AccountForSession(r.Context(), r.Header.Get("X-Budgetyar-Session"))
		if errors.Is(err, platform.ErrInvalidCredentials) { platform.WriteError(w, 401, "session expired"); return }
		if err != nil { platform.WriteError(w, 500, "could not load account"); return }
		test := platform.LoadTestBillingConfig()
		switch r.Method {
		case http.MethodGet:
			state, err := store.BillingStateForUser(r.Context(), account.ID, test)
			if err != nil { platform.WriteError(w, 500, "could not load billing"); return }
			platform.WriteJSON(w, 200, state)
		case http.MethodPost:
			if test == nil { platform.WriteError(w, 503, "payments are unavailable"); return }
			r.Body = http.MaxBytesReader(w, r.Body, 4096)
			var input billingRequest
			decoder := json.NewDecoder(r.Body)
			decoder.DisallowUnknownFields()
			if err := decoder.Decode(&input); err != nil || decoder.Decode(&struct{}{}) != io.EOF { platform.WriteError(w, 400, "invalid request"); return }
			switch input.Action {
			case "start-test":
				id, err := store.StartTestPayment(r.Context(), account.ID, *test)
				if errors.Is(err, platform.ErrPaymentConflict) { platform.WriteError(w, 409, "subscription already active"); return }
				if err != nil { platform.WriteError(w, 500, "could not start payment"); return }
				log.Printf("billing payment=%s outcome=pending", id)
				platform.WriteJSON(w, 200, map[string]string{"paymentId": id})
			case "resolve-test":
				if len(input.PaymentID) != 36 { platform.WriteError(w, 400, "invalid payment"); return }
				status, err := store.ResolveTestPayment(r.Context(), account.ID, input.PaymentID, input.Outcome, *test)
				if errors.Is(err, platform.ErrPaymentNotFound) { platform.WriteError(w, 404, "payment not found"); return }
				if errors.Is(err, platform.ErrPaymentConflict) { platform.WriteError(w, 409, "payment changed"); return }
				if err != nil { platform.WriteError(w, 500, "could not resolve payment"); return }
				log.Printf("billing payment=%s outcome=%s", input.PaymentID, status)
				platform.WriteJSON(w, 200, map[string]any{"status": status})
			default: platform.WriteError(w, 400, "unknown action")
			}
		default:
			w.Header().Set("Allow", "GET, POST")
			platform.WriteError(w, 405, "method not allowed")
		}
	})).ServeHTTP(w, r)
}
