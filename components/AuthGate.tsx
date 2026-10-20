"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { configured, supabase } from "@/lib/supabase";
import Nav from "./Nav";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else if (data.session) setSession(data.session);
    else setError("Connexion réussie mais aucune session reçue.");
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
            <h1 className="font-serif text-2xl font-bold text-wine">Présences du chœur</h1>
            <p className="text-sm text-ink/60">Connexion réservée aux responsables.</p>
          </div>
          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

  return (
    <>
      <Nav onLogout={() => supabase.auth.signOut()} />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">{children}</main>
    </>
  );
}