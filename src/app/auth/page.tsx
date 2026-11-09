'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { generateIdentityKeyPair, getLocalKeyPair } from '@/lib/crypto';
import { Lock, ArrowRight, ShieldCheck, Key } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const initialAction = searchParams.get('action') || '';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cryptoStatus, setCryptoStatus] = useState<string>('');

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) router.push('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      setCryptoStatus('A verificar módulo de chaves E2EE no dispositivo...');
      let localKeys = await getLocalKeyPair();
      let publicKeySpki = localKeys?.spki || '';

      if (!localKeys) {
        setCryptoStatus('A gerar par de chaves criptográficas elípticas (ECDH P-256)...');
        const generated = await generateIdentityKeyPair();
        publicKeySpki = generated.publicSpkiBase64;
      }

      setCryptoStatus('A estabelecer sessão segura...');

      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name,
            publicKey: publicKeySpki,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao registar conta.');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            publicKey: publicKeySpki,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no acesso.');
      }

      // If user came with an action parameter (create or join), we direct them appropriately
      if (initialAction === 'create') {
        router.push('/dashboard?action=create');
      } else if (initialAction === 'join') {
        router.push('/dashboard?action=join');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
      setLoading(false);
      setCryptoStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <div className="pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          {/* Logo header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold tracking-[0.3em] uppercase text-white mb-2">
              ADOIS
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Only Two. Nothing Else.
            </p>
          </div>

          {/* Card */}
          <div className="border border-white/[0.08] bg-[#0c0c0c] p-8">
            {/* Mode Selector Tabs */}
            <div className="flex border-b border-white/[0.08] mb-8">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 pb-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
                  mode === 'login'
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 pb-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
                  mode === 'register'
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 border border-red-500/30 bg-red-950/20 text-red-400 text-xs tracking-wide">
                {error}
              </div>
            )}

            {cryptoStatus && (
              <div className="mb-6 p-3 border border-white/10 bg-white/[0.03] text-gray-300 text-xs tracking-wider font-mono flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>{cryptoStatus}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Nome de Apresentação
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex.: Alex"
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  Endereço de Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilizador@exemplo.com"
                  className="w-full px-4 py-3 bg-black border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  Palavra-Passe
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 bg-black border border-white/10 text-white text-sm focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'A processar...' : mode === 'login' ? 'Aceder' : 'Registar'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <div className="flex items-center justify-center space-x-2 text-[11px] text-gray-500 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Chaves Criptográficas Geradas Localmente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthContent />
    </Suspense>
  );
}
