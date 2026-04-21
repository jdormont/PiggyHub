/*
  # Add day_of_week to chores

  1. Changes
    - Add `day_of_week` column to `chores` (smallint, 0-6, nullable)
    - 0 = Sunday ... 6 = Saturday
    - Only relevant when frequency = 'weekly'; null otherwise

  2. Notes
    - Safe additive migration using IF NOT EXISTS pattern
    - Existing rows get null day_of_week
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE chores ADD COLUMN day_of_week smallint;
    ALTER TABLE chores ADD CONSTRAINT chores_day_of_week_range
      CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));
  END IF;
END $$;
