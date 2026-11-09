'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  ShieldAlert,
  Users,
  HardDrive,
  Activity,
  Lock,
  EyeOff,
  Server,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Cpu,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 403) {
        setError('Acesso negado. A tua conta não possui privilégios de administrador.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Falha ao carregar métricas.');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
        A carregar consola de telemetria administrativa...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Navbar />
        <div className="pt-36 max-w-lg mx-auto px-6 text-center">
          <div className="p-6 border border-red-500/30 bg-red-950/20 text-red-400 text-xs mb-6">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-red-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Acesso Restrito</h2>
            <p>{error}</p>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-black text-xs font-semibold uppercase tracking-widest"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { metrics, auditLogs, spacesSummary } = data;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-white/[0.08] mb-10 gap-6">
          <div>
            <Link
              href="/dashboard"
              className="text-xs uppercase tracking-[0.25em] text-gray-500 hover:text-white flex items-center space-x-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">
              Painel Administrativo
            </h1>
            <p className="text-xs text-gray-400 font-light mt-1">
              Telemetria operacional de infraestrutura e monitorização de segurança.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchMetrics();
              }}
              className="px-4 py-2 border border-white/20 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Strict Zero-Knowledge Notice */}
        <div className="p-4 border border-white/10 bg-[#0c0c0c] mb-10 flex items-start space-x-4">
          <div className="p-2 border border-white/10 bg-black shrink-0">
            <EyeOff className="w-5 h-5 text-gray-300" />
          </div>
          <div className="text-xs">
            <span className="font-semibold uppercase tracking-wider text-white block mb-1">
              Garantia Arquitetural Zero-Knowledge
            </span>
            <p className="text-gray-400 font-light leading-relaxed">
              Por especificação técnica, este painel não tem acesso a chaves privadas, chaves de sessão,
              texto em claro de conversas ou ficheiros decifrados. Toda a informação apresentada
              limita-se a telemetria, contadores agregrados e logs de acesso.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
            <div className="flex items-center justify-between text-gray-500 mb-4">
              <span className="text-xs uppercase tracking-widest">Utilizadores</span>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-2">
              {metrics.totalUsers}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">
              {metrics.activeDevices} Dispositivos ativos
            </div>
          </div>

          <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
            <div className="flex items-center justify-between text-gray-500 mb-4">
              <span className="text-xs uppercase tracking-widest">Conexões Ativas</span>
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-2">
              {metrics.activeConnectedSpaces}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">
              {metrics.pendingSpaces} Espaços pendentes
            </div>
          </div>

          <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
            <div className="flex items-center justify-between text-gray-500 mb-4">
              <span className="text-xs uppercase tracking-widest">Mensagens Cifradas</span>
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-2">
              {metrics.totalEncryptedMessages}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">
              AES-256-GCM Blobs
            </div>
          </div>

          <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
            <div className="flex items-center justify-between text-gray-500 mb-4">
              <span className="text-xs uppercase tracking-widest">Armazenamento</span>
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-2">
              {formatBytes(metrics.totalStorageBytes)}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">
              {metrics.totalFilesCount} Ficheiros cifrados
            </div>
          </div>
        </div>

        {/* Security Telemetry Audit Logs */}
        <div className="border border-white/[0.08] bg-[#0c0c0c] p-8 mb-12">
          <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
                Log de Auditoria e Eventos de Segurança
              </h2>
              <p className="text-xs text-gray-400 font-light mt-1">
                Monitorização de tentativas de acesso, login e conexões de novos dispositivos.
              </p>
            </div>
            <ShieldAlert className="w-5 h-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Data / Hora</th>
                  <th className="pb-3">Evento</th>
                  <th className="pb-3">Utilizador</th>
                  <th className="pb-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-400">
                      {new Date(log.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${
                          log.eventType.includes('FAIL')
                            ? 'bg-red-950/40 text-red-400 border border-red-500/30'
                            : log.eventType.includes('JOIN')
                            ? 'bg-green-950/40 text-green-400 border border-green-500/30'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{log.user?.email || 'Sistema'}</td>
                    <td className="py-3 text-gray-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spaces Overview (Zero-Knowledge) */}
        <div className="border border-white/[0.08] bg-[#0c0c0c] p-8">
          <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
                Espaços Privados Registados
              </h2>
              <p className="text-xs text-gray-400 font-light mt-1">
                Apenas metadados agregados estruturais (IDs, estado e contadores).
              </p>
            </div>
            <Server className="w-5 h-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3">ID do Espaço</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Data de Criação</th>
                  <th className="pb-3">Mensagens Cifradas</th>
                  <th className="pb-3">Ficheiros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {spacesSummary.map((sp: any) => (
                  <tr key={sp.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-300">{sp.id}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider ${
                          sp.status === 'active' ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {sp.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(sp.createdAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="py-3 text-gray-300">{sp._count.messages}</td>
                    <td className="py-3 text-gray-300">{sp._count.files}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
