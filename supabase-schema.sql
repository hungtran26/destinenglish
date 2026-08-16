-- Kangaroo CBT — Supabase Database Schema v2
--
-- Run this in the Supabase SQL editor.
-- This version removes the trigger — profile creation is handled by the app.

-- ─────────────────────────────────────────
-- PROFILES TABLE
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─────────────────────────────────────────
-- TESTS TABLE
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  time_limit_minutes INTEGER DEFAULT 45,
  test_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read tests
CREATE POLICY "Authenticated users can read tests"
  ON tests FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can read tests (for dev/demo without auth)
CREATE POLICY "Anonymous users can read tests"
  ON tests FOR SELECT
  TO anon
  USING (true);

-- Only authenticated users can insert tests
CREATE POLICY "Authenticated users can insert tests"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can delete tests
CREATE POLICY "Authenticated users can delete tests"
  ON tests FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- THEORIES TABLE
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS theories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  subtitle TEXT DEFAULT '',
  theory_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE theories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read theories
CREATE POLICY "Authenticated users can read theories"
  ON theories FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can read theories
CREATE POLICY "Anonymous users can read theories"
  ON theories FOR SELECT
  TO anon
  USING (true);

-- Only authenticated users can insert theories
CREATE POLICY "Authenticated users can insert theories"
  ON theories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can delete theories
CREATE POLICY "Authenticated users can delete theories"
  ON theories FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- RESULTS TABLE
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_title TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  overall_pct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can read own results"
  ON results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own results"
  ON results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own results"
  ON results FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can read all results
CREATE POLICY "Admins can read all results"
  ON results FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
