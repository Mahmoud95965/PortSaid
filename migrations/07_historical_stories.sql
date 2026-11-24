-- 07_historical_stories.sql
--
-- Historical stories (الدليل التاريخي) move to Supabase.
--
-- WHY: stories used to live in a local SQLite file (src/lib/db/localDb.ts,
-- data/portsaid.db). On Vercel the filesystem is read-only outside /tmp,
-- so that database could never be created or written there: every read
-- AND every save failed with a 500 ("فشل في تحميل القصص التاريخية." /
-- "حدث خطأ أثناء حفظ القصة التاريخية."). Moving the table to Supabase
-- makes adding/editing stories work on production, exactly like
-- users/places/visits already do.
--
-- HOW TO APPLY: Supabase dashboard -> SQL Editor -> paste this whole
-- file -> Run. Until this runs, the stories API answers with a clear
-- message asking for this step (it does NOT silently fail, and it does
-- NOT fall back to the local file).
--
-- No data is migrated: nothing could ever be saved on production
-- before, so the table starts empty and the admin adds the stories
-- from /admin.

create table if not exists public.historical_stories (
  id text primary key,
  title_ar text not null,
  era_year text,
  summary_ar text not null,
  content_ar text not null,
  image_url text not null,
  additional_images jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_hist_stories_sort
  on public.historical_stories (sort_order, created_at);

alter table public.historical_stories enable row level security;

-- Public read of published stories only (what the Explore page shows).
-- Writes go through the service-role API route only; anon gets no
-- insert/update/delete policy, so direct browser writes stay blocked.
drop policy if exists "Public can read published stories" on public.historical_stories;
create policy "Public can read published stories"
  on public.historical_stories
  for select
  using (is_published = true);
