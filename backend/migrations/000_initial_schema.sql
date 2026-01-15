-- Migration: Initial database schema
-- Description: Creates all required tables for the Personal CRM application
-- Date: 2026-01-15
-- Note: This migration is idempotent and safe to run multiple times

-- =============================================================================
-- APP OWNER TABLE (Single-user constraint)
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_owner (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    supabase_user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STATUSES TABLE (Kanban columns)
-- =============================================================================

CREATE TABLE IF NOT EXISTS statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- CONTACTS TABLE (Main contact table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT,
    telegram_username TEXT,
    linkedin_url TEXT,
    github_username TEXT,
    met_at DATE,
    status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
    notes TEXT,
    photo_path TEXT,
    cluster_id INTEGER,
    sort_order_in_status INTEGER NOT NULL DEFAULT 0,
    position_x FLOAT,
    position_y FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- LOOKUP TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS occupations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- JOIN TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS contact_interests (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, interest_id)
);

CREATE TABLE IF NOT EXISTS contact_occupations (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    occupation_id UUID NOT NULL REFERENCES occupations(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, occupation_id)
);

-- =============================================================================
-- ASSOCIATION GRAPH (Edges)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    target_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_contact_id, target_contact_id),
    CHECK (source_contact_id != target_contact_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_status_id ON contacts(status_id);
CREATE INDEX IF NOT EXISTS idx_contacts_cluster_id ON contacts(cluster_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_met_at ON contacts(met_at);
CREATE INDEX IF NOT EXISTS idx_contact_associations_source ON contact_associations(source_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_associations_target ON contact_associations(target_contact_id);
CREATE INDEX IF NOT EXISTS idx_app_owner_supabase_user_id ON app_owner(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_is_active ON statuses(is_active);

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DEFAULT STATUS SEED DATA
-- =============================================================================
-- Seed default statuses only if the table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM statuses LIMIT 1) THEN
        INSERT INTO statuses (name, sort_order, is_active) VALUES
            ('New', 1, true),
            ('Active', 2, true),
            ('Inactive', 3, true),
            ('Archived', 4, true);
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION NOTES
-- =============================================================================
-- The application's verify_setup() function will automatically verify:
-- - All required tables exist
-- - Storage bucket is configured
-- - Default statuses are seeded
--
-- For manual verification, you can run these queries directly in psql:
--
-- -- Verify tables were created:
-- SELECT schemaname, tablename FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN (
--   'app_owner', 'statuses', 'contacts', 'tags', 'interests', 
--   'occupations', 'contact_tags', 'contact_interests', 
--   'contact_occupations', 'contact_associations'
-- ) ORDER BY tablename;
--
-- -- Verify indexes were created:
-- SELECT schemaname, tablename, indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
--
-- -- Verify default statuses:
-- SELECT id, name, sort_order, is_active FROM statuses ORDER BY sort_order;
