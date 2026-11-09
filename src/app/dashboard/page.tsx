'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  MessageSquare,
  FolderLock,
  Shield,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Users2,
  ArrowRight,
  LogOut,
  Smartphone,
  AlertCircle,
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
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [safetyNumbers, setSafetyNumbers] = useState<string[] | null>(null);

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

  // Handle URL query actions like ?action=create
  useEffect(() => {
    if (!loading && user && !space) {
      if (searchParams.get('action') === 'create') {
        handleCreateSpace();
      }
    }
  }, [loading, user, space, searchParams]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeInvite = space?.invites?.[0];
  const isConnected = !!(space && space.user2);
  const partner = space ? (space.user1.id === user?.id ? space.user2 : space.user1) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
        A carregar espaço privado...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-white/[0.08] mb-12 gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-2">
              Painel de Controlo
            </span>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">
              {user?.name}
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">{user?.email}</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 border border-white/10 bg-[#0d0d0d] flex items-center space-x-3 text-xs uppercase tracking-widest">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : space ? 'bg-yellow-400' : 'bg-gray-600'
                }`}
              />
              <span className="text-gray-300">
                {isConnected
                  ? 'Conexão Privada Ativa'
                  : space
                  ? 'Aguardar Segundo Participante'
                  : 'Sem Conexão'}
              </span>
            </div>
          </div>
        </div>

        {/* STATE 1: SEM CONEXÃO OU ESPAÇO PENDENTE */}
        {!isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Box A: Criar ou Partilhar Convite */}
            <div className="border border-white/[0.08] bg-[#0c0c0c] p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-2 font-mono">
                  Opção 01
                </span>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4">
                  Criar Espaço Privado
                </h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed mb-6">
                  Inicializa um canal exclusivo com proteção ponta a ponta. Receberás um código único
                  para partilhar com a segunda pessoa.
                </p>

                {space && activeInvite ? (
                  <div className="p-6 border border-white/20 bg-black my-6">
                    <span className="text-[11px] uppercase tracking-widest text-gray-400 block mb-2">
                      Código de Convite Exclusivo:
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-bold tracking-widest text-white">
                        {activeInvite.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(activeInvite.code)}
                        className="px-4 py-2 bg-white text-black font-semibold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="mt-4 text-[11px] text-gray-500 font-mono">
                      Válido até: {new Date(activeInvite.expiresAt).toLocaleString('pt-PT')}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateSpace}
                    disabled={createLoading}
                    className="w-full py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{createLoading ? 'A inicializar...' : 'Gerar Código de Espaço'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="pt-6 border-t border-white/[0.06] text-xs text-gray-500 uppercase tracking-widest">
                Limite estrito: 2 participantes
              </div>
            </div>

            {/* Box B: Entrar com Código */}
            <div className="border border-white/[0.08] bg-[#0c0c0c] p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-2 font-mono">
                  Opção 02
                </span>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4">
                  Entrar com Código
                </h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed mb-6">
                  Recebeste um código de convite da outra pessoa? Insere o código para desbloquear o
                  espaço mútuo e iniciar a troca de chaves.
                </p>

                {joinError && (
                  <div className="mb-4 p-3 border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
                    {joinError}
                  </div>
                )}

                <form onSubmit={handleJoinSpace} className="space-y-4">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="AD-XXXX-XXXX"
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full py-4 border border-white/30 text-white font-semibold text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{joinLoading ? 'A validar convite...' : 'Conectar ao Espaço'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
              <div className="pt-6 border-t border-white/[0.06] text-xs text-gray-500 uppercase tracking-widest">
                Validação atômica e imediata
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: COM CONEXÃO PRIVADA ATIVA */}
        {isConnected && partner && (
          <div className="space-y-12">
            {/* Active Space Banner */}
            <div className="border border-white/20 bg-[#0a0a0a] p-8 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-400 block font-mono">
                  Espaço Privado Estabelecido
                </span>
                <h2 className="text-3xl font-bold uppercase tracking-widest text-white">
                  {user?.name} &amp; {partner.name}
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  ID do Espaço: <span className="text-gray-300">{space?.id}</span>
                </p>
                <div className="flex items-center space-x-2 pt-2 text-xs text-green-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Criptografia E2EE ativa (ECDH NIST P-256 / AES-256-GCM)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <Link
                  href="/chat"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Abrir Chat</span>
                </Link>
                <Link
                  href="/space/files"
                  className="w-full sm:w-auto px-8 py-4 border border-white/30 text-white font-medium text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                >
                  <FolderLock className="w-4 h-4" />
                  <span>O Nosso Espaço</span>
                </Link>
              </div>
            </div>

            {/* Safety Numbers Card */}
            {safetyNumbers && (
              <div className="border border-white/[0.08] bg-[#0c0c0c] p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-6">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-white">
                      Código de Segurança (Safety Number)
                    </h3>
                    <p className="text-xs text-gray-400 font-light mt-1">
                      Compara estes números com o outro participante para confirmar que a conexão não
                      sofreu interceptação.
                    </p>
                  </div>
                  <Shield className="w-5 h-5 text-gray-400" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono text-center">
                  {safetyNumbers.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-white/10 bg-black text-white text-sm font-bold tracking-widest"
                    >
                      {group}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Device & Session Quick Info */}
        <div className="mt-16 pt-8 border-t border-white/[0.08]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs uppercase tracking-[0.25em] text-gray-400 font-semibold">
              Dispositivos Conectados
            </h3>
            <Link
              href="/settings"
              className="text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
            >
              Gerir todos →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {user?.devices.map((device) => (
              <div
                key={device.id}
                className="p-4 border border-white/[0.06] bg-[#090909] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-white font-medium">{device.deviceName}</div>
                    <div className="text-gray-500 text-[10px]">
                      Ativo em {new Date(device.lastActive).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-green-400 uppercase tracking-widest">
                  Autorizado
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
