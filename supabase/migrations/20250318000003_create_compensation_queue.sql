-- Compensation queue for handling failed payment operations
-- Used when payment succeeds but database update fails

CREATE TABLE compensation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('cancel_preauth', 'refund', 'cancel_booking', 'capture')),
  payload JSONB NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  transaction_id UUID REFERENCES transactions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for querying pending items
CREATE INDEX idx_compensation_queue_status ON compensation_queue (status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_compensation_queue_created ON compensation_queue (created_at);

-- Update timestamp trigger
CREATE TRIGGER update_compensation_queue_updated_at
  BEFORE UPDATE ON compensation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create compensation entry
CREATE OR REPLACE FUNCTION queue_compensation(
  p_type TEXT,
  p_payload JSONB,
  p_booking_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO compensation_queue (type, payload, booking_id, transaction_id)
  VALUES (p_type, p_payload, p_booking_id, p_transaction_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to get next pending compensation
CREATE OR REPLACE FUNCTION get_next_compensation()
RETURNS TABLE (
  id UUID,
  type TEXT,
  payload JSONB,
  booking_id UUID,
  transaction_id UUID,
  retry_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cq.id, cq.type, cq.payload, cq.booking_id, cq.transaction_id, cq.retry_count
  FROM compensation_queue cq
  WHERE cq.status = 'pending'
  ORDER BY cq.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to mark compensation as processing
CREATE OR REPLACE FUNCTION mark_compensation_processing(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE compensation_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_id;
END;
$$;

-- Function to mark compensation as completed
CREATE OR REPLACE FUNCTION mark_compensation_completed(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE compensation_queue
  SET status = 'completed', processed_at = NOW(), updated_at = NOW()
  WHERE id = p_id;
END;
$$;

-- Function to mark compensation as failed (with retry logic)
CREATE OR REPLACE FUNCTION mark_compensation_failed(p_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM compensation_queue WHERE id = p_id;

  IF v_retry_count + 1 >= v_max_retries THEN
    UPDATE compensation_queue
    SET status = 'failed', last_error = p_error, updated_at = NOW()
    WHERE id = p_id;
  ELSE
    UPDATE compensation_queue
    SET status = 'pending', retry_count = retry_count + 1, last_error = p_error, updated_at = NOW()
    WHERE id = p_id;
  END IF;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON compensation_queue TO authenticated;
GRANT EXECUTE ON FUNCTION queue_compensation TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_compensation TO authenticated;
GRANT EXECUTE ON FUNCTION mark_compensation_processing TO authenticated;
GRANT EXECUTE ON FUNCTION mark_compensation_completed TO authenticated;
GRANT EXECUTE ON FUNCTION mark_compensation_failed TO authenticated;