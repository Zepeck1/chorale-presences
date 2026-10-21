import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MESSAGE = "Identifiant ou mot de passe incorrect.";

// Connexion par identifiant (login) : le serveur retrouve l'email associé,
// vérifie le mot de passe et renvoie la session. L'email n'est jamais exposé.
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) {
    return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const identifiant = String(body.identifiant ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!identifiant || !password) {
    return NextResponse.json({ error: MESSAGE }, { status: 400 });
  }

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // L'identifiant peut être un login, ou l'email (pour les anciens comptes)
  const colonne = identifiant.includes("@") ? "email" : "login";
  const { data: profil } = await admin
    .from("profils")
    .select("email")
    .ilike(colonne, identifiant)
    .maybeSingle();

  if (!profil) return NextResponse.json({ error: MESSAGE }, { status: 401 });

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: profil.email,
    password,
  });
  if (error || !data.session) return NextResponse.json({ error: MESSAGE }, { status: 401 });

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
