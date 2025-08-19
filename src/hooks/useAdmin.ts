'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient, withAuth } from '@/lib/supabase-client';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Teste simples: definir como admin para o usuário específico
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email === 'adrianoferreiracoach@gmail.com') {
          console.log('🔐 useAdmin - Usuário admin detectado:', session.user.email);
          setIsAdmin(true);
        } else {
          console.log('🔐 useAdmin - Usuário não é admin:', session?.user?.email || 'sem sessão');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}