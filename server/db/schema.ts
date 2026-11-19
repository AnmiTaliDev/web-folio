const SCHEMA = `
create table if not exists books (
  id text primary key,
  isbn_13 text unique,
  source_key text not null unique,
  title text not null,
  authors text not null default '[]',
  description text,
  genres text not null default '[]',
  language text not null,
  first_publish_year integer,
  popularity integer not null default 0,
  min_age integer not null default 0,
  themes text not null default '[]',
  difficulty text,
  length text,
  embedding blob
);
create index if not exists books_popularity_idx on books (popularity desc);

create table if not exists book_translations (
  book_id text not null references books (id) on delete cascade,
  language text not null,
  title text not null,
  authors text not null default '[]',
  description text,
  overview text,
  primary key (book_id, language)
);

create table if not exists catalog_state (
  name text primary key,
  value text not null
);

create table if not exists users (
  id text primary key,
  username text,
  password_hash text,
  recovery_hash text,
  created_at text not null,
  terms_version text,
  terms_accepted_at text
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  created_at text not null,
  expires_at text not null,
  last_seen_at text,
  user_agent text
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists profiles (
  user_id text primary key references users (id) on delete cascade,
  interests text not null default '[]',
  personalization_enabled integer not null default 1,
  ai_descriptions_enabled integer not null default 1,
  consent_at text,
  max_age integer
);

create table if not exists ratings (
  user_id text not null references users (id) on delete cascade,
  book_id text not null references books (id) on delete cascade,
  value integer not null check (value in (1, -1)),
  is_read integer not null default 0,
  created_at text not null,
  primary key (user_id, book_id)
);
create index if not exists ratings_book_value_idx on ratings (book_id, value);

create table if not exists book_status (
  user_id text not null references users (id) on delete cascade,
  book_id text not null references books (id) on delete cascade,
  status text not null check (status in ('reading', 'read')),
  updated_at text not null,
  primary key (user_id, book_id)
);

create table if not exists wishlist (
  user_id text not null references users (id) on delete cascade,
  book_id text not null references books (id) on delete cascade,
  created_at text not null,
  primary key (user_id, book_id)
);

create table if not exists book_of_day (
  user_id text not null references users (id) on delete cascade,
  day text not null,
  book_id text not null references books (id) on delete cascade,
  score real not null,
  description text,
  model text,
  created_at text not null,
  primary key (user_id, day)
);

create table if not exists chat_messages (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  book_ids text not null default '[]',
  created_at text not null
);
create index if not exists chat_messages_user_created_idx on chat_messages (user_id, created_at);
`

export const USERNAME_INDEX = `
create unique index if not exists users_username_idx on users (username) where username is not null;
`

export function schemaFor(dialect: 'sqlite' | 'postgres'): string {
  return dialect === 'sqlite' ? SCHEMA : SCHEMA.replace('embedding blob', 'embedding bytea').replace('score real not null', 'score double precision not null')
}
