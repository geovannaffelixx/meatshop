"use client";

import PadraoPage from "@/components/layoutPadrao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiPatch } from "@/lib/api";
import { Loader2, Pencil, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function UserProfilePage() {
  const { user, loading, refetch } = useCurrentUser();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // State para o formulário
  const [formData, setFormData] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    telefone: "",
    celular: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    descricao: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nomeFantasia: user.nomeFantasia || "",
        razaoSocial: user.razaoSocial || "",
        cnpj: user.cnpj || "",
        telefone: user.telefone || "",
        celular: user.celular || "",
        cep: user.cep || "",
        logradouro: user.logradouro || "",
        numero: user.numero || "",
        complemento: user.complemento || "",
        bairro: user.bairro || "",
        cidade: user.cidade || "",
        estado: user.estado || "",
        descricao: user.descricao || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await apiPatch("/users/me", formData);
      if (res.ok) {
        setSuccessMsg("Perfil atualizado com sucesso!");
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSuccessMsg("");
          refetch();
        }, 1500);
      } else {
        setErrorMsg(res.message || "Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PadraoPage titulo="Minha Conta" imagem="/logoClaraEscrita.png">
      {loading ? (
        <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center bg-[#f8f9fa] bg-[url('/BackgroundClaro.png')] bg-repeat">
          <Loader2 className="animate-spin text-red-600" size={48} />
        </div>
      ) : user ? (
        <div className="min-h-screen bg-[#f8f9fa] bg-[url('/BackgroundClaro.png')] bg-repeat p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-md rounded-xl border p-8">
              <h1 className="text-4xl font-bold text-[#b23b2b] mb-8 uppercase">
                Minha Conta
              </h1>

              <div className="max-w-2xl border-2 border-gray-100 rounded-3xl p-8 relative">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 shadow-inner">
                    {user.logoUrl ? (
                      <img
                        src={user.logoUrl}
                        alt={user.nomeFantasia}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-gray-400" />
                    )}
                  </div>

                  <div className="space-y-4 flex-1 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-gray-700">
                      {user.nomeFantasia || user.razaoSocial}
                    </h2>

                    <div className="space-y-2 text-lg text-gray-600">
                      <p className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="font-bold">CNPJ:</span>{" "}
                        {user.cnpj || "Não informado"}
                      </p>
                      <p className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="font-bold">Telefone:</span>{" "}
                        {user.telefone || user.celular || "Não informado"}
                      </p>
                      <p className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="font-bold">E-mail:</span> {user.email}
                      </p>
                      <div className="pt-2">
                        <p className="font-bold">Endereço:</p>
                        <p>
                          {user.logradouro}, {user.numero} - {user.bairro},
                          <br /> {user.cidade} - {user.estado}
                        </p>
                      </div>

                      <div className="pt-2">
                        <p className="font-bold">Descrição:</p>
                        <p className="italic text-gray-500">
                          {user.descricao || "Nenhuma descrição informada."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="inline-flex items-center gap-2 text-[#b23b2b] font-bold hover:underline mt-4 text-lg transition-all"
                    >
                      <Pencil size={20} className="mt-1" />
                      Editar dados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Editar Dados do Perfil
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Nome Fantasia
              </label>
              <Input
                value={formData.nomeFantasia}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nomeFantasia: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Razão Social
              </label>
              <Input
                value={formData.razaoSocial}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    razaoSocial: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                CNPJ
              </label>
              <Input
                value={formData.cnpj}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cnpj: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Telefone
              </label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    telefone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Celular
              </label>
              <Input
                value={formData.celular}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    celular: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">CEP</label>
              <Input
                value={formData.cep}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cep: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Logradouro
              </label>
              <Input
                value={formData.logradouro}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    logradouro: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Número
              </label>
              <Input
                value={formData.numero}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, numero: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Bairro
              </label>
              <Input
                value={formData.bairro}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bairro: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Cidade
              </label>
              <Input
                value={formData.cidade}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cidade: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Estado (UF)
              </label>
              <Input
                value={formData.estado}
                maxLength={2}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estado: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-600">
                Descrição
              </label>
              <Textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    descricao: e.target.value,
                  }))
                }
                placeholder="Conte um pouco sobre seu açougue..."
                rows={4}
              />
            </div>
          </div>

          {(errorMsg || successMsg) && (
            <div
              className={`text-sm font-medium mb-4 ${errorMsg ? "text-red-500" : "text-green-600"}`}
            >
              {errorMsg || successMsg}
            </div>
          )}

          <DialogFooter>
            <Button
              className="text-black"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#b23b2b] hover:bg-[#8e2e22]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PadraoPage>
  );
}
