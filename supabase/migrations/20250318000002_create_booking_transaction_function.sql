-- Atomic booking creation with transaction record
-- Ensures booking and transaction are created together or not at all

CREATE OR REPLACE FUNCTION create_booking_with_transaction(
  p_listing_id UUID,
  p_renter_id UUID,
  p_owner_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_subtotal INTEGER,
  p_service_fee INTEGER,
  p_delivery_fee INTEGER,
  p_protection_fee INTEGER,
  p_deposit_amount INTEGER,
  p_total_amount INTEGER,
  p_owner_payout INTEGER,
  p_currency CHAR(3),
  p_delivery_method VARCHAR(20),
  p_delivery_address TEXT,
  p_protection_plan VARCHAR(20),
  p_payway_tran_id TEXT,
  p_transaction_amount INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Insert booking
  INSERT INTO bookings (
    listing_id,
    renter_id,
    owner_id,
    start_time,
    end_time,
    status,
    payment_authorized,
    subtotal,
    service_fee,
    delivery_fee,
    protection_fee,
    deposit_amount,
    total_amount,
    owner_payout,
    currency,
    delivery_method,
    delivery_address,
    protection_plan
  ) VALUES (
    p_listing_id,
    p_renter_id,
    p_owner_id,
    p_start_time,
    p_end_time,
    'requested',
    false,
    p_subtotal,
    p_service_fee,
    p_delivery_fee,
    p_protection_fee,
    p_deposit_amount,
    p_total_amount,
    p_owner_payout,
    p_currency,
    p_delivery_method,
    p_delivery_address,
    p_protection_plan
  ) RETURNING id INTO v_booking_id;

  -- Insert transaction
  INSERT INTO transactions (
    booking_id,
    type,
    status,
    amount,
    currency,
    payway_tran_id
  ) VALUES (
    v_booking_id,
    'pre_auth',
    'pending',
    p_transaction_amount,
    p_currency,
    p_payway_tran_id
  );

  RETURN v_booking_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_booking_with_transaction TO authenticated;