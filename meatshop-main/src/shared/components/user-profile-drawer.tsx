'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react';
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
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 sm:max-w-sm">
        <SheetHeader className="border-b border-slate-200 bg-white px-6 py-6">
          <SheetTitle>Meu perfil</SheetTitle>
          <SheetDescription>Seus dados e acesso à conta.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-6">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <UserAvatar name={user.name} src={user.avatar_url} size="lg" />
            <div><p className="break-words font-semibold text-slate-900">{user.name}</p><p className="mt-1 break-all text-sm text-slate-500">{user.email}</p></div>
          </section>
          <dl className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <div><dt className="text-slate-500">Unidade atual</dt><dd className="mt-1 break-words font-medium text-slate-900">{selectedMembership?.unit_name ?? 'Nenhuma unidade selecionada'}</dd></div>
            <div><dt className="text-slate-500">Cargo/Função</dt><dd className="mt-1 font-medium text-slate-900">{role}</dd></div>
          </dl>
          <div className="grid gap-3">
            <SheetClose asChild><Button asChild variant="outline" className="justify-start gap-2"><Link href="/settings/account"><UserRound className="size-4" />Minha conta</Link></Button></SheetClose>
            <SheetClose asChild><Button asChild variant="outline" className="justify-start gap-2"><Link href="/settings/account#security"><KeyRound className="size-4" />Alterar senha</Link></Button></SheetClose>
          </div>
        </div>
        <SheetFooter className="gap-4 px-6 pb-6">
          <Button type="button" onClick={() => void logout()} disabled={loggingOut} className="gap-2 bg-red-600 text-white hover:bg-red-700"><LogOut className="size-4" />{loggingOut ? 'Saindo...' : 'Sair'}</Button>
          <p className="text-right text-xs text-slate-400">v{packageJson.version}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
