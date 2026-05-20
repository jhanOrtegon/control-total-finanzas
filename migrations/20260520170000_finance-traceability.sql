-- Fase 2-5: trazabilidad, cierres mensuales y presupuesto por categoría

CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  balance_after numeric NOT NULL CHECK (balance_after >= 0),
  expense_id uuid,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_user_paid
  ON debt_payments (user_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt
  ON debt_payments (debt_id);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  year integer NOT NULL CHECK (year >= 2000),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  total_income numeric NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  savings_goal numeric NOT NULL DEFAULT 0,
  total_outstanding_debt numeric NOT NULL DEFAULT 0,
  real_available_cash numeric NOT NULL DEFAULT 0,
  dti_ratio numeric NOT NULL DEFAULT 0,
  notes text,
  closed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_period
  ON monthly_snapshots (user_id, year DESC, month DESC);

CREATE TABLE IF NOT EXISTS category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  category character varying NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user
  ON category_budgets (user_id);
