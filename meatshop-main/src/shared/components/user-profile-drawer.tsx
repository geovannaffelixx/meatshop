'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { UserAvatar } from '@/shared/components/user-avatar';
import { usePanelAccess } from '@/shared/providers/panel-access-provider';
import { apiPost } from '@/shared/lib/api';
import { resetApiCache } from '@/shared/lib/query-cache';
import { toast } from '@/shared/lib/toast';
import type { UnitRole } from '@/shared/auth/panel-access';
import packageJson from '../../../package.json';

const roleLabels: Record<UnitRole, string> = { OWNER: 'Responsável', MANAGER: 'Gerente', OPERATOR: 'Operador', DELIVERY: 'Entregador' };

export function UserProfileDrawer() {
  const { user, selectedMembership } = usePanelAccess();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;
  const role = user.global_role === 'SUPER_ADMIN' ? 'Administrador do sistema' : selectedMembership?.role ? roleLabels[selectedMembership.role] : 'Usuário';

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost('/auth/logout', {});
      resetApiCache();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('meatshop:selected-unit-id');
      window.dispatchEvent(new Event('currentUserUpdated'));
      setOpen(false);
      router.replace('/login');
    } catch {
      toast.error('Não foi possível sair. Tente novamente.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" aria-label="Abrir perfil do usuário" className="flex items-center gap-2 rounded-full p-1.5 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <UserAvatar name={user.name} src={user.avatar_url} />
          <ChevronDown className="size-3.5 text-slate-300" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-white sm:max-w-sm">
        <SheetHeader className="border-b border-slate-100 px-6 py-6">
          <SheetTitle>Meu perfil</SheetTitle>
          <SheetDescription>Sua identidade e acesso nesta unidade.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-6">
          <section className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-6 text-center">
            <UserAvatar name={user.name} src={user.avatar_url} size="lg" />
            <div><p className="break-words font-semibold text-slate-900">{user.name}</p><p className="mt-1 break-all text-sm text-slate-500">{user.email}</p></div>
          </section>
          <dl className="space-y-5 px-1 text-sm">
            <div><dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Building2 className="size-4" />Unidade atual</dt><dd className="mt-1 break-words font-medium text-slate-900">{selectedMembership?.unit_name ?? 'Nenhuma unidade selecionada'}</dd></div>
            <div><dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><ShieldCheck className="size-4" />Cargo/Função</dt><dd className="mt-1 font-medium text-slate-900">{role}</dd></div>
          </dl>
          <SheetClose asChild><Button asChild variant="outline" className="h-auto w-full justify-start gap-3 rounded-xl px-4 py-4 text-left"><Link href="/settings/account"><UserRound className="size-5 shrink-0 text-red-600" /><span className="min-w-0 flex-1"><span className="block font-semibold">Gerenciar minha conta</span><span className="mt-1 block text-xs font-normal text-slate-500">Dados pessoais, foto e segurança</span></span><ArrowRight className="size-4 shrink-0 text-slate-400" /></Link></Button></SheetClose>
        </div>
        <SheetFooter className="gap-4 border-t border-slate-100 px-6 py-5">
          <Button type="button" onClick={() => void logout()} disabled={loggingOut} variant="ghost" className="justify-start gap-3 rounded-xl text-red-700 hover:bg-red-50 hover:text-red-800"><LogOut className="size-4" />{loggingOut ? 'Saindo...' : 'Sair'}</Button>
          <p className="text-right text-xs text-slate-400">v{packageJson.version}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
