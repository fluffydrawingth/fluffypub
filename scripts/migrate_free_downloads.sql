-- Free Downloads table
CREATE TABLE IF NOT EXISTS free_downloads (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title_en         text NOT NULL,
  title_th         text,
  slug             text UNIQUE NOT NULL,
  cover_image_url  text,
  description_en   text,
  description_th   text,
  highlight        text,
  category         text,
  keywords         text[] DEFAULT '{}',
  sort_order       int DEFAULT 0,
  file_type        text,           -- 'pdf' | 'zip'
  r2_key           text,
  r2_file_name     text,
  file_size        bigint,
  status           text DEFAULT 'draft',   -- 'draft' | 'published'
  download_count   int DEFAULT 0,
  last_download_at timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_free_downloads_slug   ON free_downloads(slug);
CREATE INDEX IF NOT EXISTS idx_free_downloads_status ON free_downloads(status);
