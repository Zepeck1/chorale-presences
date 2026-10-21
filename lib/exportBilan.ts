import { formatDate, todayISO } from "@/lib/types";

export type LigneChoriste = {
  nom: string;
  prenom: string;
  pupitre: string;
  present: number;
  absent: number;
  justifie: number;
  total: number;
  taux: number | null;
};

export type LigneRepetition = {
  date: string; // AAAA-MM-JJ
  present: number;
  absent: number;
  justifie: number;
  absents: string[];
  justifies: string[];
};

export type LigneAbsence = {
  date: string; // AAAA-MM-JJ
  choriste: string;
  pupitre: string;
  statut: "Absent" | "Justifié";
  motif: string;
};

export type BilanData = {
  choristes: LigneChoriste[];
  repetitions: LigneRepetition[];
  absences: LigneAbsence[];
};

const tauxTexte = (t: number | null) => (t === null ? "-" : `${t}%`);
const nomFichier = (ext: string) => `bilan-presences-${todayISO()}.${ext}`;

// ---------- EXCEL ----------
export async function exporterExcel(data: BilanData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  function feuille(
    nom: string,
    entetes: string[],
    lignes: (string | number)[][],
    largeurs: number[]
  ) {
    const ws = XLSX.utils.aoa_to_sheet([entetes, ...lignes]);
    ws["!cols"] = largeurs.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nom);
  }

  feuille(
    "Par choriste",
    ["Nom", "Prénom", "Pupitre", "Présent", "Absent", "Justifié", "Répétitions", "Taux de présence"],
    data.choristes.map((c) => [
      c.nom,
      c.prenom,
      c.pupitre,
      c.present,
      c.absent,
      c.justifie,
      c.total,
      tauxTexte(c.taux),
    ]),
    [20, 20, 12, 10, 10, 10, 13, 16]
  );

  feuille(
    "Répétitions",
    ["Date", "Présents", "Absents", "Justifiés", "Noms des absents", "Noms des justifiés"],
    data.repetitions.map((r) => [
      formatDate(r.date),
      r.present,
      r.absent,
      r.justifie,
      r.absents.join(", "),
      r.justifies.join(", "),
    ]),
    [24, 10, 10, 10, 45, 45]
  );

  feuille(
    "Absences",
    ["Date", "Choriste", "Pupitre", "Statut", "Motif"],
    data.absences.map((a) => [formatDate(a.date), a.choriste, a.pupitre, a.statut, a.motif]),
    [24, 28, 12, 12, 40]
  );

  XLSX.writeFile(wb, nomFichier("xlsx"));
}

// ---------- PDF ----------
export async function exporterPdf(data: BilanData) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const WINE: [number, number, number] = [122, 31, 61];
  const finY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WINE);
  doc.text("Bilan des présences", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `Édité le ${formatDate(todayISO())} - ${data.repetitions.length} répétition(s) - ${data.choristes.length} choriste(s)`,
    14,
    25
  );

  function titre(texte: string, y: number) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...WINE);
    doc.text(texte, 14, y);
    return y + 3;
  }

  const style = {
    headStyles: { fillColor: WINE, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    alternateRowStyles: { fillColor: [250, 246, 239] as [number, number, number] },
  };

  // 1. Par choriste
  let y = titre("Par choriste", 36);
  autoTable(doc, {
    ...style,
    startY: y,
    head: [["Choriste", "Pupitre", "Présent", "Absent", "Justifié", "Répét.", "Taux"]],
    body: data.choristes.map((c) => [
      `${c.prenom} ${c.nom}`,
      c.pupitre,
      c.present,
      c.absent,
      c.justifie,
      c.total,
      tauxTexte(c.taux),
    ]),
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
  });

  // 2. Répétitions
  y = titre("Répétitions", finY() + 12);
  autoTable(doc, {
    ...style,
    startY: y,
    head: [["Date", "Prés.", "Abs.", "Just.", "Absents", "Justifiés"]],
    body: data.repetitions.map((r) => [
      formatDate(r.date),
      r.present,
      r.absent,
      r.justifie,
      r.absents.join(", "),
      r.justifies.join(", "),
    ]),
    columnStyles: {
      0: { cellWidth: 38 },
      1: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 12 },
      3: { halign: "center", cellWidth: 12 },
    },
  });

  // 3. Détail des absences
  if (data.absences.length > 0) {
    y = titre("Détail des absences", finY() + 12);
    autoTable(doc, {
      ...style,
      startY: y,
      head: [["Date", "Choriste", "Pupitre", "Statut", "Motif"]],
      body: data.absences.map((a) => [
        formatDate(a.date),
        a.choriste,
        a.pupitre,
        a.statut,
        a.motif,
      ]),
    });
  }

  // Numéros de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`Page ${i} / ${pages}`, 196, 290, { align: "right" });
  }

  doc.save(nomFichier("pdf"));
}