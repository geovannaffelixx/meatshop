import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/entrar", "/recuperar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se a rota atual é pública
  const isPublicRoute = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Cookie que vamos criar no login
  const token = request.cookies.get("accessToken")?.value;

  // 🔒 Se NÃO tiver token e a rota NÃO for pública → manda para /entrar
  if (!token && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  // 🔁 Se tiver token e a pessoa tentar ir para /entrar → manda pra /home
  if (token && pathname === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Em quais rotas o middleware roda
export const config = {
  matcher: [
    "/home/:path*",
    "/pedidos/:path*",
    "/estoque/:path*",
    "/configuracoes/:path*",
    // adicione aqui outras rotas que quiser proteger
  ],
};
