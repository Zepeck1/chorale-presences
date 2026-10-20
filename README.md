# Présences du chœur

Site web pour enregistrer les choristes (nom, prénom, pupitre, date d'adhésion) et faire l'appel à chaque répétition (présent, absent, absent justifié avec motif facultatif).

Technologies : Next.js, Tailwind CSS, Supabase (base de données + connexion).

## 1. Créer la base de données (Supabase)

1. Créez un compte gratuit sur https://supabase.com puis un nouveau projet.
2. Ouvrez **SQL Editor > New query**, collez le contenu de `supabase/schema.sql` et cliquez sur **Run**.
3. Ouvrez **Authentication > Users > Add user** et créez votre compte (email + mot de passe). Créez un compte par responsable qui doit pouvoir faire l'appel.
4. Pour empêcher toute inscription publique : **Authentication > Sign In / Providers > Email**, désactivez l'option qui autorise les nouvelles inscriptions (« Allow new users to sign up »).
5. Ouvrez **Project Settings > API** et notez l'**URL du projet** et la clé **anon public**.

## 2. Tester sur votre ordinateur

```bash
npm install
cp .env.example .env.local     # puis remplissez les deux valeurs
npm run dev
```

Ouvrez http://localhost:3000.

## 3. Mettre en ligne gratuitement (Vercel)

1. Envoyez ce dossier sur un dépôt GitHub (le fichier `.env.local` n'est pas envoyé, c'est voulu).
2. Sur https://vercel.com, **Add New > Project**, choisissez le dépôt.
3. Avant de déployer, ajoutez les deux variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Cliquez sur **Deploy**. Vous obtenez une adresse en `.vercel.app` à partager aux responsables.

Netlify et Cloudflare Pages fonctionnent de la même façon.

## Sécurité

Les données sont protégées par les règles RLS de Supabase : sans être connecté, personne ne peut lire ni modifier les choristes ou les présences. La clé « anon » est publique par conception, la sécurité repose sur ces règles et sur la connexion.
