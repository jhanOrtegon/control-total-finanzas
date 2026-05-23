export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  type: "recurrent" | "one-time";
  status: "pending" | "paid";
  due_date: string | null;
  paid_date: string | null;
  target_month?: string | null;
  created_at: string;
}

export interface UserBudget {
  id?: string;
  user_id: string;
  monthly_income: number;
  monthly_budget: number;
  monthly_savings_goal: number;
}

export interface Debt {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  remaining_amount: number;
  minimum_payment: number;
  due_date: string | null;
  installments: number | null;
  start_month: string | null;
  created_at: string;
}

export interface DebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  balance_after: number;
  expense_id: string | null;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface MonthlySnapshot {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_income: number;
  total_spent: number;
  savings_goal: number;
  total_outstanding_debt: number;
  real_available_cash: number;
  dti_ratio: number;
  notes: string | null;
  closed_at: string;
  created_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export type FinancialEventType = "expense" | "income" | "debt_payment";

export interface FinancialEvent {
  id: string;
  type: FinancialEventType;
  date: string;
  title: string;
  amount: number;
  category?: string;
  debtId?: string;
  debtTitle?: string;
  balanceAfter?: number;
  status?: string;
}
