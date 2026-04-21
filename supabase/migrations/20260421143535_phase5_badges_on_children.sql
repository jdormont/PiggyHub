/*
  # Phase 5: Streak milestone badges on children

  1. Changes
    - `children` table: add `badges` JSONB column (default empty array)
      Each badge is a JSON object: { type, chore_id, chore_title, earned_at }
      Badge types: 'streak_5' | 'streak_10' | 'streak_25'

  2. Notes
    - JSONB default `'[]'` ensures all existing children start with no badges
    - Badges are append-only; uniqueness enforced in application logic
    - No RLS changes needed; existing child policies already govern the column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'badges'
  ) THEN
    ALTER TABLE children ADD COLUMN badges JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
