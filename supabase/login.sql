-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run

-- Ajoute l'identifiant de connexion (login) aux profils
alter table public.profils add column if not exists login text;

create unique index if not exists profils_login_unique
  on public.profils (lower(login));

-- Votre compte administrateur actuel reçoit l'identifiant « admin » (modifiable ensuite)
update public.profils
set login = 'admin'
where login is null
  and user_id = (
    select user_id from public.profils where role = 'admin' order by created_at limit 1
  );
