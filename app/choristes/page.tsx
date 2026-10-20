"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Choriste,
  PUPITRES,
  Pupitre,
  formatDate,
  sortChoristes,
  todayISO,
} from "@/lib/types";

export default function ChoristesPage() {
  const [list, setList] = useState<Choriste[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [pupitre, setPupitre] = useState<Pupitre>("Soprano");
  const [dateAdhesion, setDateAdhesion] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("choristes").select("*");
    if (error) setError("Impossible de charger les choristes.");
    else setList(sortChoristes((data ?? []) as Choriste[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.from("choristes").insert({
      nom: nom.trim(),
      prenom: prenom.trim(),
      pupitre,
      date_adhesion: dateAdhesion,
    });
    if (error) {
      setError("L'enregistrement a échoué. Réessayez.");
    } else {
      setNom("");
      setPrenom("");
      await load();
    }
    setBusy(false);
  }

  async function remove(c: Choriste) {
    const ok = window.confirm(
      `Supprimer ${c.prenom} ${c.nom} ? Son historique de présences sera aussi supprimé.`
    );
    if (!ok) return;
    const { error } = await supabase.from("choristes").delete().eq("id", c.id);
    if (error) setError("La suppression a échoué.");
    else await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-wine">Choristes</h1>
        <p className="text-sm text-ink/60">
          {list.length} membre{list.length > 1 ? "s" : ""} inscrit{list.length > 1 ? "s" : ""}
        </p>
      </div>

      <form onSubmit={add} className="card space-y-3 p-5">
        <h2 className="font-semibold">Ajouter un choriste</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
          />
          <label className="text-sm text-ink/60">
            Pupitre
            <select
              className="input mt-1"
              value={pupitre}
              onChange={(e) => setPupitre(e.target.value as Pupitre)}
            >
              {PUPITRES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink/60">
            Date d&apos;adhésion
            <input
              className="input mt-1"
              type="date"
              value={dateAdhesion}
              onChange={(e) => setDateAdhesion(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button className="btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer le choriste"}
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="card p-6 text-center text-ink/60">
          Aucun choriste pour l&apos;instant. Ajoutez le premier ci-dessus.
        </p>
      ) : (
        PUPITRES.map((p) => {
          const membres = list.filter((c) => c.pupitre === p);
          if (membres.length === 0) return null;
          return (
            <section key={p}>
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-bold text-wine">
                {p}
                <span className="rounded-full bg-wine-soft px-2 py-0.5 font-sans text-xs font-semibold text-wine">
                  {membres.length}
                </span>
              </h2>
              <ul className="card divide-y divide-ink/10">
                {membres.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="font-semibold">
                        {c.prenom} {c.nom}
                      </div>
                      <div className="text-xs text-ink/55">
                        Membre depuis le {formatDate(c.date_adhesion)}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(c)}
                      className="rounded-lg px-3 py-1.5 text-sm text-warn hover:bg-warn/10"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
