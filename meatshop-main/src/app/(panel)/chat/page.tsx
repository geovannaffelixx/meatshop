import { Suspense } from "react";
import { ChatScreen } from "@/modules/chat";
import { Spinner } from "@/shared/components/ui/spinner";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="page-surface flex min-h-[calc(100dvh-5rem)] items-center justify-center gap-2 text-slate-500">
          <Spinner /> Carregando mensagens...
        </div>
      }
    >
      <ChatScreen />
    </Suspense>
  );
}
