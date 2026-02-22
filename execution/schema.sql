-- ═══════════════════════════════════════════════════════════
-- Thinking In Steps — Portfolio Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Create the projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT         UNIQUE NOT NULL,
    title         TEXT         NOT NULL,
    description   TEXT         DEFAULT '',
    icon          TEXT         DEFAULT 'code',
    tags          TEXT[]       DEFAULT '{}',
    version       TEXT         DEFAULT '',
    status_label  TEXT         DEFAULT 'ACTIVE',
    link_text     TEXT,
    link_href     TEXT,
    cover_url     TEXT,
    gallery_urls  TEXT[]       DEFAULT '{}',
    sort_order    INTEGER      DEFAULT 0,
    is_visible    BOOLEAN      DEFAULT true,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.projects;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public: read only visible projects (used by the main site)
CREATE POLICY "Public read visible projects"
    ON public.projects
    FOR SELECT
    USING (is_visible = true);

-- Authenticated admin: full access
CREATE POLICY "Admin full access"
    ON public.projects
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ── Storage bucket for project images ─────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view images
CREATE POLICY "Public read project images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'project-images');

-- Authenticated admin can upload and delete images
CREATE POLICY "Admin manage project images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

-- ── Seed initial data ──────────────────────────────────────
-- (Remove this block if you want to start with an empty portfolio)

INSERT INTO public.projects
    (slug, title, description, icon, tags, version, status_label, link_text, link_href, sort_order)
VALUES
(
    'tasklayer',
    'TaskLayer',
    'TaskLayer eliminates the noise of modern work tracking. By prioritising keyboard-first navigation and dropping Gantt charts in favour of linear priority streams, it enables uninterrupted 4-hour deep work cycles without context switching.',
    'task_alt',
    ARRAY['React', 'Zustand', 'Go'],
    'V 2.4.0',
    'ACTIVE',
    'View Live',
    '#',
    1
),
(
    'flowstate',
    'FlowState',
    'FlowState intercepts OS notifications, visually monitoring user activity to automatically toggle Focus modes — providing aggressive protection of maker schedules without manual intervention.',
    'timer',
    ARRAY['Rust', 'Tauri'],
    'V 0.9.2',
    'BETA',
    'Join Beta',
    '#',
    2
),
(
    'databridge',
    'DataBridge',
    'DataBridge is the internal lifeblood of our operation — a secure, fault-tolerant orchestration layer that unifies SQL and NoSQL clusters through a single visually mapped GraphQL API.',
    'hub',
    ARRAY['Node', 'GraphQL', 'Redis'],
    'V 4.1.0',
    'INTERNAL',
    NULL,
    NULL,
    3
)
ON CONFLICT (slug) DO NOTHING;
