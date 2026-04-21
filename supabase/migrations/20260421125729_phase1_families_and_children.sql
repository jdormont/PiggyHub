/*
  # PocketPal Phase 1 — Families & Children

  1. New Tables
    - `families` — one row per parent account
      - `id` (uuid, PK)
      - `parent_user_id` (uuid, FK auth.users, unique)
      - `parent_name` (text)
      - `created_at` (timestamptz)
    - `children` — child profiles owned by a family
      - `id` (uuid, PK)
      - `family_id` (uuid, FK families)
      - `name` (text)
      - `avatar` (text, emoji)
      - `dob` (date, nullable)
      - `split_spend`, `split_save`, `split_give` (int, percentages, sum = 100)
      - `allowance_amount` (numeric, default 0)
      - `allowance_frequency` (text: none|weekly|biweekly|monthly)
      - `allowance_next_date` (date, nullable)
      - `savings_match_rate` (int, percentage)
      - `is_archived` (bool)
      - `created_at`

  2. Security
    - RLS enabled on both tables
    - Parents can only access their own family row and their own children
    - Policies split into SELECT/INSERT/UPDATE/DELETE
    - A CHECK constraint enforces that bucket splits sum to 100

  3. Notes
    - Family row creation is performed client-side after auth (simpler than trigger, avoids requiring service role migration permissions).
*/

CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '🙂',
  dob date,
  split_spend int NOT NULL DEFAULT 60,
  split_save int NOT NULL DEFAULT 30,
  split_give int NOT NULL DEFAULT 10,
  allowance_amount numeric(10,2) NOT NULL DEFAULT 0,
  allowance_frequency text NOT NULL DEFAULT 'none',
  allowance_next_date date,
  savings_match_rate int NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT children_split_sum_100 CHECK (split_spend + split_save + split_give = 100),
  CONSTRAINT children_split_nonneg CHECK (split_spend >= 0 AND split_save >= 0 AND split_give >= 0),
  CONSTRAINT children_match_range CHECK (savings_match_rate >= 0 AND savings_match_rate <= 200),
  CONSTRAINT children_allowance_frequency_valid CHECK (allowance_frequency IN ('none','weekly','biweekly','monthly'))
);

CREATE INDEX IF NOT EXISTS children_family_id_idx ON children(family_id);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own family"
  ON families FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can create own family"
  ON families FOR INSERT
  TO authenticated
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Parents can update own family"
  ON families FOR UPDATE
  TO authenticated
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Parents can delete own family"
  ON families FOR DELETE
  TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can view own children"
  ON children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
        AND families.parent_user_id = auth.uid()
    )
  );
