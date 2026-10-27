'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Spinner } from "@/shared/components/ui/spinner";
import { DataSkeleton } from "@/shared/components/data-skeleton";
import { apiPost } from "@/shared/lib/api";
import { getErrorMessage } from "@/shared/lib/api-error-translations";

type VerificationState = { status: "loading" | "success" | "error"; message: string };

const INVALID_LINK_MESSAGE = "Link de confirmação inválido ou expirado. Solicite um novo e-mail de confirmação.";

function useEmailVerification(token: string): VerificationState {
  const [state, setState] = useState<VerificationState>({ status: "loading", message: "Confirmando seu e-mail..." });
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    if (!token) {
      setState({ status: "error", message: INVALID_LINK_MESSAGE });
      return;
    }
    apiPost("/auth/verify-email", { token }, { silent: true })
      .then(() => setState({ status: "success", message: "E-mail confirmado com sucesso. Você já pode entrar no painel." }))
      .catch((error) => setState({ status: "error", message: getErrorMessage(error, INVALID_LINK_MESSAGE) }));
  }, [token]);

  return state;
}

function VerifyEmailContent() {
  const token = useSearchParams().get("token") ?? "";
  const { status, message } = useEmailVerification(token);
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="flex flex-col items-center">
          <MailCheck className="mb-2 size-10 text-red-700" aria-hidden="true" />
          <CardTitle className="text-center text-xl font-bold text-red-700">Confirmação de e-mail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p role={status === "error" ? "alert" : "status"} className={`flex items-center justify-center gap-2 text-sm ${status === "error" ? "text-red-700" : "text-slate-700"}`}>
            {status === "loading" && <Spinner />}
            {message}
          </p>
          {status !== "loading" && <Link href="/login" className="text-sm font-semibold text-red-700 hover:underline">Ir para o login</Link>}
        </CardContent>
      </Card>
    </main>
  );
}

export function VerifyEmailScreen() {
  return (
    <Suspense fallback={<DataSkeleton label="Carregando..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
