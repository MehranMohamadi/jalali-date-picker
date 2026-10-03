-- Billing is account-owned. Apply after 002_accounts.sql.
CREATE TABLE budgetyar_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES budgetyar_users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_provider TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR started_at IS NOT NULL),
  CHECK (expires_at IS NULL OR expires_at > started_at)
);
CREATE UNIQUE INDEX budgetyar_subscriptions_provider_id_idx
  ON budgetyar_subscriptions(payment_provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX budgetyar_subscriptions_status_expiry_idx ON budgetyar_subscriptions(status, expires_at);

CREATE TABLE budgetyar_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES budgetyar_users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES budgetyar_subscriptions(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  provider_reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_payment_id),
  UNIQUE (provider, provider_reference_id)
);
CREATE INDEX budgetyar_payments_user_created_idx ON budgetyar_payments(user_id, created_at DESC);
CREATE UNIQUE INDEX budgetyar_payments_one_pending_idx ON budgetyar_payments(user_id) WHERE status = 'pending';
