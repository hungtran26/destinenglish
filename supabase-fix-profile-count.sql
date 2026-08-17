-- Kangaroo CBT — Fix: profile count function (bypasses RLS)
-- Run this in Supabase SQL editor.

-- This function lets the app count ALL profiles to determine first-user admin role.
-- SECURITY DEFINER means it runs as the function owner, bypassing RLS.
CREATE OR REPLACE FUNCTION public.get_profile_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT count(*)::INTEGER FROM public.profiles;
$$;
