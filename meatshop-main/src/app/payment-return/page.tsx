export default async function PaymentReturnPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const id=params.checkoutId;
  const destination=typeof id==='string' && /^\d{1,12}$/.test(id) ? `meatshop://payments?order_id=${id}` : 'meatshop://payments';
  return (
    <main className="mx-auto max-w-lg p-8 space-y-5">
      <h1 className="text-2xl font-semibold">
        Volte ao Meatshop para acompanhar
      </h1>
      <p>
        O resultado do pagamento será confirmado pelo servidor. Esta página,
        sozinha, não confirma que o pagamento foi aprovado.
      </p>
      <p>
        Volte ao aplicativo e abra “Ver pagamento” no pedido. Se comprou em
        vários açougues, confira se ainda existem pagamentos pendentes.
      </p>
      <a
        className="inline-block rounded bg-red-700 px-4 py-3 text-white"
        href={destination}
      >
        Abrir Meatshop
      </a>
      <p>
        Se o aplicativo não abrir automaticamente, abra-o pelo ícone no celular.
      </p>
    </main>
  );
}
