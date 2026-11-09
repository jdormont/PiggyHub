/*
  # Kid-to-kid transfer requests

  1. New Tables
    - `kid_transfer_requests` — a child asks to send money to a sibling; a parent approves or rejects
      - `id` (uuid, PK)
      - `sender_child_id` (uuid, FK children ON DELETE CASCADE)
      - `recipient_child_id` (uuid, FK children ON DELETE CASCADE)
      - `bucket` (text: spend|save|give) — sender bucket the money comes from
      - `amount` (numeric, > 0)
      - `message` (text)
      - `status` (text: pending|approved|rejected)
      - `rejection_note` (text, nullable)
      - `reviewed_at` (timestamptz, nullable)
      - `created_at`

  2. Security
    - RLS enabled; parents manage rows whose sender child belongs to their family
    - The recipient must also belong to the same family (enforced in WITH CHECK)

  3. Notes
    - No money moves until approval. Approval writes ledger rows (`transfer` transactions):
      a negative row on the sender and positive row(s) on the recipient, split by the
      recipient's Spend/Save/Give ratios. No balance column is added.
*/

CREATE TABLE IF NOT EXISTS kid_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  recipient_child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket IN ('spend', 'save', 'give')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kid_transfer_requests_distinct_kids CHECK (sender_child_id <> recipient_child_id)
);

CREATE INDEX IF NOT EXISTS kid_transfer_requests_sender_idx ON kid_transfer_requests(sender_child_id);
CREATE INDEX IF NOT EXISTS kid_transfer_requests_recipient_idx ON kid_transfer_requests(recipient_child_id);
CREATE INDEX IF NOT EXISTS kid_transfer_requests_status_idx ON kid_transfer_requests(status);

ALTER TABLE kid_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own kid transfer requests"
  ON kid_transfer_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = kid_transfer_requests.sender_child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own kid transfer requests"
  ON kid_transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children s
      JOIN children r ON r.family_id = s.family_id
      JOIN families ON families.id = s.family_id
      WHERE s.id = kid_transfer_requests.sender_child_id
        AND r.id = kid_transfer_requests.recipient_child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own kid transfer requests"
  ON kid_transfer_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = kid_transfer_requests.sender_child_id
        AND families.parent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = kid_transfer_requests.sender_child_id
        AND families.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own kid transfer requests"
  ON kid_transfer_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      JOIN families ON families.id = children.family_id
      WHERE children.id = kid_transfer_requests.sender_child_id
        AND families.parent_user_id = auth.uid()
    )
  );
