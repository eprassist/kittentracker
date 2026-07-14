-- Litter Watch schema (reference copy).
-- The app creates these tables automatically on first API call
-- (see netlify/functions/lib/db.ts), so you normally never run this by hand.

create table if not exists kittens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2a78d6',
  birth_date date,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists weigh_ins (
  id uuid primary key default gen_random_uuid(),
  kitten_id uuid not null references kittens(id) on delete cascade,
  weight_grams numeric(7,1) not null check (weight_grams > 0),
  weighed_at timestamptz not null default now(),
  logged_by text,
  photo_url text,   -- "/api/media/<id>" pointing at Netlify Blobs
  video_url text,   -- "/api/media/<id>" pointing at Netlify Blobs
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists weigh_ins_kitten_time_idx
  on weigh_ins (kitten_id, weighed_at desc);

create table if not exists settings (
  key text primary key,
  value jsonb not null  -- e.g. {"min_daily_gain": 7}
);
