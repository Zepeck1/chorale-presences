"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Choriste, sortChoristes } from "@/lib/types";

type Cotisation = { choriste_id: string; mois: string; montant: number | null };
type Filtre = "tous" | "payes" | "impayes";

const CLE_MONTANT = "montant_cotisation";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Liste des mois de `from` (inclus) jusqu'à `to` (exclu), au format AAAA-MM
function monthsRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m < tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function money(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export default function CotisationsPage() {
  const [mois, setMois] = useState(currentMonth());
  const [choristes, setChoristes] = useState<Choriste[]>([]);
  const [cotis, setCotis] = useState<Cotisation[]>([]);
  const [montant, setMontant] = useState("");
  const [montantSaved, setMontantSaved] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadCotis = useCallback(async () => {
    const { data, error } = await supabase.from("cotisations").select("choriste_id, mois, montant");
    if (error) setError("Impossible de charger les cotisations. Avez-vous exécuté cotisations.sql ?");
    else setCotis((data ?? []) as Cotisation[]);
  }, []);

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("choristes").select("*"),
        supabase.from("parametres").select("valeur").eq("cle", CLE_MONTANT).maybeSingle(),
      ]);
      if (c.error) setError("Impossible de charger les choristes.");
      else setChoristes(sortChoristes((c.data ?? []) as Choriste[]));
      if (p.data?.valeur) setMontant(p.data.valeur);
      await loadCotis();
      setLoading(false);
    })();
  }, [loadCotis]);

  const montantNum = Number(montant) > 0 ? Math.round(Number(montant)) : null;

  // Paiements indexés par "choriste|AAAA-MM"
  const paid = useMemo(() => {
    const map = new Map<string, Cotisation>();
    for (const c of cotis) map.set(`${c.choriste_id}|${c.mois.slice(0, 7)}`, c);
    return map;
  }, [cotis]);

  const rows = useMemo(() => {
    return choristes
      .filter((c) => c.date_adhesion.slice(0, 7) <= mois)
      .map((c) => {
        const debut = c.date_adhesion.slice(0, 7);
        const aJour = paid.has(`${c.id}|${mois}`);
        const impayes = monthsRange(debut, mois).filter((m) => !paid.has(`${c.id}|${m}`));
        return { c, aJour, impayes };
      });
  }, [choristes, paid, mois]);

  const stats = useMemo(() => {
    const payes = rows.filter((r) => r.aJour).length;
    const encaisse = rows.reduce((s, r) => s + (paid.get(`${r.c.id}|${mois}`)?.montant ?? 0), 0);
    return { payes, impayes: rows.length - payes, encaisse };
  }, [rows, paid, mois]);

  const visibles = rows.filter(
    (r) => filtre === "tous" || (filtre === "payes" ? r.aJour : !r.aJour)
  );

  async function saveMontant() {
    const { error } = await supabase
      .from("parametres")
      .upsert({ cle: CLE_MONTANT, valeur: String(montantNum ?? "") });
    if (error) setError("Impossible d'enregistrer le montant.");
    else {
      setMontantSaved(true);
      setError("");
    }
  }

  async function marquerPaye(choristeId: string, m: string) {
    setBusy(`${choristeId}|${m}`);
    setError("");
    const { error } = await supabase
      .from("cotisations")
      .upsert(
        { choriste_id: choristeId, mois: `${m}-01`, montant: montantNum },
        { onConflict: "choriste_id,mois" }
      );
    if (error) setError("L'enregistrement a échoué. Réessayez.");
    else await loadCotis();
    setBusy(null);
  }

  async function annuler(c: Choriste, m: string) {
    const ok = window.confirm(`Annuler le paiement de ${c.prenom} ${c.nom} pour ${monthLabel(m)} ?`);
    if (!ok) return;
    setBusy(`${c.id}|${m}`);
    setError("");
    const { error } = await supabase
      .from("cotisations")
      .delete()
      .eq("choriste_id", c.id)
      .eq("mois", `${m}-01`);
    if (error) setError("L'annulation a échoué.");
    else await loadCotis();
    setBusy(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-wine">Cotisations</h1>
        <p className="text-sm text-ink/60">Mois de {monthLabel(mois)}</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-ink/60">
          Mois
          <input
            className="input mt-1"
            type="month"
            value={mois}
            onChange={(e) => e.target.value && setMois(e.target.value)}
          />
        </label>
        <label className="text-sm text-ink/60">
          Cotisation mensuelle (FCFA)
          <div className="mt-1 flex gap-2">
            <input
              className="input"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Ex. 1000"
              value={montant}
              onChange={(e) => {
                setMontant(e.target.value);
                setMontantSaved(false);
              }}
            />
            <button className="btn-ghost shrink-0" onClick={saveMontant} disabled={montantSaved}>
              {montantSaved ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </label>
      </div>

      {error && <p className="rounded-xl bg-warn/10 px-4 py-2.5 text-sm text-warn">{error}</p>}

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Ont payé" value={String(stats.payes)} color="text-ok" />
        <Stat label="N'ont pas payé" value={String(stats.impayes)} color="text-warn" />
        <Stat label="Encaissé" value={money(stats.encaisse)} color="text-wine" small />
      </div>

      <div className="flex gap-2">
        {(
          [
            ["tous", "Tous"],
            ["payes", "Payés"],
            ["impayes", "Non payés"],
          ] as [Filtre, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFiltre(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filtre === v ? "bg-wine text-white" : "bg-white text-ink/70 shadow-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink/60">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="card p-6 text-center text-ink/60">
          Aucun choriste inscrit à cette date. Changez de mois ou ajoutez des choristes.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map(({ c, aJour, impayes }) => {
            const arrieres = impayes.filter((m) => m !== mois);
            const isOpen = openId === c.id;
            const key = `${c.id}|${mois}`;
            return (
              <li key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {c.prenom} {c.nom}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gold">
                      {c.pupitre}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      aJour ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
                    }`}
                  >
                    {aJour ? "Payé" : "Non payé"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                    className={`text-left text-sm ${
                      arrieres.length > 0 ? "font-semibold text-warn" : "text-ink/55"
                    }`}
                  >
                    {arrieres.length === 0
                      ? "Aucun mois d'arriéré"
                      : `${arrieres.length} mois d'arriéré${isOpen ? " ▴" : " ▾"}`}
                  </button>
                  {aJour ? (
                    <button
                      onClick={() => annuler(c, mois)}
                      disabled={busy === key}
                      className="rounded-lg px-3 py-2 text-sm text-ink/60 hover:bg-wine-soft"
                    >
                      Annuler
                    </button>
                  ) : (
                    <button
                      onClick={() => marquerPaye(c.id, mois)}
                      disabled={busy === key}
                      className="btn-primary"
                    >
                      {busy === key ? "…" : "Marquer payé"}
                    </button>
                  )}
                </div>

                {isOpen && arrieres.length > 0 && (
                  <ul className="mt-3 divide-y divide-ink/10 rounded-xl bg-cream px-3">
                    {arrieres.map((m) => (
                      <li key={m} className="flex items-center justify-between gap-2 py-2">
                        <span className="text-sm capitalize">{monthLabel(m)}</span>
                        <button
                          onClick={() => marquerPaye(c.id, m)}
                          disabled={busy === `${c.id}|${m}`}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-wine hover:bg-wine-soft"
                        >
                          {busy === `${c.id}|${m}` ? "…" : "Régler"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {visibles.length === 0 && (
            <li className="card p-6 text-center text-ink/60">Personne dans cette catégorie.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="card flex flex-col justify-center py-3">
      <div className={`font-serif font-bold ${small ? "text-lg leading-9" : "text-3xl"} ${color}`}>
        {value}
      </div>
      <div className="text-xs text-ink/55">{label}</div>
    </div>
  );
}
