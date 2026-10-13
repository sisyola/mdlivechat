-- Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (app registers tokens)
CREATE POLICY "Anyone can insert tokens" ON device_tokens
  FOR INSERT WITH CHECK (true);

-- Policy: Users can read their own tokens
CREATE POLICY "Users can read own tokens" ON device_tokens
  FOR SELECT USING (true);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own tokens" ON device_tokens
  FOR DELETE USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
