"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Présences" },
  { href: "/choristes", label: "Choristes" },
];

export default function Nav({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-bold text-wine"
        >
          <Image
            src="/chova-logo.png"
            alt="Logo de la chorale"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
          />
          <span className="hidden sm:inline">Chœur</span>
        </Link>
        <nav className="flex gap-1 rounded-full bg-wine-soft p-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-wine text-white shadow-card" : "text-wine hover:bg-white/60"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={onLogout} className="text-sm text-ink/60 hover:text-wine">
          Déconnexion
        </button>
      </div>
    </header>
  );
}