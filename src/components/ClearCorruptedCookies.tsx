'use client';

import { useEffect, useState } from 'react';

export default function ClearCorruptedCookies() {
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    // Executar apenas uma vez por sessão
    if (hasRun) return;

    // Função para verificar e limpar apenas cookies realmente corrompidos
    const clearOnlyCorruptedCookies = () => {
      try {
        // Verificar localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                // Tentar fazer parse do valor para verificar se é válido
                if (value.startsWith('base64-')) {
                  const decoded = atob(value.replace('base64-', ''));
                  JSON.parse(decoded);
                } else {
                  JSON.parse(value);
                }
                // Se chegou até aqui, o cookie é válido
              }
            } catch {
              console.warn(`Removendo localStorage corrompido: ${key}`);
              localStorage.removeItem(key);
            }
          }
        });

        // Verificar sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            try {
              const value = sessionStorage.getItem(key);
              if (value) {
                if (value.startsWith('base64-')) {
                  const decoded = atob(value.replace('base64-', ''));
                  JSON.parse(decoded);
                } else {
                  JSON.parse(value);
                }
                // Se chegou até aqui, o sessionStorage é válido
              }
            } catch {
              console.warn(`Removendo sessionStorage corrompido: ${key}`);
              sessionStorage.removeItem(key);
            }
          }
        });

        // IMPORTANTE: NÃO limpar cookies do document, pois eles são gerenciados pelo Supabase SSR
        // Os cookies HTTP-only devem ser mantidos para funcionar com middleware
        
      } catch {
        console.error('Erro ao verificar cookies corrompidos');
      }
    };

    // Executar limpeza apenas uma vez
    clearOnlyCorruptedCookies();
    setHasRun(true);
  }, [hasRun]);

  return null; // Componente invisível
}