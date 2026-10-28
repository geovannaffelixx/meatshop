import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AuthLayout } from "@/shared/components/auth-layout";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

export default function NoPanelAccessPage() {
  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        Acesso ao painel
      </h1>
      <EmptyState
        icon={ShieldAlert}
        title="Acesso indisponível"
        description="Sua conta não possui vínculo ativo com uma unidade administrativa. Solicite acesso ao proprietário ou gerente do açougue."
        action={
          <Button asChild>
            <Link href="/login">Voltar ao login</Link>
          </Button>
        }
      />
    </AuthLayout>
  );
}
