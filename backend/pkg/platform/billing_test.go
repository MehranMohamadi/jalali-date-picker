package platform

import (
	"testing"
	"time"
)

func TestEffectivePlanAndEntitlements(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	start := now.Add(-time.Hour)
	future := now.Add(time.Hour)
	past := now.Add(-time.Minute)
	cases := []struct {
		name string
		subscription *Subscription
		want Plan
	}{
		{"free", nil, Free},
		{"pending", &Subscription{Status: SubscriptionPending}, Free},
		{"active", &Subscription{Status: SubscriptionActive, StartedAt: &start, ExpiresAt: &future}, Pro},
		{"expired", &Subscription{Status: SubscriptionActive, StartedAt: &start, ExpiresAt: &past}, Free},
		{"cancelled-valid", &Subscription{Status: SubscriptionCancelled, StartedAt: &start, ExpiresAt: &future}, Pro},
		{"cancelled-expired", &Subscription{Status: SubscriptionCancelled, StartedAt: &start, ExpiresAt: &past}, Free},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := EffectivePlan(tc.subscription, now); got != tc.want { t.Fatalf("got %s, want %s", got, tc.want) }
		})
	}
	if !CanUse(Free, "core") || !CanUse(Pro, "core") || CanUse(Free, "unknown") || CanUse(Pro, "unknown") { t.Fatal("unexpected entitlement catalog") }
}

func TestTestBillingRequiresExplicitDevelopmentConfiguration(t *testing.T) {
	t.Setenv("BUDGETYAR_ENABLE_TEST_PAYMENTS", "1")
	t.Setenv("BUDGETYAR_TEST_PRICE", "100")
	t.Setenv("BUDGETYAR_TEST_CURRENCY", "USD")
	t.Setenv("BUDGETYAR_TEST_DURATION_DAYS", "30")
	t.Setenv("VERCEL_ENV", "production")
	if LoadTestBillingConfig() != nil { t.Fatal("test billing enabled in production") }
	t.Setenv("VERCEL_ENV", "development")
	if LoadTestBillingConfig() == nil { t.Fatal("test billing did not enable in development") }
	t.Setenv("BUDGETYAR_TEST_PRICE", "")
	if LoadTestBillingConfig() != nil { t.Fatal("test billing enabled without price") }
}
