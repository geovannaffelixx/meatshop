export default function PaymentReturnPage() {
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
        href="meatshop://payments"
      >
        Abrir Meatshop
      </a>
      <p>
        Se o aplicativo não abrir automaticamente, abra-o pelo ícone no celular.
      </p>
    </main>
  );
}
