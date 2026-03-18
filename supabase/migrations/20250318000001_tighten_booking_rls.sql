-- Tighten booking update policies for defense-in-depth security
-- This migration replaces the overly permissive update policy with role-specific ones

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Booking parties can update bookings" ON bookings;

-- Create specific policies for each type of update

-- Owner can approve or decline bookings (only for their listings)
CREATE POLICY "owner_can_approve_decline" ON bookings FOR UPDATE
  USING (auth.uid() = owner_id AND status = 'requested')
  WITH CHECK (status IN ('approved', 'declined'));

-- Both parties can cancel bookings they're part of
CREATE POLICY "parties_can_cancel" ON bookings FOR UPDATE
  USING (auth.uid() IN (renter_id, owner_id) AND status IN ('requested', 'approved'))
  WITH CHECK (status = 'cancelled');

-- System operations (active, completed) should go through service role
-- These are handled by the backend with service role key, not user JWT

-- Create a trigger to protect financial fields from modification
CREATE OR REPLACE FUNCTION protect_booking_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- These fields should never change after creation
  IF OLD.subtotal != NEW.subtotal OR
     OLD.service_fee != NEW.service_fee OR
     OLD.total_amount != NEW.total_amount OR
     OLD.owner_payout != NEW.owner_payout OR
     OLD.currency != NEW.currency OR
     OLD.listing_id != NEW.listing_id OR
     OLD.renter_id != NEW.renter_id OR
     OLD.owner_id != NEW.owner_id OR
     OLD.start_time != NEW.start_time OR
     OLD.end_time != NEW.end_time THEN
    RAISE EXCEPTION 'Cannot modify immutable booking fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_protect_booking_financial_fields
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_booking_financial_fields();