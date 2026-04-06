import PadraoPage from "@/components/layoutPadrao";

export default function UnderConstructionPage() {
  return (
    <PadraoPage titulo="Segurança" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen flex items-center justify-center bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-sm border">
          <h1 className="text-4xl font-bold text-red-600">
            Esta página está sendo construída!
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Estamos trabalhando para trazer o conteúdo desta página em breve.
          </p>
        </div>
      </div>
    </PadraoPage>
  );
}
