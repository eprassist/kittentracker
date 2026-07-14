import { neon } from "@neondatabase/serverless";
import { getDatabase } from "@netlify/database";

// Narrow neon's union return type to the row-array form we always use.
export type Row = Record<string, any>;
type Sql = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<Row[]>;

let _sql: Sql | null = null;

export function sql(): Sql {
  if (!_sql) {
    // Prefer an explicit connection string (local `netlify dev`, or a manually
    // set DATABASE_URL); otherwise use Netlify DB, whose connection is injected
    // by the platform at runtime and read via @netlify/database.
    const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
    if (url) {
      _sql = neon(url) as unknown as Sql;
    } else {
      try {
        _sql = neon(getDatabase().connectionString) as unknown as Sql;
      } catch {
        const present = Object.keys(process.env)
          .filter((k) => k.startsWith("NETLIFY") || k.includes("DATABASE") || k.includes("DB_") || k.endsWith("_DB"))
          .join(", ");
        throw new Error(
          `No database connection available. Provision Netlify DB (\`netlify db init\`) or set DATABASE_URL. DB-related env keys present: [${present || "none"}]`,
        );
      }
    }
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
