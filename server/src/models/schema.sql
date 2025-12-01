-- Create database manually if not exists:
-- CREATE DATABASE magazine_123;

CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  twofa_secret TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  jwt_id TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- e.g., free, pro, enterprise
  status TEXT NOT NULL, -- e.g., active, canceled
  started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  canceled_at TIMESTAMP WITHOUT TIME ZONE
);

-- Enable pgcrypto for gen_random_uuid
-- If not enabled, run: CREATE EXTENSION IF NOT EXISTS pgcrypto;

