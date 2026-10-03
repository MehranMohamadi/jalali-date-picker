package platform

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Requires a disposable database with migrations 001–003 already applied.
func TestBillingPaymentLifecycle(t *testing.T) {
	url := os.Getenv("BUDGETYAR_TEST_DATABASE_URL")
	if url == "" { t.Skip("BUDGETYAR_TEST_DATABASE_URL is not set") }
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, url)
	if err != nil { t.Fatal(err) }
	defer pool.Close()
	store := &Store{pool: pool}
	suffix, err := newRandomHex(8)
	if err != nil { t.Fatal(err) }
	userA, userB := "user-test-"+suffix+"a", "user-test-"+suffix+"b"
	for _, id := range []string{userA, userB} {
		_, err = pool.Exec(ctx, `INSERT INTO budgetyar_users (id, username, full_name, password_hash) VALUES ($1, $1, 'Test', 'test-only')`, id)
		if err != nil { t.Fatal(err) }
		t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM budgetyar_users WHERE id = $1`, id) })
	}
	config := TestBillingConfig{Amount: 100, Currency: "USD", DurationDays: 30}
	state, err := store.BillingStateForUser(ctx, userA, &config)
	if err != nil || state.Plan != Free || state.Subscription != nil { t.Fatalf("new account: %+v, %v", state, err) }
	id, err := store.StartTestPayment(ctx, userA, config)
	if err != nil { t.Fatal(err) }
	again, err := store.StartTestPayment(ctx, userA, config)
	if err != nil || id != again { t.Fatalf("pending payment was duplicated: %s %s %v", id, again, err) }
	if _, err = store.ResolveTestPayment(ctx, userB, id, "paid", config); !errors.Is(err, ErrPaymentNotFound) { t.Fatalf("other user resolved payment: %v", err) }
	status, err := store.ResolveTestPayment(ctx, userA, id, "paid", config)
	if err != nil || status != PaymentPaid { t.Fatalf("payment did not verify: %s %v", status, err) }
	state, err = store.BillingStateForUser(ctx, userA, &config)
	if err != nil || state.Plan != Pro || state.Subscription == nil { t.Fatalf("Pro not activated: %+v %v", state, err) }
	expiresAt := *state.Subscription.ExpiresAt
	status, err = store.ResolveTestPayment(ctx, userA, id, "paid", config)
	if err != nil || status != PaymentPaid { t.Fatalf("repeated callback failed: %s %v", status, err) }
	state, err = store.BillingStateForUser(ctx, userA, &config)
	if err != nil || !state.Subscription.ExpiresAt.Equal(expiresAt) { t.Fatalf("repeated callback extended Pro: %+v %v", state, err) }
	if _, err = store.StartTestPayment(ctx, userA, config); !errors.Is(err, ErrPaymentConflict) { t.Fatalf("active user started another payment: %v", err) }
	_, err = pool.Exec(ctx, `UPDATE budgetyar_subscriptions SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`, userA)
	if err != nil { t.Fatal(err) }
	state, err = store.BillingStateForUser(ctx, userA, &config)
	if err != nil || state.Plan != Free || state.Subscription.Status != SubscriptionExpired { t.Fatalf("expiry did not revert to free: %+v %v", state, err) }
	failedID, err := store.StartTestPayment(ctx, userB, config)
	if err != nil { t.Fatal(err) }
	status, err = store.ResolveTestPayment(ctx, userB, failedID, "failed", config)
	if err != nil || status != PaymentFailed { t.Fatalf("failure was not recorded: %s %v", status, err) }
	state, err = store.BillingStateForUser(ctx, userB, &config)
	if err != nil || state.Plan != Free { t.Fatalf("failed payment granted Pro: %+v %v", state, err) }
	cancelID, err := store.StartTestPayment(ctx, userB, config)
	if err != nil || cancelID == failedID { t.Fatalf("could not retry after failure: %s %v", cancelID, err) }
	status, err = store.ResolveTestPayment(ctx, userB, cancelID, "cancelled", config)
	if err != nil || status != PaymentCancelled { t.Fatalf("cancellation was not recorded: %s %v", status, err) }
}
