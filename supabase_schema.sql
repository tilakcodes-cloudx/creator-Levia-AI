-- ============================================================================
-- CREATOROS AUTHENTICATION & MULTI-PERSONA SCHEMA
-- Phase 1: Profiles & Onboarding Database Migration
-- ============================================================================

-- 1. Enable UUID Extension (pgcrypto is enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. PROFILES TABLE
-- Authoritative user profile linked 1-to-1 with Supabase Auth users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    selected_persona TEXT CHECK (selected_persona IN ('content_creator', 'product_builder', 'freelancer', 'advertiser')),
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_selected_persona ON public.profiles(selected_persona);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);

-- ============================================================================
-- 3. ONBOARDING PROFILES TABLE
-- Dedicated store for detailed persona questionnaire answers and preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    persona TEXT NOT NULL CHECK (persona IN ('content_creator', 'product_builder', 'freelancer', 'advertiser')),
    onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_user_persona UNIQUE (user_id, persona)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_persona ON public.onboarding_profiles(persona);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Zero-trust security: users can access and modify ONLY their own records
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if reapplying
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own onboarding profiles" ON public.onboarding_profiles;
DROP POLICY IF EXISTS "Users can insert own onboarding profiles" ON public.onboarding_profiles;
DROP POLICY IF EXISTS "Users can update own onboarding profiles" ON public.onboarding_profiles;
DROP POLICY IF EXISTS "Users can delete own onboarding profiles" ON public.onboarding_profiles;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
    ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ONBOARDING PROFILES POLICIES
CREATE POLICY "Users can view own onboarding profiles"
    ON public.onboarding_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding profiles"
    ON public.onboarding_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding profiles"
    ON public.onboarding_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding profiles"
    ON public.onboarding_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. AUTOMATED USER REGISTRATION TRIGGER
-- Automatically creates a profile entry when a new user signs up in auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        display_name,
        email,
        selected_persona,
        onboarding_completed,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NULL,
        FALSE,
        TIMEZONE('utc', NOW()),
        TIMEZONE('utc', NOW())
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. AUTOMATED UPDATED_AT TRIGGER
-- Maintains accurate updated_at timestamps on row modifications
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_onboarding_profiles_updated_at ON public.onboarding_profiles;
CREATE TRIGGER set_onboarding_profiles_updated_at
    BEFORE UPDATE ON public.onboarding_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. DEVELOPER 1 — CONTENT CREATOR & ORCA AI SCHEMA
-- Authoritative tables with zero-trust Row Level Security (RLS)
-- ============================================================================

-- Content Pipeline (Bucket Items)
CREATE TABLE IF NOT EXISTS public.content_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram',
    status TEXT NOT NULL DEFAULT 'Draft',
    has_script BOOLEAN NOT NULL DEFAULT FALSE,
    has_caption BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT DEFAULT '',
    script_content TEXT DEFAULT '',
    caption_content TEXT DEFAULT '',
    scheduled_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_content_items_user_id ON public.content_items(user_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON public.content_items(status);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content items" ON public.content_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content items" ON public.content_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content items" ON public.content_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own content items" ON public.content_items FOR DELETE USING (auth.uid() = user_id);

-- Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram',
    date TEXT NOT NULL,
    time TEXT DEFAULT '09:30',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON public.calendar_events(user_id, date);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Brand Voice Profiles (For RAG Engine)
CREATE TABLE IF NOT EXISTS public.brand_voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tone TEXT NOT NULL DEFAULT 'Warm, clear, quietly confident',
    preferences TEXT DEFAULT '',
    target_audience TEXT DEFAULT '',
    banned_words TEXT DEFAULT '',
    sample_hooks TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand voice" ON public.brand_voices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand voice" ON public.brand_voices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brand voice" ON public.brand_voices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand voice" ON public.brand_voices FOR DELETE USING (auth.uid() = user_id);

-- Media Assets
CREATE TABLE IF NOT EXISTS public.media_assets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    tag TEXT NOT NULL,
    dur TEXT,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media assets" ON public.media_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media assets" ON public.media_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own media assets" ON public.media_assets FOR DELETE USING (auth.uid() = user_id);

-- ORCA AI Generation Audit Log
CREATE TABLE IF NOT EXISTS public.orca_generations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    output_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.orca_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orca generations" ON public.orca_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orca generations" ON public.orca_generations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. SHARED CONTRACTS FOR TEAMMATES (DEVELOPERS 2, 3, 4)
-- The tables below illustrate the schema conventions for each developer:
-- - Developer 2 (Product Creator): public.products, public.leads
-- - Developer 3 (Freelancer): public.invoices, public.freelancer_projects
-- - Developer 4 (Advertiser): public.ad_campaigns, public.ad_creatives
-- ============================================================================

