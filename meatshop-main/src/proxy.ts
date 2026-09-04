import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicRoute } from "@/shared/auth/route-access";

// Arquivos estáticos que NÃO devem ser interceptados
function isStaticAsset(pathname: string) {
  return /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/i.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Se for arquivo estático → NÃO passa pelo middleware
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Cookie HttpOnly enviado automaticamente pelo backend NestJS
  const token = request.cookies.get("access_token")?.value;

  const onPublic = isPublicRoute(pathname);

  // 1) Se NÃO estiver logado e tentar acessar rota privada → /login
  if (!token && !onPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
