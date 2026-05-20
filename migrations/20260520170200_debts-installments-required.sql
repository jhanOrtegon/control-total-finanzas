-- Enforce installments as required with safe defaults

UPDATE debts
SET installments = 1
WHERE installments IS NULL OR installments <= 0;

ALTER TABLE debts
ALTER COLUMN installments SET DEFAULT 1;

ALTER TABLE debts
ALTER COLUMN installments SET NOT NULL;
