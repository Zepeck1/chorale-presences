"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { configured, supabase } from "@/lib/supabase";
import { ACCUEIL, Role, peutAcceder } from "@/lib/roles";
import Nav from "./Nav";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Charge le rôle de l'utilisateur connecté
  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRoleReady(false);
      return;
    }
    let cancelled = false;
    setRoleReady(false);
    supabase
      .from("profils")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRole((data?.role as Role) ?? null);
        setRoleReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Redirige vers la page d'accueil du rôle si la page demandée n'est pas autorisée
  useEffect(() => {
    if (role && !peutAcceder(role, pathname)) router.replace(ACCUEIL[role]);
  }, [role, pathname, router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Connexion impossible.");
      } else {
        const { data, error } = await supabase.auth.setSession({
          access_token: json.access_token,
          refresh_token: json.refresh_token,
        });
        if (error) setError(error.message);
        else if (data.session) setSession(data.session);
      }
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    }
    setBusy(false);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink/60">
        Chargement…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="card p-6">
          <h1 className="font-serif text-xl font-bold text-wine">Configuration manquante</h1>
          <p className="mt-2 text-sm text-ink/70">
            Les variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ne sont pas définies. Suivez le
            README pour les ajouter.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5">
        <form onSubmit={login} className="card w-full space-y-4 p-6">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/chova-logo.png"
              alt="Logo de la chorale"
              width={120}
              height={120}
              priority
              className="mb-3 h-28 w-28 object-contain"
            />
            <h1 className="font-serif text-2xl font-bold text-wine">CHOVA</h1>
            <p className="text-sm text-ink/60">Connexion réservée aux responsables.</p>
          </div>
          <input
            className="input"
            type="text"
            placeholder="Identifiant"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-warn">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  if (!roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink/60">
        Chargement…
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="card w-full space-y-3 p-6">
          <h1 className="font-serif text-xl font-bold text-wine">Aucun rôle attribué</h1>
          <p className="text-sm text-ink/70">
            Votre compte est connecté, mais aucun rôle ne lui a été donné. Demandez à un
            administrateur de vous en attribuer un.
          </p>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // Page non autorisée : la redirection est en cours
  if (!peutAcceder(role, pathname)) return null;

  return (
    <>
      <Nav role={role} onLogout={() => supabase.auth.signOut()} />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">{children}</main>
    </>
  );
}
