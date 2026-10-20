-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run

create table if not exists public.choristes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  pupitre text not null check (pupitre in ('Soprano', 'Alto', 'Ténor', 'Basse')),
  date_adhesion date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.presences (
  id uuid primary key default gen_random_uuid(),
  choriste_id uuid not null references public.choristes(id) on delete cascade,
  date date not null,
  statut text not null check (statut in ('present', 'absent', 'justifie')),
  motif text,
  created_at timestamptz not null default now(),
  unique (choriste_id, date)
);

create index if not exists presences_date_idx on public.presences (date);

-- Sécurité : seuls les utilisateurs connectés peuvent lire et écrire
alter table public.choristes enable row level security;
alter table public.presences enable row level security;

drop policy if exists "choristes_authentifies" on public.choristes;
create policy "choristes_authentifies" on public.choristes
  for all to authenticated using (true) with check (true);

drop policy if exists "presences_authentifies" on public.presences;
create policy "presences_authentifies" on public.presences
  for all to authenticated using (true) with check (true);
