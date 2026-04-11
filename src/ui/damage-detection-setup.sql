-- ============================================
-- DAMAGE DETECTION RESULTS TABLE
-- Run this in the Supabase SQL Editor
-- ============================================

-- Stores the output of the damage detection agent per claim.
-- The damage_details JSONB column contains the full structured per-image damage analysis.

CREATE TABLE IF NOT EXISTS public.damage_detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  images_analyzed INT NOT NULL DEFAULT 0,
  images_with_damage INT NOT NULL DEFAULT 0,
  claim_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  damage_details JSONB,
  damage_summary TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on damage_detection_results table
ALTER TABLE public.damage_detection_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own damage detection results
CREATE POLICY "Users can view own damage detection results"
  ON public.damage_detection_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all damage detection results
CREATE POLICY "Admins can view all damage detection results"
  ON public.damage_detection_results FOR SELECT
  USING (public.is_admin());
