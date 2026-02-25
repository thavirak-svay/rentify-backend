-- Create transaction_type enum
CREATE TYPE transaction_type AS ENUM (
  'pre_auth',
  'capture',
  'payout',
  'refund',
  'partial_refund'
);

-- Create transaction_status enum
CREATE TYPE transaction_status AS ENUM (
  'pending',
  'authorized',
  'completed',
  'failed',
  'cancelled',
  'refunded'
);

-- Create transactions table
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Transaction details
  type              transaction_type NOT NULL,
  status            transaction_status NOT NULL DEFAULT 'pending',
  amount            INTEGER NOT NULL,
  currency          CHAR(3) DEFAULT 'USD',
  
  -- PayWay integration
  payway_tran_id    VARCHAR(255) UNIQUE,
  payway_status     VARCHAR(50),
  
  -- Metadata
  metadata          JSONB DEFAULT '{}',
  
  -- Timestamps
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_booking_id ON transactions (booking_id);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_payway_tran_id ON transactions (payway_tran_id);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction parties can view transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = transactions.booking_id
      AND (renter_id = auth.uid() OR owner_id = auth.uid())
    )
  );

CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update transactions"
  ON transactions FOR UPDATE
  USING (true);

-- Update timestamp trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
