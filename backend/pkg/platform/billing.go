package platform

import (
	"context"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Plan string
const (Free Plan = "free"; Pro Plan = "pro")
type SubscriptionStatus string
const (SubscriptionPending SubscriptionStatus = "pending"; SubscriptionActive SubscriptionStatus = "active"; SubscriptionExpired SubscriptionStatus = "expired"; SubscriptionCancelled SubscriptionStatus = "cancelled")
type PaymentStatus string
const (PaymentPending PaymentStatus = "pending"; PaymentPaid PaymentStatus = "paid"; PaymentFailed PaymentStatus = "failed"; PaymentCancelled PaymentStatus = "cancelled")

// Plan catalog is the sole source of feature access. Existing features remain free.
type PlanConfig struct {
	ID Plan `json:"id"`
	Name string `json:"name"`
	Description string `json:"description"`
	Entitlements []string `json:"entitlements"`
	Price *int64 `json:"price"`
	Currency string `json:"currency,omitempty"`
	BillingPeriod string `json:"billingPeriod,omitempty"`
	Status string `json:"status"`
}

var BasePlans = []PlanConfig{
	{ID: Free, Name: "رایگان", Description: "امکانات فعلی بودجه‌یار", Entitlements: []string{"core"}, Status: "available"},
	{ID: Pro, Name: "Pro", Description: "امکانات این طرح هنوز نهایی نشده است", Entitlements: []string{"core"}, Status: "unavailable"},
}

type TestBillingConfig struct { Amount int64; Currency string; DurationDays int }

// Test billing is opt-in and never available in a production deployment.
func LoadTestBillingConfig() *TestBillingConfig {
	if os.Getenv("BUDGETYAR_ENABLE_TEST_PAYMENTS") != "1" || os.Getenv("VERCEL_ENV") == "production" || os.Getenv("GO_ENV") == "production" { return nil }
	amount, amountErr := strconv.ParseInt(os.Getenv("BUDGETYAR_TEST_PRICE"), 10, 64)
	days, daysErr := strconv.Atoi(os.Getenv("BUDGETYAR_TEST_DURATION_DAYS"))
	currency := strings.ToUpper(strings.TrimSpace(os.Getenv("BUDGETYAR_TEST_CURRENCY")))
	if amountErr != nil || daysErr != nil || amount < 1 || days < 1 || days > 366 || len(currency) != 3 { return nil }
	for _, char := range currency { if char < 'A' || char > 'Z' { return nil } }
	return &TestBillingConfig{Amount: amount, Currency: currency, DurationDays: days}
}

func AvailablePlans(test *TestBillingConfig) []PlanConfig {
	plans := make([]PlanConfig, len(BasePlans))
	copy(plans, BasePlans)
	if test != nil {
		amount := test.Amount
		plans[1].Price = &amount
		plans[1].Currency = test.Currency
		plans[1].BillingPeriod = strconv.Itoa(test.DurationDays) + " days (test)"
		plans[1].Status = "test"
	}
	return plans
}

func CanUse(plan Plan, feature string) bool {
	for _, config := range BasePlans {
		if config.ID == plan { for _, allowed := range config.Entitlements { if allowed == feature { return true } } }
	}
	return false
}

type Subscription struct {
	ID string `json:"id"`
	Plan Plan `json:"plan"`
	Status SubscriptionStatus `json:"status"`
	StartedAt *time.Time `json:"startedAt"`
	ExpiresAt *time.Time `json:"expiresAt"`
	CancelledAt *time.Time `json:"cancelledAt"`
}

func EffectivePlan(subscription *Subscription, now time.Time) Plan {
	if subscription != nil && (subscription.Status == SubscriptionActive || subscription.Status == SubscriptionCancelled) && subscription.StartedAt != nil && !subscription.StartedAt.After(now) && (subscription.ExpiresAt == nil || subscription.ExpiresAt.After(now)) { return Pro }
	return Free
}

// PaymentProvider implementations must verify payment with the provider server.
// Browser redirects and callback query parameters are never proof of payment.
type PaymentProvider interface {
	CreatePayment(ctx context.Context, paymentID string, amount int64, currency, callbackURL string) (providerPaymentID, redirectURL string, err error)
	VerifyPayment(ctx context.Context, providerPaymentID string) (providerReferenceID string, paid bool, err error)
}

func (s *Store) BillingForUser(ctx context.Context, userID string) (*Subscription, error) {
	var row Subscription
	var plan, status string
	err := s.pool.QueryRow(ctx, `SELECT id, plan, status, started_at, expires_at, cancelled_at FROM budgetyar_subscriptions WHERE user_id = $1`, userID).
		Scan(&row.ID, &plan, &status, &row.StartedAt, &row.ExpiresAt, &row.CancelledAt)
	if errors.Is(err, pgx.ErrNoRows) { return nil, nil }
	if err != nil { return nil, err }
	row.Plan, row.Status = Plan(plan), SubscriptionStatus(status)
	if row.Status == SubscriptionActive && row.ExpiresAt != nil && !row.ExpiresAt.After(time.Now()) { row.Status = SubscriptionExpired }
	return &row, nil
}

type BillingState struct {
	Plan Plan `json:"plan"`
	Subscription *Subscription `json:"subscription"`
	Entitlements []string `json:"entitlements"`
	Plans []PlanConfig `json:"plans"`
	PendingPaymentID string `json:"pendingPaymentId,omitempty"`
}

func (s *Store) BillingStateForUser(ctx context.Context, userID string, test *TestBillingConfig) (BillingState, error) {
	subscription, err := s.BillingForUser(ctx, userID)
	if err != nil { return BillingState{}, err }
	plan := EffectivePlan(subscription, time.Now())
	entitlements := []string{}
	for _, config := range BasePlans { if config.ID == plan { entitlements = config.Entitlements; break } }
	state := BillingState{Plan: plan, Subscription: subscription, Entitlements: entitlements, Plans: AvailablePlans(test)}
	if subscription != nil && subscription.Status == SubscriptionPending {
		err = s.pool.QueryRow(ctx, `SELECT id FROM budgetyar_payments WHERE user_id = $1 AND status = 'pending'`, userID).Scan(&state.PendingPaymentID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) { return BillingState{}, err }
	}
	return state, nil
}
