/*
  # PocketPal Phase 4 — Savings Goals

  1. New Tables
    - `goals` — a savings target a child is working toward
      - `id` (uuid, PK)
      - `child_id` (uuid, FK children ON DELETE CASCADE)
      - `title` (text, required)
      - `target_amount` (numeric(12,2), must be > 0)
      - `target_date` (date, nullable)
      - `emoji` (text; short icon/emoji identifier, default '')
      - `image_url` (text; optional photo, default '')
      - `is_complete` (bool; set when goal is reached and "purchased")
      - `is_archived` (bool; soft-delete flag)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

    - `goal_contributions` — ledger of allocations to a goal
      - `id` (uuid, PK)
      - `goal_id` (uuid, FK goals ON DELETE CASCADE)
      - `child_id` (uuid, FK children ON DELETE CASCADE)
      - `transaction_id` (uuid, FK transactions ON DELETE SET NULL; links to the
        matching bucket debit so the kid's bucket balance stays authoritative)
      - `amount` (numeric(12,2), positive contribution)
      - `bucket` (text; source bucket — spend|save|give)
      - `direction` (text: 'contribute'|'withdraw'|'complete') — allows reversals
      - `created_at`

  2. Security
    - RLS enabled on both tables
    - Parents can SELECT / INSERT / UPDATE / DELETE rows for children in their own family
    - Restricted to authenticated users; no public read

  3. Indexes
    - `goals(child_id)` for per-child lookups
    - `goal_contributions(goal_id)` for progress aggregation
    - `goal_contributions(child_id)` for kid views

  4. Notes
    - Goal progress is computed in the app by summing contributions (contribute +, withdraw -).
    - A contribution also writes a `transfer` transaction on the underlying ledger so
      bucket balances remain the single source of truth for money.
    - Safe, additive migration: all statements use IF NOT EXISTS where possible.
*/

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount > 0),
  target_date date,
  emoji text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  is_complete boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('spend', 'save', 'give')),
  direction text NOT NULL DEFAULT 'contribute' CHECK (direction IN ('contribute', 'withdraw', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_child_id_idx ON goals(child_id);
CREATE INDEX IF NOT EXISTS goal_contributions_goal_id_idx ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS goal_contributions_child_id_idx ON goal_contributions(child_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- goals policies
CREATE POLICY "Parents can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goals.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goals.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goals.child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goals.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goals.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

-- goal_contributions policies
CREATE POLICY "Parents can view own goal contributions"
  ON goal_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goal_contributions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own goal contributions"
  ON goal_contributions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goal_contributions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own goal contributions"
  ON goal_contributions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goal_contributions.child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goal_contributions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own goal contributions"
  ON goal_contributions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = goal_contributions.child_id
        AND families.parent_user_id = auth.uid()
    )
  );
