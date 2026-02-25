-- Search function using full-text + geo + filters
CREATE OR REPLACE FUNCTION search_listings(
  search_query TEXT DEFAULT NULL,
  search_lat FLOAT DEFAULT NULL,
  search_lng FLOAT DEFAULT NULL,
  search_radius_km FLOAT DEFAULT 25,
  category_slug TEXT DEFAULT NULL,
  listing_type TEXT DEFAULT NULL,
  price_min INTEGER DEFAULT NULL,
  price_max INTEGER DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  type listing_type,
  price_daily INTEGER,
  deposit_amount INTEGER,
  currency CHAR(3),
  owner_id UUID,
  owner_display_name VARCHAR,
  owner_avatar_url TEXT,
  owner_rating NUMERIC,
  owner_verified BOOLEAN,
  listing_rating NUMERIC,
  review_count INTEGER,
  distance_km FLOAT,
  first_image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.title, l.description, l.type, l.price_daily,
    l.deposit_amount, l.currency, l.owner_id,
    p.display_name, p.avatar_url, p.rating_avg,
    (p.identity_status = 'verified'),
    l.rating_avg, l.rating_count,
    CASE
      WHEN search_lat IS NOT NULL AND search_lng IS NOT NULL
      THEN ST_Distance(
        l.location,
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
      ) / 1000.0
      ELSE NULL
    END AS distance_km,
    (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id ORDER BY lm.sort_order LIMIT 1),
    l.created_at
  FROM listings l
  JOIN profiles p ON l.owner_id = p.id
  WHERE l.status = 'active'
    AND l.deleted_at IS NULL
    AND (search_query IS NULL OR
         to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')) @@ plainto_tsquery('english', search_query)
         OR l.title ILIKE '%' || search_query || '%')
    AND (search_lat IS NULL OR search_lng IS NULL OR
         ST_DWithin(
           l.location,
           ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
           search_radius_km * 1000
         ))
    AND (category_slug IS NULL OR l.category_id IN (SELECT c.id FROM categories c WHERE c.slug = category_slug))
    AND (listing_type IS NULL OR l.type::TEXT = listing_type)
    AND (price_min IS NULL OR l.price_daily >= price_min)
    AND (price_max IS NULL OR l.price_daily <= price_max)
  ORDER BY
    CASE sort_by
      WHEN 'price_asc' THEN l.price_daily
      WHEN 'price_desc' THEN -l.price_daily
      WHEN 'rating' THEN -l.rating_avg
      WHEN 'newest' THEN -EXTRACT(EPOCH FROM l.created_at)
      ELSE -ts_rank(to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')),
                     plainto_tsquery('english', COALESCE(search_query, '')))
    END
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
