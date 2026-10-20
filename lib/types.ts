export const PUPITRES = ["Soprano", "Alto", "Ténor", "Basse"] as const;
export type Pupitre = (typeof PUPITRES)[number];

export type Statut = "present" | "absent" | "justifie";

export type Choriste = {
  id: string;
  nom: string;
  prenom: string;
  pupitre: Pupitre;
  date_adhesion: string;
};

export type PresenceRow = {
  choriste_id: string;
  date: string;
  statut: Statut;
  motif: string | null;
};

export function sortChoristes(list: Choriste[]): Choriste[] {
  return [...list].sort((a, b) => {
    const p = PUPITRES.indexOf(a.pupitre) - PUPITRES.indexOf(b.pupitre);
    if (p !== 0) return p;
    const n = a.nom.localeCompare(b.nom, "fr");
    return n !== 0 ? n : a.prenom.localeCompare(b.prenom, "fr");
  });
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
