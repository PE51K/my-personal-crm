-- Migration: Add index for RLS performance optimization
-- Description: Improves query performance for RLS policies that check auth.uid() against app_owner.user_id
-- Date: 2026-01-15

-- Create index on app_owner.user_id for faster RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_app_owner_user_id ON public.app_owner(user_id);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'app_owner'
  AND indexname = 'idx_app_owner_user_id';
