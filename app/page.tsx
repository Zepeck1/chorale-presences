"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BilanPresences from "@/components/BilanPresences";
import {
  Choriste,
  PUPITRES,
  PresenceRow,
  Statut,
  formatDate,
  sortChoristes,
  todayISO,
} from "@/lib/types";

type Mark = { statut: Statut; motif: string };

const OPTIONS: { value: Statut; label: string; active: string }[] = [
  { value: "present", label: "Présent", active: "bg-ok text-white" },
  { value: "absent", label: "Absent", active: "bg-warn text-white" },
  { value: "justifie", label: "Justifié", active: "bg-info text-white" },
];

export default function PresencesPage() {
  const [onglet, setOnglet] = useState<"appel" | "bilan">("appel");
  const [date, setDate] = useState(todayISO());
  const [choristes, setChoristes] = useState<Choriste[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [filter, setFilter] = useState<string>("Tous");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Change à chaque enregistrement pour forcer le rechargement du bilan
  const [bilanKey, setBilanKey] = useState(0);

  // Charge les choristes une fois
  useEffect(() => {
    supabase
      .from("choristes")
      .select("*")
      .then(({ data, error }) => {
        if (error) setMessage({ ok: false, text: "Impossible de charger les choristes." });
        else setChoristes(sortChoristes((data ?? []) as Choriste[]));
      });
  }, []);

  // Charge les présences de la date choisie
  useEffect(() => {
    if (choristes.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    supabase
      .from("presences")
      .select("*")
      .eq("date", date)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage({ ok: false, text: "Impossible de charger les présences." });
          setLoading(false);
          return;
        }
        const rows = (data ?? []) as PresenceRow[];
        const next: Record<string, Mark> = {};
        for (const c of choristes) {
          const r = rows.find((x) => x.choriste_id === c.id);
          next[c.id] = r
            ? { statut: r.statut, motif: r.motif ?? "" }
            : { statut: "present", motif: "" };
        }
        setMarks(next);
        setAlreadySaved(rows.length > 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, choristes]);

  function setStatut(id: string, statut: Statut) {
    setMarks((m) => ({ ...m, [id]: { statut, motif: statut === "justifie" ? m[id].motif : "" } }));
  }

  function setMotif(id: string, motif: string) {
    setMarks((m) => ({ ...m, [id]: { ...m[id], motif } }));
  }

  function allPresent() {
    setMarks((m) => {
      const next: Record<string, Mark> = {};
      for (const id of Object.keys(m)) next[id] = { statut: "present", motif: "" };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const rows = choristes.map((c) => ({
      choriste_id: c.id,
      date,
      statut: marks[c.id].statut,
      motif:
        marks[c.id].statut === "justifie" && marks[c.id].motif.trim()
          ? marks[c.id].motif.trim()
          : null,
    }));
    const { error } = await supabase
      .from("presences")
      .upsert(rows, { onConflict: "choriste_id,date" });
    if (error) {
      setMessage({ ok: false, text: "L'enregistrement a échoué. Réessayez." });
    } else {
      setAlreadySaved(true);
      setBilanKey((k) => k + 1);
      setMessage({ ok: true, text: "Appel enregistré ✓" });
    }
    setSaving(false);
  }

  function ouvrirDate(d: string) {
    setDate(d);
    setOnglet("appel");
  }

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, justifie: 0 };
    for (const id of Object.keys(marks)) c[marks[id].statut]++;
    return c;
  }, [marks]);

  const visible = choristes.filter((c) => filter === "Tous" || c.pupitre === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-wine">
          {onglet === "appel" ? "Appel" : "Bilan des présences"}
        </h1>
        {onglet === "appel" && (
          <p className="text-sm text-ink/60">Répétition du {formatDate(date)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-full bg-wine-soft p-1">
        {(
          [
            ["appel", "Appel"],
            ["bilan", "Bilan"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setOnglet(v)}
            className={`rounded-full py-1.5 text-sm font-semibold transition ${
              onglet === v ? "bg-wine text-white shadow-card" : "text-wine hover:bg-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {onglet === "bilan" ? (
        <BilanPresences key={bilanKey} choristes={choristes} onOpenDate={ouvrirDate} />
      ) : (
        <>
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <label className="flex-1 text-sm text-ink/60">
              Date de la répétition
              <input
                className="input mt-1"
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </label>
            <button onClick={allPresent} className="btn-ghost" disabled={choristes.length === 0}>
              Tous présents
            </button>
          </div>

          {alreadySaved && (
            <p className="rounded-xl bg-gold/15 px-4 py-2.5 text-sm text-ink/80">
              Un appel existe déjà pour cette date. Vous pouvez le modifier.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Présents" value={counts.present} color="text-ok" />
            <Stat label="Absents" value={counts.absent} color="text-warn" />
            <Stat label="Justifiés" value={counts.justifie} color="text-info" />
          </div>

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

          {loading ? (
            <p className="text-ink/60">Chargement…</p>
          ) : choristes.length === 0 ? (
            <p className="card p-6 text-center text-ink/60">
              Aucun choriste enregistré. Ajoutez-en depuis l&apos;onglet « Choristes ».
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((c) => {
                const m = marks[c.id];
                if (!m) return null;
                return (
                  <li key={c.id} className="card p-4">
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <span className="font-semibold">
                        {c.prenom} {c.nom}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                        {c.pupitre}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-cream p-1">
                      {OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => setStatut(c.id, o.value)}
                          className={`rounded-lg py-2 text-sm font-semibold transition ${
                            m.statut === o.value ? o.active : "text-ink/60 hover:bg-white"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {m.statut === "justifie" && (
                      <input
                        className="input mt-3"
                        placeholder="Motif (facultatif)"
                        value={m.motif}
                        onChange={(e) => setMotif(c.id, e.target.value)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {choristes.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-cream/95 p-3 backdrop-blur">
              <div className="mx-auto flex max-w-3xl items-center gap-3">
                <div className="flex-1 text-sm">
                  {message && (
                    <span className={message.ok ? "font-semibold text-ok" : "text-warn"}>
                      {message.text}
                    </span>
                  )}
                </div>
                <button onClick={save} disabled={saving || loading} className="btn-primary px-6">
                  {saving ? "Enregistrement…" : "Enregistrer l'appel"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card py-3">
      <div className={`font-serif text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-ink/55">{label}</div>
    </div>
  );
}