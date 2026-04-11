-- ============================================
-- IMAGE PIPELINE RESULTS TABLE
-- Run this in the Supabase SQL Editor
-- ============================================

-- Stores the aggregated output from all image pipeline agents.
-- This is the single structured record the liability agent will consume.

CREATE TABLE IF NOT EXISTS public.image_pipeline_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_images INT NOT NULL DEFAULT 0,
  vehicle_images_count INT NOT NULL DEFAULT 0,
  non_vehicle_images_count INT NOT NULL DEFAULT 0,
  is_same_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  vehicle_type TEXT,
  has_damage BOOLEAN NOT NULL DEFAULT FALSE,
  images_with_damage INT NOT NULL DEFAULT 0,
  damage_details JSONB,
  damage_summary TEXT,
  all_checks_passed BOOLEAN NOT NULL DEFAULT FALSE,
  pipeline_summary TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on image_pipeline_results table
ALTER TABLE public.image_pipeline_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own pipeline results
CREATE POLICY "Users can view own image pipeline results"
  ON public.image_pipeline_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all pipeline results
CREATE POLICY "Admins can view all image pipeline results"
  ON public.image_pipeline_results FOR SELECT
  USING (public.is_admin());
