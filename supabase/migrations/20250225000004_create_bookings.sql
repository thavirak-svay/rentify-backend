-- Create booking_status enum
CREATE TYPE booking_status AS ENUM (
  'requested',
  'approved',
  'declined',
  'auto_declined',
  'active',
  'completed',
  'cancelled',
  'disputed',
  'resolved'
);

-- Create bookings table
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  renter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rental period
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  
  -- Status
  status            booking_status NOT NULL DEFAULT 'requested',
  payment_authorized BOOLEAN DEFAULT false,
  
  -- Pricing breakdown (all in cents)
  subtotal          INTEGER NOT NULL,
  service_fee       INTEGER NOT NULL,
  delivery_fee      INTEGER DEFAULT 0,
  protection_fee    INTEGER DEFAULT 0,
  deposit_amount    INTEGER DEFAULT 0,
  total_amount      INTEGER NOT NULL,
  owner_payout      INTEGER NOT NULL,
  currency          CHAR(3) DEFAULT 'USD',
  
  -- Delivery
  delivery_method   VARCHAR(20), -- 'pickup', 'delivery'
  delivery_address  TEXT,
  
  -- Protection
  protection_plan   VARCHAR(20) DEFAULT 'none', -- 'none', 'basic', 'premium'
  
  -- Timestamps
  approved_at       TIMESTAMPTZ,
  declined_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_listing_id ON bookings (listing_id);
CREATE INDEX idx_bookings_renter_id ON bookings (renter_id);
CREATE INDEX idx_bookings_owner_id ON bookings (owner_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_start_time ON bookings (start_time);
CREATE INDEX idx_bookings_end_time ON bookings (end_time);
CREATE INDEX idx_bookings_created_at ON bookings (created_at DESC);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties can view bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Users can create bookings as renter"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Booking parties can update bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Update timestamp trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
