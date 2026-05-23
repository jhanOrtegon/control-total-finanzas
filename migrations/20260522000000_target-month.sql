-- Añadir campo target_month para asignar egresos e ingresos a un mes específico
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS target_month VARCHAR(7);
