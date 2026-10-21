"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Choriste, PUPITRES, PresenceRow, formatDate } from "@/lib/types";
import {
  BilanData,
  LigneAbsence,
  exporterExcel,
  exporterPdf,
} from "@/lib/exportBilan";

type Props = {
  choristes: Choriste[];
  onOpenDate: (date: string) => void;
};

// Récupère toutes les présences (par pages de 1000, limite par défaut de Supabase)
async function fetchAll(): Promise<PresenceRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: PresenceRow[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("presences")
      .select("*")
      .order("date", { ascending: false })
      .order("choriste_id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as PresenceRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default function BilanPresences({ choristes, onOpenDate }: Props) {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vue, setVue] = useState<"choristes" | "repetitions">("choristes");
  const [filter, setFilter] = useState("Tous");
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'historique.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nomDe = useMemo(() => {
    const m = new Map<string, Choriste>();
    for (const c of choristes) m.set(c.id, c);
    return m;
  }, [choristes]);

  // Une répétition = une date pour laquelle un appel a été enregistré
  const repetitions = useMemo(() => {
    const byDate = new Map<
      string,
      { present: number; absent: number; justifie: number; absents: string[]; justifies: string[] }
    >();
    for (const r of rows) {
      const d =
        byDate.get(r.date) ??
        { present: 0, absent: 0, justifie: 0, absents: [], justifies: [] };
      d[r.statut]++;
      const c = nomDe.get(r.choriste_id);
      const nom = c ? `${c.prenom} ${c.nom}` : "Inconnu";
      if (r.statut === "absent") d.absents.push(nom);
      if (r.statut === "justifie") d.justifies.push(nom);
      byDate.set(r.date, d);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, v]) => ({ date, ...v }));
  }, [rows, nomDe]);

  const stats = useMemo(() => {
    const m = new Map<
      string,
      { present: number; absent: number; justifie: number; absences: PresenceRow[] }
    >();
    for (const c of choristes) m.set(c.id, { present: 0, absent: 0, justifie: 0, absences: [] });
    for (const r of rows) {
      const s = m.get(r.choriste_id);
      if (!s) continue;
      s[r.statut]++;
      if (r.statut !== "present") s.absences.push(r);
    }
    return m;
  }, [rows, choristes]);

  // Données prêtes à exporter (PDF / Excel)
  const exportData = useMemo<BilanData>(() => {
    const lignesChoristes = choristes.map((c) => {
      const s = stats.get(c.id) ?? { present: 0, absent: 0, justifie: 0 };
      const total = s.present + s.absent + s.justifie;
      return {
        nom: c.nom,
        prenom: c.prenom,
        pupitre: c.pupitre,
        present: s.present,
        absent: s.absent,
        justifie: s.justifie,
        total,
        taux: total > 0 ? Math.round((s.present / total) * 100) : null,
      };
    });

    const absences: LigneAbsence[] = [];
    for (const r of rows) {
      if (r.statut === "present") continue;
      const c = nomDe.get(r.choriste_id);
      if (!c) continue;
      absences.push({
        date: r.date,
        choriste: `${c.prenom} ${c.nom}`,
        pupitre: c.pupitre,
        statut: r.statut === "justifie" ? "Justifié" : "Absent",
        motif: r.motif ?? "",
      });
    }
    absences.sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.choriste.localeCompare(b.choriste)
    );

    return { choristes: lignesChoristes, repetitions, absences };
  }, [choristes, stats, rows, nomDe, repetitions]);

  async function telecharger(type: "pdf" | "excel") {
    setExporting(type);
    setExportError("");
    try {
      if (type === "pdf") await exporterPdf(exportData);
      else await exporterExcel(exportData);
    } catch {
      setExportError("Le téléchargement a échoué. Réessayez.");
    }
    setExporting(null);
  }

  const visibles = choristes.filter((c) => filter === "Tous" || c.pupitre === filter);

  if (loading) return <p className="text-ink/60">Chargement…</p>;
  if (error) return <p className="text-warn">{error}</p>;

  return (
    <div className="space-y-5">
      {rows.length > 0 && (
        <div className="card space-y-2 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => telecharger("pdf")}
              disabled={exporting !== null}
              className="btn-ghost"
            >
              {exporting === "pdf" ? "Création…" : "Télécharger PDF"}
            </button>
            <button
              onClick={() => telecharger("excel")}
              disabled={exporting !== null}
              className="btn-ghost"
            >
              {exporting === "excel" ? "Création…" : "Télécharger Excel"}
            </button>
          </div>
          {exportError && <p className="text-sm text-warn">{exportError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-white p-1 shadow-card">
        {(
          [
            ["choristes", "Par choriste"],
            ["repetitions", `Répétitions (${repetitions.length})`],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVue(v)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              vue === v ? "bg-wine text-white" : "text-ink/60 hover:bg-cream"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-ink/60">
          Aucun appel enregistré pour l&apos;instant.
        </p>
      ) : vue === "repetitions" ? (
        <ul className="space-y-3">
          {repetitions.map((r) => (
            <li key={r.date} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold capitalize">{formatDate(r.date)}</span>
                <button
                  onClick={() => onOpenDate(r.date)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-wine hover:bg-wine-soft"
                >
                  Voir / modifier
                </button>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-ok">{r.present} présent{r.present > 1 ? "s" : ""}</span>
                <span className="text-warn">{r.absent} absent{r.absent > 1 ? "s" : ""}</span>
                <span className="text-info">{r.justifie} justifié{r.justifie > 1 ? "s" : ""}</span>
              </div>
              {r.absents.length > 0 && (
                <p className="mt-2 text-xs text-ink/60">
                  <span className="font-semibold text-warn">Absents :</span>{" "}
                  {r.absents.join(", ")}
                </p>
              )}
              {r.justifies.length > 0 && (
                <p className="mt-1 text-xs text-ink/60">
                  <span className="font-semibold text-info">Justifiés :</span>{" "}
                  {r.justifies.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {["Tous", ...PUPITRES].map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === p ? "bg-wine text-white" : "bg-white text-ink/70 shadow-card"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <ul className="space-y-3">
            {visibles.map((c) => {
              const s = stats.get(c.id);
              if (!s) return null;
              const total = s.present + s.absent + s.justifie;
              const taux = total > 0 ? Math.round((s.present / total) * 100) : null;
              const isOpen = open === c.id;
              return (
                <li key={c.id} className="card p-4">
                  <button
                    className="w-full text-left"
                    onClick={() => setOpen(isOpen ? null : c.id)}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">
                        {c.prenom} {c.nom}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                        {c.pupitre}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <Mini label="Présent" value={s.present} color="text-ok" />
                      <Mini label="Absent" value={s.absent} color="text-warn" />
                      <Mini label="Justifié" value={s.justifie} color="text-info" />
                      <Mini
                        label="Taux"
                        value={taux === null ? "–" : `${taux}%`}
                        color={taux !== null && taux < 60 ? "text-warn" : "text-ink"}
                      />
                    </div>
                    <div className="mt-2 text-xs text-ink/50">
                      {total} répétition{total > 1 ? "s" : ""} ·{" "}
                      {isOpen ? "Masquer" : "Voir"} les absences
                    </div>
                  </button>

                  {isOpen && (
                    <ul className="mt-3 divide-y divide-ink/10 border-t border-ink/10 text-sm">
                      {s.absences.length === 0 ? (
                        <li className="py-2 text-ink/60">Aucune absence 🎉</li>
                      ) : (
                        s.absences.map((a) => (
                          <li key={a.date} className="flex justify-between gap-3 py-2">
                            <span className="capitalize">{formatDate(a.date)}</span>
                            <span
                              className={
                                a.statut === "justifie" ? "text-info" : "text-warn"
                              }
                            >
                              {a.statut === "justifie"
                                ? `Justifié${a.motif ? ` · ${a.motif}` : ""}`
                                : "Absent"}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-cream py-2">
      <div className={`font-serif text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-ink/55">{label}</div>
    </div>
  );
}