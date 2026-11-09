'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; isAdmin?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Typographic Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <span className="text-xl font-bold tracking-[0.3em] uppercase text-white transition-opacity group-hover:opacity-80">
            ADOIS
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors" />
        </Link>

        {/* Navigation Action Links */}
        <div className="flex items-center space-x-6 text-xs uppercase tracking-widest">
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className={`transition-colors py-1 ${
                  pathname === '/dashboard' ? 'text-white border-b border-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/chat"
                className={`transition-colors py-1 ${
                  pathname === '/chat' ? 'text-white border-b border-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Chat
              </Link>
              <Link
                href="/space/files"
                className={`transition-colors py-1 ${
                  pathname === '/space/files' ? 'text-white border-b border-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Espaço
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className={`transition-colors py-1 ${
                    pathname === '/admin' ? 'text-white border-b border-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                className={`transition-colors py-1 ${
                  pathname === '/settings' ? 'text-white border-b border-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Configurações"
              >
                <User className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors py-1"
                title="Terminar sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : !loading ? (
            <>
              <Link
                href="/auth?mode=login"
                className="text-gray-400 hover:text-white transition-colors py-1"
              >
                Entrar
              </Link>
              <Link
                href="/auth?mode=register"
                className="px-4 py-2 border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200"
              >
                Criar Conta
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
