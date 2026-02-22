-- ═══════════════════════════════════════════════════════════
-- Fix: RLS policies and clean up duplicate rows
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── 1. Fix projects RLS ────────────────────────────────────
-- auth.role() is unreliable with newer Supabase keys.
-- auth.uid() IS NOT NULL is the correct modern check.

DROP POLICY IF EXISTS "Admin full access" ON public.projects;

CREATE POLICY "Admin full access"
    ON public.projects
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ── 2. Fix storage RLS ─────────────────────────────────────

DROP POLICY IF EXISTS "Admin manage project images" ON storage.objects;

CREATE POLICY "Admin manage project images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'project-images' AND auth.uid() IS NOT NULL)
    WITH CHECK (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);

-- ── 3. Remove duplicate rows ───────────────────────────────
-- Keeps the earliest-created row for each slug, deletes the rest.

DELETE FROM public.projects
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) AS rn
        FROM public.projects
    ) t
    WHERE rn > 1
);

-- Verify: should show each slug exactly once
SELECT slug, title, created_at FROM public.projects ORDER BY sort_order;
