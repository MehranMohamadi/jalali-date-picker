package platform

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

var ErrPaymentNotFound = errors.New("payment not found")
var ErrPaymentConflict = errors.New("payment conflict")

// StartTestPayment atomically reserves one pending payment for the account.
func (s *Store) StartTestPayment(ctx context.Context, userID string, config TestBillingConfig) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil { return "", err }
	defer tx.Rollback(ctx)
	// A user row lock serializes concurrent starts for the same account.
	var id string
	if err = tx.QueryRow(ctx, `SELECT id FROM budgetyar_users WHERE id = $1 FOR UPDATE`, userID).Scan(&id); err != nil { return "", err }
	var status string
	var expires *time.Time
	err = tx.QueryRow(ctx, `SELECT status, expires_at FROM budgetyar_subscriptions WHERE user_id = $1`, userID).Scan(&status, &expires)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) { return "", err }
	if (status == string(SubscriptionActive) || status == string(SubscriptionCancelled)) && (expires == nil || expires.After(time.Now())) { return "", ErrPaymentConflict }
	var pendingID string
	err = tx.QueryRow(ctx, `SELECT id FROM budgetyar_payments WHERE user_id = $1 AND status = 'pending'`, userID).Scan(&pendingID)
	if err == nil { return pendingID, tx.Commit(ctx) }
	if !errors.Is(err, pgx.ErrNoRows) { return "", err }
	subscriptionID, err := newRandomHex(16)
	if err != nil { return "", err }
	_, err = tx.Exec(ctx, `INSERT INTO budgetyar_subscriptions (id, user_id, plan, status, payment_provider)
		VALUES ($1, $2, 'pro', 'pending', 'test') ON CONFLICT (user_id) DO UPDATE SET
		status = 'pending', started_at = NULL, expires_at = NULL, cancelled_at = NULL,
		payment_provider = 'test', updated_at = NOW()`, "sub-"+subscriptionID, userID)
	if err != nil { return "", err }
	var actualID string
	if err = tx.QueryRow(ctx, `SELECT id FROM budgetyar_subscriptions WHERE user_id = $1`, userID).Scan(&actualID); err != nil { return "", err }
	paymentID, err := newRandomHex(16)
	if err != nil { return "", err }
	paymentID = "pay-" + paymentID
	_, err = tx.Exec(ctx, `INSERT INTO budgetyar_payments (id, user_id, subscription_id, amount, currency, status, provider, provider_payment_id)
		VALUES ($1, $2, $3, $4, $5, 'pending', 'test', $1)`, paymentID, userID, actualID, config.Amount, config.Currency)
	if err != nil { return "", err }
	return paymentID, tx.Commit(ctx)
}

// ResolveTestPayment models a provider's verified result. The account lock and
// pending guard make repeated confirmation idempotent, including concurrent calls.
func (s *Store) ResolveTestPayment(ctx context.Context, userID, paymentID, outcome string, config TestBillingConfig) (PaymentStatus, error) {
	if outcome != "paid" && outcome != "failed" && outcome != "cancelled" { return "", ErrPaymentConflict }
	tx, err := s.pool.Begin(ctx)
	if err != nil { return "", err }
	defer tx.Rollback(ctx)
	var id string
	if err = tx.QueryRow(ctx, `SELECT id FROM budgetyar_users WHERE id = $1 FOR UPDATE`, userID).Scan(&id); err != nil { return "", err }
	var status string
	var subscriptionID string
	var amount int64
	var currency string
	err = tx.QueryRow(ctx, `SELECT status, subscription_id, amount, currency FROM budgetyar_payments
		WHERE id = $1 AND user_id = $2 AND provider = 'test' FOR UPDATE`, paymentID, userID).
		Scan(&status, &subscriptionID, &amount, &currency)
	if errors.Is(err, pgx.ErrNoRows) { return "", ErrPaymentNotFound }
	if err != nil { return "", err }
	if status != string(PaymentPending) { return PaymentStatus(status), tx.Commit(ctx) }
	if outcome == "paid" && (amount != config.Amount || currency != config.Currency) { return "", ErrPaymentConflict }
	_, err = tx.Exec(ctx, `UPDATE budgetyar_payments SET status = $2,
		paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE NULL END,
		failed_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE NULL END,
		provider_reference_id = CASE WHEN $2 = 'paid' THEN id ELSE NULL END
		WHERE id = $1`, paymentID, outcome)
	if err != nil { return "", err }
	if outcome == "paid" {
		_, err = tx.Exec(ctx, `UPDATE budgetyar_subscriptions SET status = 'active', started_at = NOW(),
			expires_at = NOW() + ($2 * INTERVAL '1 day'), cancelled_at = NULL, updated_at = NOW()
			WHERE id = $1 AND user_id = $3`, subscriptionID, config.DurationDays, userID)
	} else {
		_, err = tx.Exec(ctx, `UPDATE budgetyar_subscriptions SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND user_id = $2`, subscriptionID, userID)
	}
	if err != nil { return "", err }
	return PaymentStatus(outcome), tx.Commit(ctx)
}
