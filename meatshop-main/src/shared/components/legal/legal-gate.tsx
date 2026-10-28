'use client';

import Link from 'next/link';
import { PageHeader } from '@/shared/components/page-header';
import { usePathname, useRouter } from 'next/navigation';
import { usePanelAccess } from '@/shared/providers/panel-access-provider';
import { isPublicRoute } from '@/shared/auth/route-access';
import { apiPost } from '@/shared/lib/api';
import { Button } from '@/shared/components/ui/button';
import { LoadingOverlay } from '@/shared/components/loading-overlay';
import { useLegalPending } from '@/shared/legal/use-legal-pending';
import { LegalConsent } from './legal-consent';
import type { LegalDocument } from '@/shared/legal/legal-api';

export function LegalGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, selectedMembership, unitId } = usePanelAccess();
  const scope = selectedMembership?.role === 'OWNER' ? (unitId ?? undefined) : undefined;
  const key = `${user?.id}:${scope ?? ''}`;
  const exempt =
    isPublicRoute(pathname) ||
    ['/select-unit', '/support', '/settings/account', '/settings/legal'].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
  const { catalog, loading, error, reload } = useLegalPending(key, Boolean(user && !exempt), scope);
  if (!user || exempt) return children;
  if (error) return <LegalGateError error={error} onRetry={reload} />;
  if (loading) return <LoadingOverlay title="Verificando documentos..." />;
  if (!catalog) return children;
  return (
    <LegalGateContent key={key} documents={catalog.documents} unitId={scope} onAccepted={reload} />
  );
}

function LegalGateContent({
  documents,
  unitId,
  onAccepted,
}: {
  documents: LegalDocument[];
  unitId?: number;
  onAccepted: () => void;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="MeatShop"
          title="Termos e privacidade"
          description={`Confira os documentos vigentes para continuar${unitId ? ' com a unidade selecionada' : ''}.`}
        />
        <section className="space-y-6 rounded-xl border bg-white p-5 shadow-sm sm:p-8">
          <LegalConsent documents={documents} unitId={unitId} onAccepted={onAccepted} />
          <div className="border-t border-slate-200 pt-5">
            <RecoveryLinks />
          </div>
        </section>
      </div>
    </main>
  );
}

function LegalGateError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-dvh bg-slate-50 p-6">
      <div className="mx-auto mt-12 max-w-xl space-y-4 rounded-xl border bg-white p-6" role="alert">
        {error}
        <Button onClick={onRetry}>Tentar novamente</Button>
        <RecoveryLinks />
      </div>
    </div>
  );
}

function RecoveryLinks() {
  const router = useRouter();
  const logout = async () => {
    await apiPost('/auth/logout', {});
    window.dispatchEvent(new Event('auth:session-expired'));
    router.replace('/login');
  };
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-slate-600 [&_a]:underline-offset-4 [&_a:hover]:text-red-700 [&_a:hover]:underline [&_button:hover]:text-red-700">
      <Link href="/support">Suporte e pedidos existentes</Link>
      <Link href="/settings/account">Minha conta</Link>
      <a href="mailto:viniciusrodri0809@gmail.com">Contato sobre dados pessoais</a>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </div>
  );
}
