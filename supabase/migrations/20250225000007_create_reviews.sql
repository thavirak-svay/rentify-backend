-- Create reviews table
CREATE TABLE reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  listing_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rating (1-5)
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Review content
  comment           TEXT,
  
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(booking_id, reviewer_id)
);

-- Indexes
CREATE INDEX idx_reviews_booking_id ON reviews (booking_id);
CREATE INDEX idx_reviews_listing_id ON reviews (listing_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews (reviewer_id);
CREATE INDEX idx_reviews_target_id ON reviews (target_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);
CREATE INDEX idx_reviews_created_at ON reviews (created_at DESC);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for completed bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND bookings.status = 'completed'
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
    AND auth.uid() = reviewer_id
  );

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- Update timestamp trigger
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Rating aggregation trigger
CREATE OR REPLACE FUNCTION recalculate_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update listing rating
  UPDATE listings SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE listing_id = NEW.listing_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = NEW.listing_id)
  WHERE id = NEW.listing_id;

  -- Update target user rating
  UPDATE profiles SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE target_id = NEW.target_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE target_id = NEW.target_id)
  WHERE id = NEW.target_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_ratings();

CREATE TRIGGER on_review_updated
  AFTER UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_ratings();
