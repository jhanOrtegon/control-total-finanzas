import { insforge } from "@/lib/insforge";

export async function clearUserData(userId: string) {
  try {
    // The exact tables we have from the schema are:
    // user_budgets, expenses, debts, debt_payments, monthly_snapshots, category_budgets
    
    await insforge.database.from("debt_payments").delete().eq("user_id", userId);
    await insforge.database.from("debts").delete().eq("user_id", userId);
    await insforge.database.from("expenses").delete().eq("user_id", userId);
    await insforge.database.from("monthly_snapshots").delete().eq("user_id", userId);
    await insforge.database.from("category_budgets").delete().eq("user_id", userId);
    
    // Keep the user_budget but reset it to defaults
    await insforge.database.from("user_budgets").update({
      monthly_income: 2000000,
      monthly_budget: 1500000,
      monthly_savings_goal: 500000
    }).eq("user_id", userId);

    return true;
  } catch (error) {
    console.error("Error clearing user data", error);
    return false;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInMonth(year: number, month: number) {
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function seedMockData(userId: string) {
  try {
    await clearUserData(userId);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 1. Configs
    const configExpenses = [
      { user_id: userId, title: "CONFIG:PROFILE_TYPE", amount: 0, category: "empleado", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: "CONFIG:CONTRACT_TYPE", amount: 0, category: "indefinido", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear - 5}`, amount: 2000000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear - 4}`, amount: 2200000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear - 3}`, amount: 2500000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear - 2}`, amount: 3000000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear - 1}`, amount: 3500000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
      { user_id: userId, title: `CONFIG:SALARY:${currentYear}`, amount: 4200000, category: "SYSTEM", type: "one-time", status: "paid", due_date: null, paid_date: now.toISOString() },
    ];

    // 2. Expenses & Incomes
    const categories = ["Comida", "Transporte", "Servicios", "Entretenimiento", "Salud", "Educación", "Compras", "Hogar"];
    const expenses = [];
    const snapshots = [];

    let totalSaved = 0;

    for (let i = 60; i >= 0; i--) {
      // 20% chance to completely skip a month to simulate real-life gaps
      if (randomInt(1, 100) <= 20 && i !== 0) continue;

      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      
      // Randomize salary per year (between 1.5M and 5M)
      // but try to keep it somewhat consistent per year by seeding with 'y'
      const baseSalary = 1500000 + ((y % 2020) * 500000);
      const salary = baseSalary + randomInt(0, 5) * 100000;
      let monthSpent = 0;

      // Random amount of expenses: between 0 and 20
      const numExpenses = randomInt(0, 20);
      for (let j = 0; j < numExpenses; j++) {
        const cat = categories[randomInt(0, categories.length - 1)];
        // Random amount between 5,000 and 500,000
        const amount = randomInt(5, 500) * 1000;
        const dateStr = randomDateInMonth(y, m);
        monthSpent += amount;
        expenses.push({
          user_id: userId,
          title: `Gasto ${cat} ${j + 1}`,
          amount,
          category: cat,
          type: "one-time",
          status: "paid",
          due_date: dateStr,
          paid_date: new Date(`${dateStr}T12:00:00Z`).toISOString(),
        });
      }

      // Add recurrent expenses only 80% of the time to simulate starting/canceling subscriptions
      if (randomInt(1, 100) <= 80) {
        const recurrents = [
          { title: "Suscripción Netflix", amount: 40000, category: "Entretenimiento" },
          { title: "Plan Celular", amount: 60000, category: "Servicios" },
          { title: "Internet Hogar", amount: 120000, category: "Servicios" }
        ];
        for (const rec of recurrents) {
          // 10% chance to skip a specific recurrent expense
          if (randomInt(1, 100) <= 10) continue;
          monthSpent += rec.amount;
          const dateStr = `${y}-${String(m).padStart(2, "0")}-05`;
          expenses.push({
            user_id: userId,
            title: rec.title,
            amount: rec.amount,
            category: rec.category,
            type: "recurrent",
            status: "paid",
            due_date: dateStr,
            paid_date: new Date(`${dateStr}T12:00:00Z`).toISOString(),
          });
        }
      }

      // Occasional extra income (35% chance)
      let extraIncome = 0;
      if (randomInt(1, 100) <= 35) {
        extraIncome = randomInt(1, 10) * 100000;
        const dateStr = randomDateInMonth(y, m);
        expenses.push({
          user_id: userId,
          title: "Bono / Ingreso Extra",
          amount: extraIncome,
          category: "Ingresos",
          type: "one-time",
          status: "paid",
          due_date: dateStr,
          paid_date: new Date(`${dateStr}T12:00:00Z`).toISOString(),
          target_month: `${y}-${String(m).padStart(2, "0")}`
        });
      }

      // Monthly Snapshot (only for past months, and 90% chance to actually close it)
      if (i > 0 && randomInt(1, 100) <= 90) {
        const realAvailableCash = (salary + extraIncome) - monthSpent - 500000; 
        totalSaved += 500000 + (realAvailableCash > 0 ? realAvailableCash : 0);
        snapshots.push({
          user_id: userId,
          year: y,
          month: m,
          total_income: salary + extraIncome,
          total_spent: monthSpent,
          savings_goal: 500000,
          total_outstanding_debt: randomInt(0, 10000000), // Random debt snapshot
          real_available_cash: realAvailableCash,
          dti_ratio: randomInt(0, 40), // Random DTI
          closed_at: new Date(y, m, 0, 23, 59, 59).toISOString()
        });
      }
    }

    // 3. System logs
    for(let i=0; i<30; i++) {
        const dateStr = randomDateInMonth(currentYear, currentMonth);
        expenses.push({
            user_id: userId,
            title: `LOG:PRUEBA|||Mensaje de log generado de prueba #${i}`,
            amount: 0,
            category: "LOG",
            type: "one-time",
            status: "paid",
            due_date: dateStr,
            paid_date: new Date(`${dateStr}T12:00:00Z`).toISOString(),
        });
    }

    // Insert Configs & Expenses
    const allExpenses = [...configExpenses, ...expenses];
    // Supabase allows bulk inserts. Better to chunk them if too large.
    const chunkArray = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    for (const chunk of chunkArray(allExpenses, 100)) {
      await insforge.database.from("expenses").insert(chunk);
    }
    
    for (const chunk of chunkArray(snapshots, 100)) {
        await insforge.database.from("monthly_snapshots").insert(chunk);
    }

    // 4. Debts
    const debts = [
      {
        user_id: userId,
        title: "Crédito Vehículo",
        total_amount: 30000000,
        remaining_amount: 15000000,
        minimum_payment: 850000,
        due_date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-15`,
        installments: 36,
        start_month: `${currentYear - 1}-${String(currentMonth).padStart(2, "0")}`,
      },
      {
        user_id: userId,
        title: "Tarjeta de Crédito (Pagada)",
        total_amount: 2000000,
        remaining_amount: 0,
        minimum_payment: 150000,
        due_date: `${currentYear - 1}-12-05`,
        installments: 12,
        start_month: `${currentYear - 2}-12`,
      },
      {
        user_id: userId,
        title: "Computador Cuotas",
        total_amount: 4500000,
        remaining_amount: 4500000,
        minimum_payment: 380000,
        due_date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-05`,
        installments: 12,
        start_month: `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
      }
    ];

    const { data: insertedDebts } = await insforge.database.from("debts").insert(debts).select();

    // 5. Category budgets limits
    const limits = [
      { user_id: userId, category: "Comida", monthly_limit: 800000 },
      { user_id: userId, category: "Transporte", monthly_limit: 300000 },
      { user_id: userId, category: "Servicios", monthly_limit: 400000 },
      { user_id: userId, category: "Entretenimiento", monthly_limit: 500000 },
    ];
    await insforge.database.from("category_budgets").insert(limits);

    // Update user budget
    await insforge.database.from("user_budgets").update({
      monthly_income: 4200000,
      monthly_budget: 2500000,
      monthly_savings_goal: 500000
    }).eq("user_id", userId);

    return true;
  } catch (error) {
    console.error("Error seeding mock data", error);
    return false;
  }
}

export async function exportBackup(userId: string) {
  try {
    const { data: user_budgets } = await insforge.database.from("user_budgets").select("*").eq("user_id", userId);
    const { data: category_budgets } = await insforge.database.from("category_budgets").select("*").eq("user_id", userId);
    const { data: expenses } = await insforge.database.from("expenses").select("*").eq("user_id", userId);
    const { data: debts } = await insforge.database.from("debts").select("*").eq("user_id", userId);
    const { data: debt_payments } = await insforge.database.from("debt_payments").select("*").eq("user_id", userId);
    const { data: monthly_snapshots } = await insforge.database.from("monthly_snapshots").select("*").eq("user_id", userId);

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user_budgets: user_budgets || [],
      category_budgets: category_budgets || [],
      expenses: expenses || [],
      debts: debts || [],
      debt_payments: debt_payments || [],
      monthly_snapshots: monthly_snapshots || []
    };

    return backupData;
  } catch (error) {
    console.error("Error exporting backup", error);
    return null;
  }
}

export async function importBackup(userId: string, backupData: any) {
  try {
    if (!backupData || backupData.version !== 1) {
      console.error("Formato de backup inválido.");
      return false;
    }

    // Limpiar base actual
    await clearUserData(userId);

    const mapUserId = (items: any[]) => items.map(item => ({ ...item, user_id: userId }));

    // Restaurar categoría presupuestos
    if (backupData.category_budgets?.length) {
      const mapped = mapUserId(backupData.category_budgets);
      await insforge.database.from("category_budgets").insert(mapped);
    }

    // Restaurar presupuesto de usuario (Update existing since clearUserData resets it instead of deleting it)
    if (backupData.user_budgets?.length) {
      const ub = backupData.user_budgets[0];
      await insforge.database.from("user_budgets").update({
        monthly_income: ub.monthly_income,
        monthly_budget: ub.monthly_budget,
        monthly_savings_goal: ub.monthly_savings_goal
      }).eq("user_id", userId);
    }

    // Chunk insert helper
    const chunkArray = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );

    // Restaurar expenses
    if (backupData.expenses?.length) {
      const mapped = mapUserId(backupData.expenses);
      for (const chunk of chunkArray(mapped, 100)) {
        await insforge.database.from("expenses").insert(chunk);
      }
    }

    // Restaurar debts
    if (backupData.debts?.length) {
      const mapped = mapUserId(backupData.debts);
      for (const chunk of chunkArray(mapped, 50)) {
        await insforge.database.from("debts").insert(chunk);
      }
    }

    // Restaurar debt payments
    if (backupData.debt_payments?.length) {
      const mapped = mapUserId(backupData.debt_payments);
      for (const chunk of chunkArray(mapped, 100)) {
        await insforge.database.from("debt_payments").insert(chunk);
      }
    }

    // Restaurar monthly snapshots
    if (backupData.monthly_snapshots?.length) {
      const mapped = mapUserId(backupData.monthly_snapshots);
      for (const chunk of chunkArray(mapped, 50)) {
        await insforge.database.from("monthly_snapshots").insert(chunk);
      }
    }

    return true;
  } catch (error) {
    console.error("Error importing backup", error);
    return false;
  }
}
