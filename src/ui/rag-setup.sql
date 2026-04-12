-- ============================================
-- RAG RESULTS TABLE
-- Run this in the Supabase SQL Editor
-- ============================================

-- Stores the full output of the RAG agent policy assessment.

CREATE TABLE IF NOT EXISTS public.rag_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_covered BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_type TEXT,
  applicable_sections JSONB,
  exclusions JSONB,
  compensation_amount FLOAT NOT NULL DEFAULT 0.0,
  compensation_breakdown JSONB,
  coverage_reasoning TEXT,
  recommendation TEXT NOT NULL DEFAULT 'needs_human_review',
  flags JSONB,
  needs_admin_review BOOLEAN NOT NULL DEFAULT FALSE,
  admin_action TEXT DEFAULT NULL CHECK (admin_action IS NULL OR admin_action IN ('pending', 'payment_approved', 'rejected')),
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rag_results table
ALTER TABLE public.rag_results ENABLE ROW LEVEL SECURITY;

-- INSERT: The backend uses the service_role key which bypasses RLS.
-- This policy explicitly documents that intent and future-proofs the schema
-- in case the backend ever switches to a more restricted key.
CREATE POLICY "Service role can insert RAG results"
  ON public.rag_results FOR INSERT
  WITH CHECK (true);

-- Users can view their own RAG results
CREATE POLICY "Users can view own RAG results"
  ON public.rag_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all RAG results
CREATE POLICY "Admins can view all RAG results"
  ON public.rag_results FOR SELECT
  USING (public.is_admin());

-- Admins can update RAG results (for admin_action changes)
CREATE POLICY "Admins can update RAG results"
  ON public.rag_results FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
