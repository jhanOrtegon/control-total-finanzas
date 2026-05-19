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
