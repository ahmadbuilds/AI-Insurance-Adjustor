-- ============================================
-- SUPABASE SQL SETUP
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'claimant' CHECK (role IN ('claimant', 'admin')),
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for users table

-- Users can read their own row
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own row
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own row
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own row (cascade will handle related data)
CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- Helper to check admin status without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Admins can read all users
CREATE POLICY "Admins can view all profiles"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Auto-create user profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN NEW.email = 'cirsitiano678@gmail.com' THEN 'admin'
      ELSE 'claimant'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Storage RLS policies for users_image bucket
-- Make sure the bucket "users_image" exists in Supabase Storage dashboard

-- Allow users to upload their own profile images
CREATE POLICY "Users can upload own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'users_image'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own profile images
CREATE POLICY "Users can update own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'users_image'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to read their own profile images
CREATE POLICY "Users can read own profile image"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'users_image'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to profile images (so they can be displayed)
CREATE POLICY "Public can read profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'users_image');

-- Allow users to delete their own profile images
CREATE POLICY "Users can delete own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'users_image'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Storage cleanup should be done via Storage API in application code.
-- Direct SQL deletes on storage.objects are not allowed by Supabase.
-- If you previously created the old trigger, run:
-- DROP TRIGGER IF EXISTS on_user_deleted ON public.users;
-- DROP FUNCTION IF EXISTS public.handle_user_deleted();

-- ============================================
-- 8. Custom Email Confirmations table
-- Used for admin-created users (bypasses Supabase email confirmation)
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_confirmations ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side) should access this table.
-- No client-side policies needed — the API route uses the service role key.
