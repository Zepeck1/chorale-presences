"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LIENS, ROLE_LABEL, Role, peutAcceder } from "@/lib/roles";

export default function Nav({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const pathname = usePathname();
  const links = LIENS.filter((l) => peutAcceder(role, l.href));

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link
          href={links[0]?.href ?? "/"}
          className="flex items-center gap-2 font-serif text-lg font-bold text-wine"
        >
          <Image
            src="/chova-logo.png"
            alt="Logo de la chorale"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
          />
          <span className="hidden sm:inline">CHOVA</span>
        </Link>

        <nav className="order-3 flex w-full justify-center gap-1 overflow-x-auto rounded-full bg-wine-soft p-1 sm:order-none sm:w-auto">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-wine text-white shadow-card" : "text-wine hover:bg-white/60"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-gold">
            {ROLE_LABEL[role]}
          </div>
          <button onClick={onLogout} className="text-sm text-ink/60 hover:text-wine">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
