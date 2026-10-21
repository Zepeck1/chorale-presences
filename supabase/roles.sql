-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- IMPORTANT : remplacez VOTRE-EMAIL@exemple.com (tout en bas) par l'email de votre compte actuel.

-- 1. Table des profils (un rôle par utilisateur)
create table if not exists public.profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nom text,
  role text not null check (role in ('admin', 'secretaire', 'tresorier')),
  created_at timestamptz not null default now()
);

alter table public.profils enable row level security;

-- 2. Fonction qui renvoie le rôle de l'utilisateur connecté
create or replace function public.mon_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profils where user_id = auth.uid()
$$;

-- 3. Profils : chacun lit le sien, l'admin lit tout (les modifications passent par le serveur)
drop policy if exists "profils_lecture" on public.profils;
create policy "profils_lecture" on public.profils
  for select to authenticated
  using (user_id = auth.uid() or public.mon_role() = 'admin');

-- 4. Choristes : lecture pour tous les rôles, modification pour admin et secrétaire
drop policy if exists "choristes_authentifies" on public.choristes;
drop policy if exists "choristes_lecture" on public.choristes;
drop policy if exists "choristes_ecriture" on public.choristes;
drop policy if exists "choristes_modification" on public.choristes;
drop policy if exists "choristes_suppression" on public.choristes;

create policy "choristes_lecture" on public.choristes
  for select to authenticated
  using (public.mon_role() in ('admin', 'secretaire', 'tresorier'));

create policy "choristes_ecriture" on public.choristes
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'secretaire'));

create policy "choristes_modification" on public.choristes
  for update to authenticated
  using (public.mon_role() in ('admin', 'secretaire'))
  with check (public.mon_role() in ('admin', 'secretaire'));

create policy "choristes_suppression" on public.choristes
  for delete to authenticated
  using (public.mon_role() in ('admin', 'secretaire'));

-- 5. Présences : admin et secrétaire
drop policy if exists "presences_authentifies" on public.presences;
drop policy if exists "presences_roles" on public.presences;
create policy "presences_roles" on public.presences
  for all to authenticated
  using (public.mon_role() in ('admin', 'secretaire'))
  with check (public.mon_role() in ('admin', 'secretaire'));

-- 6. Cotisations et paramètres : admin et trésorier
drop policy if exists "cotisations_authentifies" on public.cotisations;
drop policy if exists "cotisations_roles" on public.cotisations;
create policy "cotisations_roles" on public.cotisations
  for all to authenticated
  using (public.mon_role() in ('admin', 'tresorier'))
  with check (public.mon_role() in ('admin', 'tresorier'));

drop policy if exists "parametres_authentifies" on public.parametres;
drop policy if exists "parametres_roles" on public.parametres;
create policy "parametres_roles" on public.parametres
  for all to authenticated
  using (public.mon_role() in ('admin', 'tresorier'))
  with check (public.mon_role() in ('admin', 'tresorier'));

-- 7. Vous devenez administrateur (REMPLACEZ L'EMAIL)
insert into public.profils (user_id, email, nom, role)
select id, email, 'Administrateur', 'admin'
from auth.users
where email = 'VOTRE-EMAIL@exemple.com'
on conflict (user_id) do update set role = 'admin';
