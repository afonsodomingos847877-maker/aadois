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
  Share2,
  X,
} from 'lucide-react';
import { computeSafetyNumber } from '@/lib/crypto';

interface UserData {
  id: string;
  name: string;
  email: string;
  publicKey?: string;
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
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [safetyNumbers, setSafetyNumbers] = useState<string[] | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [terminating, setTerminating] = useState(false);
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

  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

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
      if (!res.ok) throw new Error(data.error || 'Código inválido');

      await fetchStatus();
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleTerminateConnection = async () => {
    if (!space) return;
    setTerminating(true);
    try {
      const res = await fetch('/api/spaces/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: space.id }),
      });
      if (res.ok) {
        setSpace(null);
        setShowTerminateConfirm(false);
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTerminating(false);
    }
  };

  const copyCodeOnly = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeInvite = space?.invites?.[0];
  const isConnected = !!(space && space.user2);
  const partner = space ? (space.user1.id === user?.id ? space.user2 : space.user1) : null;

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        A carregar...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-32 pb-16 flex flex-col justify-center">
        {/* Clean Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-zinc-900 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            Olá, {user?.name}
          </h1>

          {isConnected && partner ? (
            <div className="inline-flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPartnerOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
              <span
                className={`text-xs uppercase tracking-widest font-semibold ${
                  isPartnerOnline ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {partner.name} está {isPartnerOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-zinc-600 uppercase tracking-widest">
              Sem conexão
            </span>
          )}
        </div>

        {/* 1. SE CONECTADO: FOCO TOTAL NO CHAT E PARCEIRO */}
        {isConnected && partner ? (
          <div className="space-y-6">
            <div className="p-8 sm:p-12 border border-zinc-800/80 bg-[#0c0c0e]">
              <div className="flex items-center space-x-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPartnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-mono">
                  {isPartnerOnline ? 'Conectado agora' : 'Espaço Ativo'}
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-wider text-white mb-8">
                {partner.name}
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/chat"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4 text-black" />
                  <span>Entrar no Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/space/files"
                  className="w-full sm:w-auto px-8 py-4 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 font-medium text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center space-x-2"
                >
                  <FolderLock className="w-4 h-4" />
                  <span>O Nosso Espaço</span>
                </Link>

                <button
                  onClick={() => setShowTerminateConfirm(true)}
                  className="w-full sm:w-auto px-6 py-4 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 font-medium text-xs uppercase tracking-[0.2em] transition-colors"
                  title="Encerrar conexão atual para conectar com outra pessoa"
                >
                  Encerrar Conexão
                </button>
              </div>
            </div>

            {/* Subtle verification trigger (modal instead of huge box) */}
            {safetyNumbers && (
              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowSafetyModal(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-mono transition-colors inline-flex items-center space-x-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Código de Segurança (Safety Number)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 2. SE NÃO CONECTADO: FLUXO MINIMALISTA EM 2 OPÇÕES */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Criar Espaço */}
            <div className="p-8 border border-zinc-800 bg-[#0c0c0e] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-zinc-500 block mb-2">01</span>
                <h2 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
                  Criar Espaço
                </h2>

                {space && activeInvite ? (
                  <div className="my-4 p-4 border border-zinc-700 bg-black">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
                      Código de Convite:
                    </span>
                    <div className="text-2xl font-mono font-bold tracking-widest text-white mb-3">
                      {activeInvite.code}
                    </div>
                    <button
                      onClick={() => copyCodeOnly(activeInvite.code)}
                      className="w-full py-2.5 bg-white text-black font-semibold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-1.5"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copiado' : 'Copiar Código'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateSpace}
                    disabled={createLoading}
                    className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 my-4"
                  >
                    <span>{createLoading ? 'A criar...' : 'Gerar Convite'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono pt-4">
                Exclusivo para 2 participantes.
              </div>
            </div>

            {/* Entrar com Código */}
            <div className="p-8 border border-zinc-800 bg-[#0c0c0e] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-zinc-500 block mb-2">02</span>
                <h2 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
                  Entrar com Código
                </h2>

                {joinError && (
                  <div className="mb-3 p-2 border border-red-500/40 bg-red-950/20 text-red-300 text-xs">
                    {joinError}
                  </div>
                )}

                <form onSubmit={handleJoinSpace} className="space-y-3 my-4">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="AD-XXXX-XXXX"
                    className="w-full px-4 py-3 bg-black border border-zinc-700 text-white font-mono text-center tracking-widest text-base focus:outline-none focus:border-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !joinCode.trim()}
                    className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{joinLoading ? 'A conectar...' : 'Conectar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono pt-4">
                Troca de chaves imediata.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SAFETY NUMBERS MODAL (Only when requested, keeping dashboard 100% clean) */}
      {showSafetyModal && safetyNumbers && partner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-zinc-800 bg-[#0e0e10] p-8 text-center relative">
            <button
              onClick={() => setShowSafetyModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">
              Código de Segurança
            </h3>
            <p className="text-xs text-zinc-400 font-light mb-6">
              Compara estes números com o ecrã de {partner.name} para certificar a ligação.
            </p>

            <div className="grid grid-cols-3 gap-2 font-mono text-sm font-bold text-white mb-6">
              {safetyNumbers.map((num, idx) => (
                <div key={idx} className="p-3 border border-zinc-800 bg-black tracking-widest">
                  {num}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSafetyModal(false)}
              className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM TERMINATION MODAL */}
      {showTerminateConfirm && partner && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-zinc-800 bg-[#0e0e10] p-8 text-center relative shadow-2xl">
            <button
              onClick={() => setShowTerminateConfirm(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold uppercase tracking-wider text-white mb-2">
              Encerrar Conexão com {partner.name}?
            </h3>
            <p className="text-xs text-zinc-400 font-light leading-relaxed mb-6">
              Ao encerrar esta conexão, o espaço atual será finalizado e o teu dashboard voltará a
              ficar livre para criares um novo espaço ou entrares com outro código.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleTerminateConnection}
                disabled={terminating}
                className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {terminating ? 'A encerrar...' : 'Sim, Encerrar'}
              </button>
              <button
                onClick={() => setShowTerminateConfirm(false)}
                className="w-full sm:w-auto px-6 py-3.5 border border-zinc-700 text-zinc-300 hover:text-white text-xs uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discreet Footer */}
      <footer className="py-6 text-center text-xs text-zinc-600 font-mono uppercase tracking-widest border-t border-zinc-900">
        ADOIS • Only Two. Nothing Else.
      </footer>
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
