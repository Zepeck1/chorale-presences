export type Role = "admin" | "secretaire" | "tresorier";

export const ROLES: Role[] = ["admin", "secretaire", "tresorier"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrateur",
  secretaire: "Secrétaire",
  tresorier: "Trésorier",
};

// Pages accessibles pour chaque rôle
export const ACCES: Record<string, Role[]> = {
  "/": ["admin", "secretaire"],
  "/choristes": ["admin", "secretaire"],
  "/cotisations": ["admin", "tresorier"],
  "/utilisateurs": ["admin"],
};

export const LIENS: { href: string; label: string }[] = [
  { href: "/", label: "Présences" },
  { href: "/choristes", label: "Choristes" },
  { href: "/cotisations", label: "Cotisations" },
  { href: "/utilisateurs", label: "Utilisateurs" },
];

// Page d'arrivée de chaque rôle
export const ACCUEIL: Record<Role, string> = {
  admin: "/",
  secretaire: "/",
  tresorier: "/cotisations",
};

export function peutAcceder(role: Role, path: string): boolean {
  const cle = Object.keys(ACCES).find((k) =>
    k === "/" ? path === "/" : path === k || path.startsWith(k + "/")
  );
  return cle ? ACCES[cle].includes(role) : false;
}
