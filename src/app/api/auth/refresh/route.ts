import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function createSupabaseServerClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        getAll: () => req.cookies.getAll(),
        set: (name: string, value: string, options: any) => {
          res.cookies.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: false }, { status: 200 });
  try {
    const body = await req.json().catch(() => ({}));
    const { access_token, refresh_token } = body || {};

    const supabase = createSupabaseServerClient(req, res);

    // Se o cliente enviar tokens, define a sessão explicitamente
    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: res.headers });
      }
      return NextResponse.json(
        {
          success: true,
          session: {
            user: data.session?.user,
            expires_at: data.session?.expires_at,
          },
        },
        { status: 200, headers: res.headers }
      );
    }

    // Caso contrário, tenta atualizar/confirmar sessão a partir dos cookies existentes
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return NextResponse.json({ success: false, error: sessionError.message }, { status: 401, headers: res.headers });
    }

    return NextResponse.json(
      {
        success: !!sessionData.session,
        session: sessionData.session
          ? {
              user: sessionData.session.user,
              expires_at: sessionData.session.expires_at,
            }
          : null,
      },
      { status: 200, headers: res.headers }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ success: false }, { status: 200 });
  try {
    const supabase = createSupabaseServerClient(req, res);

    // Apenas confirma/atualiza a sessão baseada em cookies atuais
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401, headers: res.headers });
    }

    return NextResponse.json(
      {
        success: !!data.session,
        session: data.session
          ? {
              user: data.session.user,
              expires_at: data.session.expires_at,
            }
          : null,
      },
      { status: 200, headers: res.headers }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erro interno' }, { status: 500 });
  }
}