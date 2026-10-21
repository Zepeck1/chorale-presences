-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run

create table if not exists public.cotisations (
  id uuid primary key default gen_random_uuid(),
  choriste_id uuid not null references public.choristes(id) on delete cascade,
  mois date not null,               -- premier jour du mois payé (ex. 2026-10-01)
  montant integer,                  -- montant versé (facultatif)
  paye_le date not null default current_date,
  created_at timestamptz not null default now(),
  unique (choriste_id, mois)
);

create table if not exists public.parametres (
  cle text primary key,
  valeur text not null
);

alter table public.cotisations enable row level security;
alter table public.parametres enable row level security;

drop policy if exists "cotisations_authentifies" on public.cotisations;
create policy "cotisations_authentifies" on public.cotisations
  for all to authenticated using (true) with check (true);

drop policy if exists "parametres_authentifies" on public.parametres;
create policy "parametres_authentifies" on public.parametres
  for all to authenticated using (true) with check (true);
