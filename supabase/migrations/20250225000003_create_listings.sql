-- Create listing_status enum
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'paused', 'archived');

-- Create listings table
CREATE TABLE listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  type                listing_type NOT NULL DEFAULT 'offer',
  status              listing_status NOT NULL DEFAULT 'draft',
  
  -- Pricing (in cents to avoid floating point issues)
  price_hourly        INTEGER,
  price_daily         INTEGER NOT NULL,
  price_weekly        INTEGER,
  deposit_amount      INTEGER DEFAULT 0,
  currency            CHAR(3) DEFAULT 'USD',
  
  -- Location
  location            GEOGRAPHY(POINT, 4326),
  address_text        TEXT,
  address_city        VARCHAR(100),
  address_country     CHAR(2),
  
  -- Availability
  availability_type   VARCHAR(20) DEFAULT 'flexible', -- 'flexible', 'specific_dates'
  min_rental_hours    INTEGER DEFAULT 1,
  max_rental_days     INTEGER,
  
  -- Delivery options
  delivery_available  BOOLEAN DEFAULT false,
  delivery_fee        INTEGER DEFAULT 0,
  pickup_available    BOOLEAN DEFAULT true,
  
  -- Stats
  view_count          INTEGER DEFAULT 0,
  rating_avg          NUMERIC(3,2) DEFAULT 0.00,
  rating_count        INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at        TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create listing_media table
CREATE TABLE listing_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create availability table
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_owner_id ON listings (owner_id);
CREATE INDEX idx_listings_category_id ON listings (category_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_type ON listings (type);
CREATE INDEX idx_listings_location ON listings USING GIST (location);
CREATE INDEX idx_listings_price_daily ON listings (price_daily);
CREATE INDEX idx_listings_created_at ON listings (created_at DESC);
CREATE INDEX idx_listings_rating_avg ON listings (rating_avg DESC);

-- Full-text search index
CREATE INDEX idx_listings_search ON listings USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

CREATE INDEX idx_listing_media_listing_id ON listing_media (listing_id);
CREATE INDEX idx_listing_media_sort_order ON listing_media (listing_id, sort_order);

CREATE INDEX idx_availability_listing_id ON availability (listing_id);
CREATE INDEX idx_availability_time_range ON availability (listing_id, start_time, end_time);

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Listings policies
CREATE POLICY "Active listings are viewable by everyone"
  ON listings FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = owner_id);

-- Listing media policies
CREATE POLICY "Listing media is viewable with listing"
  ON listing_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
      AND (status = 'active' OR owner_id = auth.uid())
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Owners can add media to own listings"
  ON listing_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete media from own listings"
  ON listing_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
      AND owner_id = auth.uid()
    )
  );

-- Availability policies
CREATE POLICY "Availability is viewable with listing"
  ON availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability.listing_id
      AND (status = 'active' OR owner_id = auth.uid())
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Owners can manage availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability.listing_id
      AND owner_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
