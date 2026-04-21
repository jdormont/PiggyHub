/*
  # PocketPal Phase 2 — Chore Engine

  1. New Tables
    - `chores` — recurring/one-off/milestone tasks assigned to a child
      - `id` (uuid, PK)
      - `child_id` (uuid, FK children ON DELETE CASCADE)
      - `title` (text)
      - `description` (text)
      - `value` (numeric, dollars per completion; 0 for milestone)
      - `frequency` (text: once|daily|weekly|monthly)
      - `due_date` (date, nullable)
      - `is_milestone` (bool; when true value is ignored and no money awarded)
      - `is_active` (bool; archived when false)
      - `created_at`

    - `chore_completions` — one record per child "mark done" event
      - `id` (uuid, PK)
      - `chore_id` (uuid, FK chores)
      - `child_id` (uuid, FK children)
      - `status` (text: pending|approved|rejected)
      - `completed_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `rejection_note` (text, nullable)
      - `streak_count` (int; snapshot at approval time)
      - `created_at`

    - `transactions` — canonical ledger; bucket balances derive from this
      - `id` (uuid, PK)
      - `child_id` (uuid, FK children)
      - `type` (text: earn|spend|transfer|allowance|match)
      - `bucket` (text: spend|save|give)
      - `amount` (numeric; positive for credit, negative for debit)
      - `description` (text)
      - `category` (text, nullable)
      - `chore_completion_id` (uuid, FK chore_completions, nullable)
      - `created_at`

  2. Security
    - RLS enabled on all three tables
    - Access is gated by ownership chain child -> family -> auth.uid()
    - Separate SELECT/INSERT/UPDATE/DELETE policies per table

  3. Notes
    - Bucket balances are computed client-side by summing transactions per bucket.
    - Approval writes three transactions (one per bucket) within a single client call; no server-side trigger required in Phase 2.
*/

CREATE TABLE IF NOT EXISTS chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  value numeric(10,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'weekly',
  due_date date,
  is_milestone boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chores_frequency_valid CHECK (frequency IN ('once','daily','weekly','monthly')),
  CONSTRAINT chores_value_nonneg CHECK (value >= 0)
);

CREATE INDEX IF NOT EXISTS chores_child_id_idx ON chores(child_id);

CREATE TABLE IF NOT EXISTS chore_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id uuid NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  rejection_note text,
  streak_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chore_completions_status_valid CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS chore_completions_child_id_idx ON chore_completions(child_id);
CREATE INDEX IF NOT EXISTS chore_completions_chore_id_idx ON chore_completions(chore_id);
CREATE INDEX IF NOT EXISTS chore_completions_status_idx ON chore_completions(status);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type text NOT NULL,
  bucket text NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text NOT NULL DEFAULT '',
  category text,
  chore_completion_id uuid REFERENCES chore_completions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_type_valid CHECK (type IN ('earn','spend','transfer','allowance','match')),
  CONSTRAINT transactions_bucket_valid CHECK (bucket IN ('spend','save','give'))
);

CREATE INDEX IF NOT EXISTS transactions_child_id_idx ON transactions(child_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at);

ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- chores policies
CREATE POLICY "Parents can view own chores"
  ON chores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chores.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own chores"
  ON chores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chores.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own chores"
  ON chores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chores.child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chores.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own chores"
  ON chores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chores.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

-- chore_completions policies
CREATE POLICY "Parents can view own completions"
  ON chore_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chore_completions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own completions"
  ON chore_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chore_completions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own completions"
  ON chore_completions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chore_completions.child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chore_completions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own completions"
  ON chore_completions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = chore_completions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

-- transactions policies
CREATE POLICY "Parents can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = transactions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = transactions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = transactions.child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = transactions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = transactions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );
