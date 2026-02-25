-- Create message_threads table
CREATE TABLE message_threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID REFERENCES listings(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES bookings(id) ON DELETE CASCADE,
  participant_ids   UUID[] NOT NULL,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_threads_listing_id ON message_threads (listing_id);
CREATE INDEX idx_message_threads_booking_id ON message_threads (booking_id);
CREATE INDEX idx_message_threads_participant_ids ON message_threads USING GIN (participant_ids);
CREATE INDEX idx_message_threads_last_message_at ON message_threads (last_message_at DESC);

CREATE INDEX idx_messages_thread_id ON messages (thread_id);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);

-- RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view threads"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Thread participants can create threads"
  ON message_threads FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Thread participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE message_threads.id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE message_threads.id = messages.thread_id
      AND auth.uid() = ANY(participant_ids)
    ) AND auth.uid() = sender_id
  );

-- Update timestamp trigger
CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_message_at trigger
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();
