import Link from "next/link";

export default function NoPanelAccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 p-6">
      <section className="max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Acesso ao painel indisponível</h1>
        <p className="mt-3 text-gray-600">Sua conta não possui vínculo ativo com uma unidade administrativa. Solicite acesso ao proprietário ou gerente do açougue.</p>
        <Link href="/login" className="mt-6 inline-block rounded-md bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700">Voltar ao login</Link>
      </section>
    </main>
  );
}
