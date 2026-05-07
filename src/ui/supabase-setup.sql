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

-- Allow public read access to profile images 
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



-- 9. Claims table
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  ai_verdict TEXT,        
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on claims table
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON public.claims FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own claims
CREATE POLICY "Users can insert own claims"
  ON public.claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own claims (only while pending)
CREATE POLICY "Users can update own pending claims"
  ON public.claims FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own claims (only while pending)
CREATE POLICY "Users can delete own pending claims"
  ON public.claims FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  USING (public.is_admin());

-- Admins can update any claim (for status changes)
CREATE POLICY "Admins can update all claims"
  ON public.claims FOR UPDATE
  USING (public.is_admin());

-- Auto-update updated_at on claims
CREATE TRIGGER on_claims_updated
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 10. Claim images table
CREATE TABLE IF NOT EXISTS public.claim_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,       
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  is_vehical BOOLEAN DEFAULT NULL, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on claim_images table
ALTER TABLE public.claim_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own claim images
CREATE POLICY "Users can view own claim images"
  ON public.claim_images FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own claim images
CREATE POLICY "Users can insert own claim images"
  ON public.claim_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own claim images
CREATE POLICY "Users can delete own claim images"
  ON public.claim_images FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all claim images
CREATE POLICY "Admins can view all claim images"
  ON public.claim_images FOR SELECT
  USING (public.is_admin());


-- 10b. Classification Results table
CREATE TABLE IF NOT EXISTS public.classification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  images_processed INT NOT NULL DEFAULT 0,
  vehicles_detected INT NOT NULL DEFAULT 0,
  claim_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on classification_results table
ALTER TABLE public.classification_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own classification results
CREATE POLICY "Users can view own classification results"
  ON public.classification_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all classification results
CREATE POLICY "Admins can view all classification results"
  ON public.classification_results FOR SELECT
  USING (public.is_admin());


-- 10c. Same Vehicle Results table
CREATE TABLE IF NOT EXISTS public.same_vehicle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_images_count INT NOT NULL DEFAULT 0,
  is_same_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  claim_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on same_vehicle_results table
ALTER TABLE public.same_vehicle_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own same vehicle results
CREATE POLICY "Users can view own same vehicle results"
  ON public.same_vehicle_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all same vehicle results
CREATE POLICY "Admins can view all same vehicle results"
  ON public.same_vehicle_results FOR SELECT
  USING (public.is_admin());


-- 10d. Vehicle Type Results table
CREATE TABLE IF NOT EXISTS public.vehicle_type_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identified_type TEXT,
  claim_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on vehicle_type_results table
ALTER TABLE public.vehicle_type_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own vehicle type results
CREATE POLICY "Users can view own vehicle type results"
  ON public.vehicle_type_results FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all vehicle type results
CREATE POLICY "Admins can view all vehicle type results"
  ON public.vehicle_type_results FOR SELECT
  USING (public.is_admin());



-- 10e. Admin Notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  failed_task TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS on admin_notifications table
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications
CREATE POLICY "Admins can view admin notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.is_admin());

-- Admins can update notifications (to resolve them)
CREATE POLICY "Admins can update admin notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());



-- 10f. Claimant Notifications table
CREATE TABLE IF NOT EXISTS public.claimant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('progress', 'approved', 'rejected')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on claimant_notifications table
ALTER TABLE public.claimant_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own claimant notifications"
  ON public.claimant_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update own claimant notifications"
  ON public.claimant_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all claimant notifications
CREATE POLICY "Admins can view all claimant notifications"
  ON public.claimant_notifications FOR SELECT
  USING (public.is_admin());



-- 11. Storage RLS policies for claim_images bucket
-- Users can upload claim images into their own folder
CREATE POLICY "Users can upload claim images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'claim_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own claim images
CREATE POLICY "Users can read own claim images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'claim_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own claim images
CREATE POLICY "Users can delete own claim images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'claim_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all claim images
CREATE POLICY "Admins can read all claim images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'claim_images'
    AND public.is_admin()
  );


-- 12. Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  photo_url TEXT,
  description TEXT,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on disputes table
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can view their own disputes
CREATE POLICY "Users can view own disputes"
  ON public.disputes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own disputes
CREATE POLICY "Users can insert own disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own disputes
CREATE POLICY "Users can update own disputes"
  ON public.disputes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
  ON public.disputes FOR SELECT
  USING (public.is_admin());

-- Auto-update updated_at on disputes
CREATE TRIGGER on_disputes_updated
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- 13. Storage RLS policies for dispute_images bucket
-- Users can upload dispute images into their own folder
CREATE POLICY "Users can upload dispute images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own dispute images
CREATE POLICY "Users can read own dispute images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own dispute images
CREATE POLICY "Users can update own dispute images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dispute_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own dispute images
CREATE POLICY "Users can delete own dispute images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dispute_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all dispute images
CREATE POLICY "Admins can read all dispute images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute_images'
    AND public.is_admin()
  );


-- 14. Damage Detection Results table
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


-- 15. Image Pipeline Results table
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


-- 16. RAG Results table
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


-- 17. Liability Results table
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

