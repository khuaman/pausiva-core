-- ============================================
-- DEPRECATED: AI Multiagent Schema Initialization
-- ============================================
-- 
-- ⚠️  THIS FILE IS DEPRECATED
-- 
-- The source of truth for database schema is now:
--   platform/supabase/migrations/
--
-- Key tables have been consolidated:
--   - conversations → public.conversations (platform migration)
--   - messages → public.messages (platform migration)
--   - patients → public.patients (platform migration)
--   - users → public.users (platform migration)
--
-- The ai-multiagent service should query the public schema
-- managed by platform/ Supabase migrations.
--
-- This file is kept for reference only. Do NOT run this script.
-- ============================================
--
-- ORIGINAL DESCRIPTION:
-- This script creates a separate schema for AI multiagent tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- IMPORTANT: After running this script, you MUST expose the schema:
--   1. Go to Supabase Dashboard > Settings > API
--   2. Under "Exposed schemas", add: ai_multiagent
--   OR run: ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, ai_multiagent';
-- ============================================

-- Create the schema
CREATE SCHEMA IF NOT EXISTS ai_multiagent;

-- Grant usage to authenticated and service_role
GRANT USAGE ON SCHEMA ai_multiagent TO authenticated;
GRANT USAGE ON SCHEMA ai_multiagent TO service_role;
GRANT USAGE ON SCHEMA ai_multiagent TO anon;

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    current_risk_level TEXT DEFAULT 'none' CHECK (current_risk_level IN ('none', 'low', 'medium', 'high')),
    current_risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_patients_phone ON ai_multiagent.patients(phone_number);

-- ============================================
-- PATIENT PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES ai_multiagent.patients(id) ON DELETE CASCADE,
    age INTEGER,
    medical_conditions JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    current_medications JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id)
);

-- Index for patient lookups
CREATE INDEX IF NOT EXISTS idx_patient_profiles_patient ON ai_multiagent.patient_profiles(patient_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_phone ON ai_multiagent.messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON ai_multiagent.messages(timestamp DESC);

-- ============================================
-- MEDICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    raw_text TEXT DEFAULT '',
    frequency_text TEXT DEFAULT '',
    times_of_day JSONB DEFAULT '[]'::jsonb,
    duration_days INTEGER,
    start_date DATE DEFAULT CURRENT_DATE,
    notes TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDICATION SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    medications JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_medication_schedules_phone ON ai_multiagent.medication_schedules(phone_number);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    date TEXT NOT NULL,  -- YYYY-MM-DD format
    time TEXT NOT NULL,  -- HH:MM format
    specialist_type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
    notes TEXT DEFAULT '',
    google_calendar_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON ai_multiagent.appointments(phone_number);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON ai_multiagent.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON ai_multiagent.appointments(status);

-- ============================================
-- CONVERSATIONS TABLE (for tracking sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_multiagent.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    agent_used TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON ai_multiagent.conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_started ON ai_multiagent.conversations(started_at DESC);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant all privileges on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA ai_multiagent TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ai_multiagent TO service_role;

-- Grant select/insert to authenticated users (for RLS later)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ai_multiagent TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai_multiagent TO authenticated;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION ai_multiagent.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'ai_multiagent' 
        AND column_name = 'updated_at'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON ai_multiagent.%I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON ai_multiagent.%I
            FOR EACH ROW
            EXECUTE FUNCTION ai_multiagent.update_updated_at();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- EXPOSE SCHEMA TO API
-- ============================================
-- This exposes the ai_multiagent schema to PostgREST API
-- Note: This may require superuser privileges. If it fails,
-- manually add "ai_multiagent" to exposed schemas in Dashboard > Settings > API
DO $$
BEGIN
    -- Try to update the config (may fail without superuser)
    EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas TO ''public, ai_multiagent''';
    RAISE NOTICE 'Schema exposed to API successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not auto-expose schema. Please add "ai_multiagent" manually in Dashboard > Settings > API > Exposed schemas';
END $$;

-- Notify PostgREST to reload config
NOTIFY pgrst, 'reload config';

-- ============================================
-- VERIFY SETUP
-- ============================================
-- Run this to verify tables were created:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'ai_multiagent' ORDER BY table_name;

