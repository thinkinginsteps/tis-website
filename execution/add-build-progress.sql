-- Add build_progress column to projects table
-- Run this in: Supabase Dashboard → SQL Editor → New Query

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS build_progress INTEGER DEFAULT 0;
