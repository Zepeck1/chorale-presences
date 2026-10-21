import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ROLES = ["admin", "secretaire", "tresorier"];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Vérifie que l'appelant est connecté ET administrateur
async function verifierAdmin(req: NextRequest) {
  const sb = adminClient();
  if (!sb) return { error: "Clé serveur manquante (SUPABASE_SERVICE_ROLE_KEY).", status: 500 };

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Non connecté.", status: 401 };

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: "Session invalide.", status: 401 };

  const { data: profil } = await sb
    .from("profils")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profil?.role !== "admin") return { error: "Réservé aux administrateurs.", status: 403 };

  return { sb, userId: data.user.id, adminEmail: data.user.email ?? "" };
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Créer un utilisateur
export async function POST(req: NextRequest) {
  const check = await verifierAdmin(req);
  if ("error" in check) return fail(check.error!, check.status!);
  const { sb, adminEmail } = check;

  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  const nom = String(body.nom ?? "").trim();
  const login = String(body.login ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");

  if (!/^[a-z0-9._-]{3,30}$/.test(login)) {
    return fail("Identifiant invalide : 3 à 30 caractères (lettres, chiffres, point, tiret), sans espace ni accent.", 400);
  }
  if (password.length < 8) return fail("Le mot de passe doit contenir au moins 8 caractères.", 400);
  if (!ROLES.includes(role)) return fail("Rôle invalide.", 400);

  // Supabase exige un email : on en fabrique un à partir de celui de l'administrateur
  // (adresse+identifiant@domaine). Il n'est jamais montré ni utilisé pour se connecter.
  const [local, domaine] = adminEmail.toLowerCase().split("@");
  if (!local || !domaine) return fail("Email de l'administrateur introuvable.", 500);
  const email = `${local.split("+")[0]}+${login}@${domaine}`;

  const { data: pris } =await sb!.from("profils").select("user_id").ilike("login", login).maybeSingle();
  if (pris) return fail("Cet identifiant est déjà pris.", 400);

  const { data, error } = await sb!.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const dejaPris = /already|registered|exists/i.test(error?.message ?? "");
    return fail(dejaPris ? "Cet email est déjà utilisé." : error?.message ?? "Création impossible.", 400);
  }

  const { error: errProfil } = await sb!
    .from("profils")
    .insert({ user_id: data.user.id, email, login, nom: nom || null, role });
  if (errProfil) {
    await sb!.auth.admin.deleteUser(data.user.id);
    return fail("Impossible d'enregistrer le profil. Les scripts roles.sql et login.sql ont-ils été exécutés ?", 500);
  }

  return NextResponse.json({ ok: true });
}

// Changer le rôle
export async function PATCH(req: NextRequest) {
  const check = await verifierAdmin(req);
  if ("error" in check) return fail(check.error!, check.status!);
  const { sb, userId } = check;

  const body = await req.json().catch(() => ({}));
  const cible = String(body.user_id ?? "");
  const role = String(body.role ?? "");

  if (!cible) return fail("Utilisateur manquant.", 400);
  if (!ROLES.includes(role)) return fail("Rôle invalide.", 400);
  if (cible === userId) return fail("Vous ne pouvez pas modifier votre propre rôle.", 400);

  const { error } = await sb!.from("profils").update({ role }).eq("user_id", cible);
  if (error) return fail("Modification impossible.", 500);
  return NextResponse.json({ ok: true });
}

// Supprimer un utilisateur
export async function DELETE(req: NextRequest) {
  const check = await verifierAdmin(req);
  if ("error" in check) return fail(check.error!, check.status!);
  const { sb, userId } = check;

  const body = await req.json().catch(() => ({}));
  const cible = String(body.user_id ?? "");

  if (!cible) return fail("Utilisateur manquant.", 400);
  if (cible === userId) return fail("Vous ne pouvez pas supprimer votre propre compte.", 400);

  const { error } = await sb!.auth.admin.deleteUser(cible);
  if (error) return fail("Suppression impossible.", 500);
  return NextResponse.json({ ok: true });
}
