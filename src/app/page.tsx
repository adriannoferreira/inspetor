import Link from "next/link";
import { Shield, MessageSquare, Users, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111b21] to-[#202c33] flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-[#00a884]" />
            <h1 className="text-xl md:text-2xl font-bold text-white">O Inspetor</h1>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-[#8696a0] hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#00a884]/90 transition-colors">
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Shield className="h-16 w-16 md:h-20 md:w-20 text-[#00a884] mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Sistema de Chat Inteligente
            </h2>
            <p className="text-lg md:text-xl text-[#8696a0] mb-8 max-w-2xl mx-auto">
              Converse com agentes especializados em educação de trânsito, perícia e revisão de documentos.
            </p>
          </div>
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#202c33] p-6 rounded-lg border border-[#2a3942]">
              <MessageSquare className="h-8 w-8 text-[#00a884] mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Chat Inteligente</h3>
              <p className="text-[#8696a0] text-sm">
                Converse com agentes especializados em diferentes áreas
              </p>
            </div>
            <div className="bg-[#202c33] p-6 rounded-lg border border-[#2a3942]">
              <Users className="h-8 w-8 text-[#00a884] mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Múltiplos Agentes</h3>
              <p className="text-[#8696a0] text-sm">
                Educação de trânsito, perícia e revisão de documentos
              </p>
            </div>
            <div className="bg-[#202c33] p-6 rounded-lg border border-[#2a3942]">
              <Settings className="h-8 w-8 text-[#00a884] mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Fácil de Usar</h3>
              <p className="text-[#8696a0] text-sm">
                Interface intuitiva e responsiva para todos os dispositivos
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-[#00a884] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#00a884]/90 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Fazer login
            </Link>
            <Link
              href="/login"
              className="border border-[#00a884] text-[#00a884] px-8 py-3 rounded-lg font-medium hover:bg-[#00a884]/10 transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="h-5 w-5" />
              Área logada
            </Link>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden p-4 border-t border-[#2a3942]">
        <div className="flex justify-center gap-4">
          <Link href="/login" className="text-[#8696a0] hover:text-white transition-colors px-4 py-2">
            Entrar
          </Link>
          <Link href="/register" className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#00a884]/90 transition-colors">
            Cadastrar
          </Link>
        </div>
      </div>
    </div>
  );
}
