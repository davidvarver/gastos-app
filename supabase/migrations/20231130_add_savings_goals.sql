-- Add columns for Savings Goals to the accounts table

ALTER TABLE public.accounts
ADD COLUMN is_savings_goal BOOLEAN DEFAULT FALSE,
ADD COLUMN target_amount NUMERIC(15, 2),
ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;

-- Optional: Add index if we query goals often
CREATE INDEX idx_accounts_is_savings_goal ON public.accounts(is_savings_goal);
