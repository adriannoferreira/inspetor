'use client';

import { useEffect, useState } from 'react';

interface AdminTestResult {
  isAdmin: boolean;
  user: {
    email: string;
    id: string;
  } | null;
  message: string;
  error?: string;
}

export function AdminTest() {
  const [result, setResult] = useState<AdminTestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testAdmin = async () => {
      try {
        const response = await fetch('/api/test-admin-simple');
        const data = await response.json();
        setResult(data);
      } catch (error) {
        setResult({
          isAdmin: false,
          user: null,
          message: 'Erro ao testar admin',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } finally {
        setLoading(false);
      }
    };

    testAdmin();
  }, []);

  if (loading) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p>🔄 Testando status de admin...</p>
      </div>
    );
  }

  return (
    <div className={`border px-4 py-3 rounded mb-4 ${
      result?.isAdmin 
        ? 'bg-green-100 border-green-400 text-green-700'
        : 'bg-red-100 border-red-400 text-red-700'
    }`}>
      <h3 className="font-bold mb-2">🧪 Teste de Admin</h3>
      <p><strong>É Admin:</strong> {result?.isAdmin ? '✅ Sim' : '❌ Não'}</p>
      <p><strong>Usuário:</strong> {result?.user?.email || 'Não autenticado'}</p>
      <p><strong>ID:</strong> {result?.user?.id || 'N/A'}</p>
      <p><strong>Mensagem:</strong> {result?.message}</p>
      {result?.error && (
        <p><strong>Erro:</strong> {result.error}</p>
      )}
    </div>
  );
}