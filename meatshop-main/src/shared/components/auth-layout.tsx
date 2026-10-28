import Image from "next/image";
import type { ReactNode } from "react";
import { APP_VERSION } from "@/shared/config/app-version";
import { cn } from "@/shared/lib/utils";

export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-screen bg-white lg:grid-cols-[minmax(22rem,0.85fr)_1.15fr]"
    >
      <section aria-hidden="true" className="relative hidden bg-white lg:block">
        <div className="sticky top-0 h-dvh overflow-hidden">
          <Image src="/entrar.png" alt="" fill priority sizes="42vw" className="object-cover" />
        </div>
      </section>
      <section className="flex min-h-screen min-w-0 flex-col bg-white px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex w-full flex-1 items-center justify-center py-4">
          <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>{children}</div>
        </div>
        <p className="mt-4 text-center text-xs font-medium text-slate-500">Versão {APP_VERSION}</p>
      </section>
    </main>
  );
}
