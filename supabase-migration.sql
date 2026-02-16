-- Supabase Migration SQL for Lorenz Wedding
-- Run this in Supabase Dashboard → SQL Editor

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT,
  event_date TEXT,
  selected_photo_ids TEXT, -- JSON array of photo IDs
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id BIGSERIAL PRIMARY KEY,
  album_id BIGINT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  filename TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_customer ON albums(customer_id);
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);

-- Enable Row Level Security (RLS) - optional, for extra security
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
