-- ============================================
-- LIABILITY RESULTS TABLE
-- Run this in the Supabase SQL Editor
-- ============================================

-- Stores the output of the liability assessment agent per claim.
-- Contains the full structured analysis: confidence scores, per-damage alignment,
-- scenario plausibility, red flags, and admin review tracking.

CREATE TABLE IF NOT EXISTS public.liability_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_confidence FLOAT NOT NULL DEFAULT 0.0,
  confidence_percentage INT NOT NULL DEFAULT 0,
  scenario_plausibility TEXT NOT NULL DEFAULT 'questionable',
  scenario_reasoning TEXT,
  damage_alignments JSONB,
  consistent_damages INT NOT NULL DEFAULT 0,
  inconsistent_damages INT NOT NULL DEFAULT 0,
  overall_reasoning TEXT,
  recommendation TEXT NOT NULL DEFAULT 'needs_human_review',
  flags JSONB,
  needs_admin_review BOOLEAN NOT NULL DEFAULT FALSE,
  admin_action TEXT DEFAULT NULL CHECK (admin_action IS NULL OR admin_action IN ('pending', 'accepted', 'overridden')),
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on liability_results table
ALTER TABLE public.liability_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own liability results
CREATE POLICY "Users can view own liability results"
  ON public.liability_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all liability results
CREATE POLICY "Admins can view all liability results"
  ON public.liability_results FOR SELECT
  USING (public.is_admin());

-- Admins can update liability results (for admin_action changes)
CREATE POLICY "Admins can update liability results"
  ON public.liability_results FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
