"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROLES, ROLE_LABEL, Role } from "@/lib/roles";

type Profil = {
  user_id: string;
  email: string;
  login: string | null;
  nom: string | null;
  role: Role;
};

const DROITS: Record<Role, string> = {
  admin: "Accès à tout, y compris la gestion des utilisateurs",
  secretaire: "Présences et choristes",
  tresorier: "Cotisations uniquement",
};

async function appelApi(method: "POST" | "PATCH" | "DELETE", body: object) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/utilisateurs", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
}

export default function UtilisateursPage() {
  const [liste, setListe] = useState<Profil[]>([]);
  const [moi, setMoi] = useState("");
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("secretaire");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("user_id, email, login, nom, role")
      .order("created_at");
    if (error) setError("Impossible de charger les utilisateurs.");
    else setListe((data ?? []) as Profil[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMoi(data.session?.user.id ?? ""));
    load();
  }, [load]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await appelApi("POST", { nom, login, password, role });
      setInfo(`Compte créé. Transmettez à ${nom.trim()} son identifiant « ${login.trim().toLowerCase()} » et son mot de passe.`);
      setNom("");
      setLogin("");
      setPassword("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function changerRole(p: Profil, nouveau: Role) {
    setError("");
    setInfo("");
    try {
      await appelApi("PATCH", { user_id: p.user_id, role: nouveau });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function supprimer(p: Profil) {
    const ok = window.confirm(`Supprimer le compte de ${p.nom || p.email} ? Cette personne ne pourra plus se connecter.`);
    if (!ok) return;
    setError("");
    setInfo("");
    try {
      await appelApi("DELETE", { user_id: p.user_id });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-wine">Utilisateurs</h1>
        <p className="text-sm text-ink/60">Créez les comptes et choisissez ce que chacun peut voir.</p>
      </div>

      <form onSubmit={creer} className="card space-y-3 p-5">
        <h2 className="font-semibold">Ajouter un utilisateur</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Identifiant de connexion (ex. marie.k)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
          <input
            className="input"
            type="text"
            placeholder="Mot de passe (8 caractères minimum)"
            autoComplete="off"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink/55">{DROITS[role]}</p>
        {error && <p className="text-sm text-warn">{error}</p>}
        {info && <p className="text-sm font-semibold text-ok">{info}</p>}
        <button className="btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Création…" : "Créer le compte"}
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Chargement…</p>
      ) : (
        <ul className="card divide-y divide-ink/10">
          {liste.map((p) => {
            const estMoi = p.user_id === moi;
            return (
              <li key={p.user_id} className="space-y-2 px-4 py-3">
                <div>
                  <div className="font-semibold">
                    {p.nom || "Sans nom"}
                    {estMoi && <span className="ml-2 text-xs font-normal text-ink/50">(vous)</span>}
                  </div>
                  <div className="text-xs text-ink/55">
                    Identifiant : <span className="font-semibold">{p.login ?? "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input py-2 text-sm"
                    value={p.role}
                    disabled={estMoi}
                    onChange={(e) => changerRole(p, e.target.value as Role)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  {!estMoi && (
                    <button
                      onClick={() => supprimer(p)}
                      className="shrink-0 rounded-lg px-3 py-2 text-sm text-warn hover:bg-warn/10"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
