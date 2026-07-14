import { neon } from "@neondatabase/serverless";

// Narrow neon's union return type to the row-array form we always use.
export type Row = Record<string, any>;
type Sql = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<Row[]>;

let _sql: Sql | null = null;

export function sql(): Sql {
  if (!_sql) {
    const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "NETLIFY_DATABASE_URL is not set. Provision Netlify DB with `netlify db init` (or set DATABASE_URL to a Postgres connection string).",
      );
    }
    _sql = neon(url) as unknown as Sql;
  }
  return _sql;
}

let schemaReady: Promise<void> | undefined;

/** Creates tables on first use (idempotent). Cached per warm function instance. */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const q = sql();
    await q`
      create table if not exists kittens (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        color text not null default '#2a78d6',
        birth_date date,
        notes text,
        archived boolean not null default false,
        created_at timestamptz not null default now()
      )`;
    await q`
      create table if not exists weigh_ins (
        id uuid primary key default gen_random_uuid(),
        kitten_id uuid not null references kittens(id) on delete cascade,
        weight_grams numeric(7,1) not null check (weight_grams > 0),
        weighed_at timestamptz not null default now(),
        logged_by text,
        photo_url text,
        video_url text,
        notes text,
        created_at timestamptz not null default now()
      )`;
    await q`create index if not exists weigh_ins_kitten_time_idx on weigh_ins (kitten_id, weighed_at desc)`;
    await q`
      create table if not exists settings (
        key text primary key,
        value jsonb not null
      )`;
  })().catch((e) => {
    schemaReady = undefined; // allow retry on next request
    throw e;
  });
  return schemaReady;
}
