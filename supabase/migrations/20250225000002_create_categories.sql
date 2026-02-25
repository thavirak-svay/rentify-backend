-- Create listing_type enum
CREATE TYPE listing_type AS ENUM ('offer', 'request');

-- Create categories table
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  icon          VARCHAR(50),
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE INDEX idx_categories_sort_order ON categories (sort_order);

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
  ('Electronics', 'electronics', 'Cameras, drones, audio equipment, and more', 'laptop', 1),
  ('Tools & Equipment', 'tools-equipment', 'Power tools, hand tools, construction equipment', 'wrench', 2),
  ('Events & Party', 'events-party', 'Party supplies, event equipment, decorations', 'balloon', 3),
  ('Vehicles', 'vehicles', 'Cars, motorcycles, bikes, scooters', 'car', 4),
  ('Sports & Outdoors', 'sports-outdoors', 'Camping gear, sports equipment, bicycles', 'tent', 5),
  ('Fashion & Accessories', 'fashion-accessories', 'Designer wear, jewelry, bags, watches', 'shirt', 6),
  ('Home & Garden', 'home-garden', 'Furniture, appliances, lawn equipment', 'home', 7),
  ('Photography & Video', 'photography-video', 'Cameras, lenses, lighting equipment', 'camera', 8),
  ('Music & Sound', 'music-sound', 'Instruments, speakers, DJ equipment', 'music', 9),
  ('Gaming & Entertainment', 'gaming-entertainment', 'Gaming consoles, VR, board games', 'gamepad', 10);
