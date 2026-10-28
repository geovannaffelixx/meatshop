import { AuthLayout } from "@/shared/components/auth-layout";
import { Button } from "@/shared/components/ui/button";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = params.checkoutId;
  const destination =
    typeof id === "string" && /^\d{1,12}$/.test(id)
      ? `meatshop://payments?order_id=${id}`
      : "meatshop://payments";
  return (
    <AuthLayout>
      <div className="space-y-5 text-sm text-slate-600">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Volte ao Meatshop para acompanhar
        </h1>
        <p>
          O resultado do pagamento será confirmado pelo servidor. Esta página, sozinha, não confirma
          que o pagamento foi aprovado.
        </p>
        <p>
          Volte ao aplicativo e abra “Ver pagamento” no pedido. Se comprou em vários açougues,
          confira se ainda existem pagamentos pendentes.
        </p>
        <Button asChild>
          <a href={destination}>Abrir Meatshop</a>
        </Button>
        <p>Se o aplicativo não abrir automaticamente, abra-o pelo ícone no celular.</p>
      </div>
    </AuthLayout>
  );
}
