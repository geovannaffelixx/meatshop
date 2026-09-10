"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LockKeyhole, UserRound, UsersRound } from "lucide-react";

const settingsLinks = [
  { href: "/settings/account", label: "Minha conta", icon: UserRound },
  { href: "/settings/security", label: "Segurança", icon: LockKeyhole },
  { href: "/settings/unit", label: "Unidade", icon: Building2 },
  { href: "/settings/users", label: "Equipe", icon: UsersRound },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="page-surface">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav aria-label="Configurações" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {settingsLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
