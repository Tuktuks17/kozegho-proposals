ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text
  NOT NULL DEFAULT 'salesperson'
  CHECK (role IN ('manager', 'salesperson'));
