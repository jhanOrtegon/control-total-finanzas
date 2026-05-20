-- Migration 002: InsForge Realtime triggers (v2 - full row payload)
-- Publishes full row data so the frontend can update state without re-fetching.
-- Channel pattern: finance:{user_id}

-- ─────────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_expense_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'finance:' || COALESCE(NEW.user_id::text, OLD.user_id::text),
    TG_OP || '_expense',
    jsonb_build_object(
      'operation', TG_OP,
      'data', CASE
        WHEN TG_OP = 'DELETE' THEN jsonb_build_object('id', OLD.id, 'user_id', OLD.user_id)
        ELSE jsonb_build_object(
          'id',         NEW.id,
          'user_id',    NEW.user_id,
          'title',      NEW.title,
          'amount',     NEW.amount,
          'category',   NEW.category,
          'type',       NEW.type,
          'status',     NEW.status,
          'due_date',   NEW.due_date,
          'paid_date',  NEW.paid_date,
          'created_at', NEW.created_at
        )
      END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS expense_realtime ON expenses;
CREATE TRIGGER expense_realtime
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION notify_expense_changes();

-- ─────────────────────────────────────────────────────────────
-- DEBTS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_debt_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'finance:' || COALESCE(NEW.user_id::text, OLD.user_id::text),
    TG_OP || '_debt',
    jsonb_build_object(
      'operation', TG_OP,
      'data', CASE
        WHEN TG_OP = 'DELETE' THEN jsonb_build_object('id', OLD.id, 'user_id', OLD.user_id)
        ELSE jsonb_build_object(
          'id',               NEW.id,
          'user_id',          NEW.user_id,
          'title',            NEW.title,
          'total_amount',     NEW.total_amount,
          'remaining_amount', NEW.remaining_amount,
          'minimum_payment',  NEW.minimum_payment,
          'due_date',         NEW.due_date,
          'installments',     NEW.installments,
          'start_month',      NEW.start_month,
          'created_at',       NEW.created_at
        )
      END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS debt_realtime ON debts;
CREATE TRIGGER debt_realtime
  AFTER INSERT OR UPDATE OR DELETE ON debts
  FOR EACH ROW EXECUTE FUNCTION notify_debt_changes();

-- ─────────────────────────────────────────────────────────────
-- DEBT PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_debt_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'finance:' || COALESCE(NEW.user_id::text, OLD.user_id::text),
    TG_OP || '_debt_payment',
    jsonb_build_object(
      'operation', TG_OP,
      'data', jsonb_build_object(
        'id',            COALESCE(NEW.id, OLD.id),
        'user_id',       COALESCE(NEW.user_id, OLD.user_id),
        'debt_id',       COALESCE(NEW.debt_id, OLD.debt_id),
        'amount',        COALESCE(NEW.amount, OLD.amount),
        'balance_after', COALESCE(NEW.balance_after, OLD.balance_after),
        'paid_at',       COALESCE(NEW.paid_at, OLD.paid_at)
      )
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS debt_payment_realtime ON debt_payments;
CREATE TRIGGER debt_payment_realtime
  AFTER INSERT OR UPDATE OR DELETE ON debt_payments
  FOR EACH ROW EXECUTE FUNCTION notify_debt_payment_changes();

-- ─────────────────────────────────────────────────────────────
-- USER BUDGETS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_budget_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'finance:' || COALESCE(NEW.user_id::text, OLD.user_id::text),
    'UPDATE_budget',
    jsonb_build_object(
      'operation', TG_OP,
      'data', jsonb_build_object(
        'id',                   COALESCE(NEW.id, OLD.id),
        'user_id',              COALESCE(NEW.user_id, OLD.user_id),
        'monthly_income',       COALESCE(NEW.monthly_income, OLD.monthly_income),
        'monthly_budget',       COALESCE(NEW.monthly_budget, OLD.monthly_budget),
        'monthly_savings_goal', COALESCE(NEW.monthly_savings_goal, OLD.monthly_savings_goal)
      )
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS budget_realtime ON user_budgets;
CREATE TRIGGER budget_realtime
  AFTER INSERT OR UPDATE ON user_budgets
  FOR EACH ROW EXECUTE FUNCTION notify_budget_changes();

-- ─────────────────────────────────────────────────────────────
-- CATEGORY BUDGETS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_category_budget_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'finance:' || COALESCE(NEW.user_id::text, OLD.user_id::text),
    TG_OP || '_category_budget',
    jsonb_build_object(
      'operation', TG_OP,
      'data', CASE
        WHEN TG_OP = 'DELETE' THEN jsonb_build_object('id', OLD.id, 'user_id', OLD.user_id)
        ELSE jsonb_build_object(
          'id',            NEW.id,
          'user_id',       NEW.user_id,
          'category',      NEW.category,
          'monthly_limit', NEW.monthly_limit,
          'created_at',    NEW.created_at,
          'updated_at',    NEW.updated_at
        )
      END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS category_budget_realtime ON category_budgets;
CREATE TRIGGER category_budget_realtime
  AFTER INSERT OR UPDATE OR DELETE ON category_budgets
  FOR EACH ROW EXECUTE FUNCTION notify_category_budget_changes();
