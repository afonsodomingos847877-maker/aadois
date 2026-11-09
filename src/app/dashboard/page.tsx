'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare,
  FolderLock,
  Shield,
  Copy,
  Check,
  ArrowRight,
  Smartphone,
  Share2,
  Lock,
} from 'lucide-react';
import { computeSafetyNumber } from '@/lib/crypto';

interface UserData {
  id: string;
  name: string;
  email: string;
  publicKey?: string;
  devices: Array<{
    id: string;
    deviceName: string;
    lastActive: string;
  }>;
}

interface SpaceData {
  id: string;
  name: string;
  status: string;
  user1: { id: string; name: string; email: string; publicKey?: string };
  user2?: { id: string; name: string; email: string; publicKey?: string } | null;
  invites: Array<{
    id: string;
    code: string;
    expiresAt: string;
    isUsed: boolean;
  }>;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [safetyNumbers, setSafetyNumbers] = useState<string[] | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/auth');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setSpace(data.space);

      // If space has 2 connected users and both have public keys, compute Safety Numbers
      if (data.space?.user1?.publicKey && data.space?.user2?.publicKey) {
        computeSafetyNumber(data.space.user1.publicKey, data.space.user2.publicKey)
          .then((numbers) => setSafetyNumbers(numbers))
          .catch(console.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Pre-fill join code from URL if provided (?join=AD-XXXX-XXXX or ?code=...)
  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
    if (!loading && user && !space) {
      if (searchParams.get('action') === 'create') {
        handleCreateSpace();
      }
    }
  }, [loading, user, space, searchParams]);

  // Connect socket on dashboard to listen to partner online status
  useEffect(() => {
    if (!space?.id || !space.user2) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-space', { spaceId: space.id });
    });

    socket.on('space-joined', ({ isPartnerOnline: pOnline }) => {
      setIsPartnerOnline(pOnline);
    });

    socket.on('partner-presence', ({ status }) => {
      setIsPartnerOnline(status === 'online');
    });

    return () => {
      socket.disconnect();
    };
  }, [space?.id, space?.user2]);

  const handleCreateSpace = async () => {
    setCreateLoading(true);
    try {
      const res = await fetch('/api/spaces/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSpace(data.space);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinLoading(true);

    try {
      const res = await fetch('/api/spaces/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código de convite inválido ou expirado.');

      await fetchStatus();
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const copyCodeOnly = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyDirectLink = (code: string) => {
    const url = `${window.location.origin}/dashboard?join=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activeInvite = space?.invites?.[0];
  const isConnected = !!(space && space.user2);
  const partner = space ? (space.user1.id === user?.id ? space.user2 : space.user1) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono text-sm uppercase tracking-widest">
        A carregar espaço privado...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-white/[0.08] mb-10 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Olá, {user?.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1 font-light">
              Conta ativa: <span className="text-zinc-200 font-mono">{user?.email}</span>
            </p>
          </div>

          <div>
            {isConnected ? (
              <div
                className={`inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all ${
                  isPartnerOnline
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-zinc-900 border-zinc-700/60 text-zinc-400'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPartnerOnline
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                      : 'bg-zinc-500'
                  }`}
                />
                <span>
                  {isPartnerOnline
                    ? `${partner?.name} está ONLINE agora`
                    : `${partner?.name} está Offline`}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-950 text-xs text-zinc-400 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span>Sem conexão estabelecida</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. ESTADO CONECTADO (EXPERIÊNCIA DIRETA E CLARA) */}
        {isConnected && partner ? (
          <div className="space-y-10">
            {/* Primary Action Card */}
            <div className="border border-white/15 bg-gradient-to-b from-[#141416] to-[#0c0c0e] p-8 sm:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        isPartnerOnline
                          ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span className="text-xs uppercase tracking-[0.2em] font-semibold text-zinc-300">
                      {isPartnerOnline ? 'Ligação Direta Ativa' : 'Aguardar entrada do parceiro'}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
                    {partner.name}
                  </h2>

                  <p className="text-sm text-zinc-300 font-light leading-relaxed max-w-lg">
                    O vosso espaço privado está trancado e protegido por criptografia ponta a ponta.
                    Nenhuma terceira pessoa pode aceder às vossas mensagens ou ficheiros.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-4 shrink-0">
                  <Link
                    href="/chat"
                    className="px-8 py-4 bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2.5 shadow-lg"
                  >
                    <MessageSquare className="w-4 h-4 text-black" />
                    <span>Entrar no Chat</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/space/files"
                    className="px-7 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <FolderLock className="w-4 h-4" />
                    <span>O Nosso Espaço</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Safety Verification (Very Legible) */}
            {safetyNumbers && (
              <div className="border border-zinc-800 bg-[#0e0e10] p-6 sm:p-8">
                <div className="flex items-start justify-between pb-4 border-b border-zinc-800 mb-6 gap-4">
                  <div>
                    <h3 className="text-base font-semibold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Código de Segurança (Safety Number)</span>
                    </h3>
                    <p className="text-sm text-zinc-400 font-light mt-1">
                      Compara estes números com o ecrã de {partner.name} para confirmar a identidade da
                      conexão.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center font-mono text-base font-bold text-white">
                  {safetyNumbers.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-zinc-700/80 bg-black tracking-widest shadow-inner"
                    >
                      {group}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 2. ESTADO SEM CONEXÃO (FLUXO ULTRA-SIMPLES EM 2 PASSOS) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Box 1: Convidar a outra pessoa */}
            <div className="border border-zinc-800 bg-[#0e0e10] p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-400 block mb-2 font-mono">
                  Passo 1
                </span>
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-white mb-3">
                  Criar Convite Privado
                </h2>
                <p className="text-sm text-zinc-300 font-light leading-relaxed mb-6">
                  Cria o teu espaço exclusivo e partilha o código com a segunda pessoa.
                </p>

                {space && activeInvite ? (
                  <div className="p-6 border border-zinc-700 bg-black space-y-4 my-4">
                    <div className="text-xs uppercase tracking-wider text-zinc-400">
                      O teu Código de Convite:
                    </div>
                    <div className="text-3xl font-mono font-bold tracking-widest text-white">
                      {activeInvite.code}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => copyCodeOnly(activeInvite.code)}
                        className="py-3 px-4 bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Código Copiado' : 'Copiar Código'}</span>
                      </button>

                      <button
                        onClick={() => copyDirectLink(activeInvite.code)}
                        className="py-3 px-4 border border-zinc-700 text-white font-medium text-xs uppercase tracking-wider hover:bg-zinc-900 transition-colors flex items-center justify-center space-x-2"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Link Copiado' : 'Copiar Link Direto'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 font-mono pt-2">
                      Apenas válido para 1 pessoa. Expira em 48 horas.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateSpace}
                    disabled={createLoading}
                    className="w-full py-4 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{createLoading ? 'A gerar...' : 'Gerar Convite de Espaço'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="pt-6 border-t border-zinc-800 text-xs text-zinc-400">
                Regra estrita: O espaço aceita exclusivamente 2 pessoas.
              </div>
            </div>

            {/* Box 2: Entrar com Código */}
            <div className="border border-zinc-800 bg-[#0e0e10] p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-400 block mb-2 font-mono">
                  Passo 2
                </span>
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-white mb-3">
                  Entrar com Código
                </h2>
                <p className="text-sm text-zinc-300 font-light leading-relaxed mb-6">
                  Já tens o código que a outra pessoa te enviou? Insere-o abaixo para conectar
                  imediatamente.
                </p>

                {joinError && (
                  <div className="mb-4 p-3.5 border border-red-500/40 bg-red-950/30 text-red-300 text-xs leading-relaxed">
                    {joinError}
                  </div>
                )}

                <form onSubmit={handleJoinSpace} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="AD-XXXX-XXXX"
                      className="w-full px-4 py-3.5 bg-black border border-zinc-700 text-white font-mono text-center tracking-widest text-xl focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={joinLoading || !joinCode.trim()}
                    className="w-full py-4 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{joinLoading ? 'A conectar...' : 'Conectar Agora'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="pt-6 border-t border-zinc-800 text-xs text-zinc-400">
                Conexão instantânea e blindada por criptografia.
              </div>
            </div>
          </div>
        )}

        {/* Authorized Devices (Clean and Legible) */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm uppercase tracking-wider text-zinc-400 font-semibold">
              Dispositivos com Acesso
            </h3>
            <Link
              href="/settings"
              className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              Definições da Conta →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {user?.devices.map((device) => (
              <div
                key={device.id}
                className="p-4 border border-zinc-800 bg-[#0d0d0f] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-zinc-400" />
                  <div>
                    <div className="text-white font-medium text-sm">{device.deviceName}</div>
                    <div className="text-zinc-500 text-xs font-mono">
                      Última atividade: {new Date(device.lastActive).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">
                  Ativo
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DashboardContent />
    </Suspense>
  );
}
