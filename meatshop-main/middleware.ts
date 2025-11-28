import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rotas públicas — não exigem autenticação
const PUBLIC_PATHS = ["/", "/entrar", "/cadastrar", "/recuperar"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Arquivos estáticos que NÃO devem ser interceptados
function isStaticAsset(pathname: string) {
  return /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Se for arquivo estático → NÃO passa pelo middleware
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Cookie HttpOnly enviado automaticamente pelo backend NestJS
  const token = request.cookies.get("access_token")?.value;

  const onPublic = isPublic(pathname);

  // 1) Se NÃO estiver logado e tentar acessar rota privada → /entrar
  if (!token && !onPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  // 2) Se estiver logado e tentar acessar página pública → /home
  // (exceto a raiz "/")
  if (token && onPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
