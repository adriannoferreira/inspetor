import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('Erro de autenticação no middleware:', error.message);
      // Limpar todos os cookies do Supabase
      res.cookies.delete('sb-access-token');
      res.cookies.delete('sb-refresh-token');
      // Limpar cookies com diferentes formatos
      const cookieNames = req.cookies.getAll().map(c => c.name);
      cookieNames.forEach(name => {
        if (name.startsWith('sb-') || name.includes('supabase')) {
          res.cookies.delete(name);
        }
      });
      user = null;
    } else {
      user = data.user;
      console.log('Usuário no middleware:', user ? `${user.email} (${user.id})` : 'null');
    }
  } catch (error) {
    // Se houver erro ao obter usuário (ex: cookie corrompido), tratar como não autenticado
    console.warn('Erro ao obter usuário no middleware:', error);
    // Limpar todos os cookies do Supabase
    res.cookies.delete('sb-access-token');
    res.cookies.delete('sb-refresh-token');
    const cookieNames = req.cookies.getAll().map(c => c.name);
    cookieNames.forEach(name => {
      if (name.startsWith('sb-') || name.includes('supabase')) {
        res.cookies.delete(name);
      }
    });
    user = null;
  }

  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Modo manutenção (preservar caso já exista flag/env ou cookie)
  const maintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  if (maintenance && pathname !== '/login' && pathname !== '/register' && pathname !== '/maintenance') {
    url.pathname = '/maintenance';
    return NextResponse.redirect(url);
  }

  // Função helper para verificar admin
  const isAdmin = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (error || !data?.is_active) return false;
      return data.role === 'admin';
    } catch (error) {
      console.warn('Erro ao verificar admin no middleware:', error);
      return false;
    }
  };

  // Rotas públicas que não exigem auth
  const publicRoutes = new Set<string>([
    '/',
    '/login',
    '/maintenance',
  ]);

  // Rotas de API que não exigem auth (webhooks)
  const publicApiRoutes = [
    '/api/webhook/',
  ];

  // Verificar se é uma rota de API pública
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));
  if (isPublicApiRoute) {
    console.log('✅ Acesso permitido à API pública:', pathname);
    return res;
  }

  // Rotas de auth
  const authRoutes = pathname === '/login' || pathname === '/register';

  // Se usuário autenticado acessa rotas de auth, redirecionar para /chat (padrão)
  if (authRoutes && user) {
    url.pathname = '/chat';
    return NextResponse.redirect(url);
  }

  // Proteger /chat para usuários autenticados
  if (pathname.startsWith('/chat')) {
    if (!user) {
      console.log('🔒 Redirecionando /chat para /login - usuário não autenticado');
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname + (url.search ? url.search : ''));
      return NextResponse.redirect(url);
    }
    console.log('✅ Acesso permitido ao /chat - usuário autenticado:', user.email);
    console.log(`🎯 Middleware: Pathname exato: ${pathname} - Usuário: ${user.email} ${user.id}`);
    return res;
  }

  // Proteger /dashboard somente para admins
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname + (url.search ? url.search : ''));
      return NextResponse.redirect(url);
    }
    const admin = await isAdmin();
    if (!admin) {
      url.pathname = '/chat';
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Proteger rotas /admin como antes: permitir somente admins
  if (pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname + (url.search ? url.search : ''));
      return NextResponse.redirect(url);
    }
    const admin = await isAdmin();
    if (!admin) {
      url.pathname = '/chat';
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Redirecionar raiz
  if (pathname === '/') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se a rota não for pública nem tratada acima e o usuário não estiver logado, mandar para login
  if (!publicRoutes.has(pathname) && !user) {
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (url.search ? url.search : ''));
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/chat/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/maintenance',
    // Interceptar todas as rotas exceto as estáticas
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};