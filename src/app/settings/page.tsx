'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  User,
  Shield,
  Smartphone,
  Key,
  LogOut,
  AlertTriangle,
  Check,
  Trash2,
  Lock,
} from 'lucide-react';
import { getLocalKeyPair } from '@/lib/crypto';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [space, setSpace] = useState<any>(null);
  const [localSpki, setLocalSpki] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/auth');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setSpace(data.space);

      const keys = await getLocalKeyPair();
      if (keys?.spki) setLocalSpki(keys.spki);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTerminateSpace = async () => {
    if (!space) return;
    if (
      !confirm(
        'Tens a certeza de que desejas encerrar a conexão privada? O acesso mútuo ao chat e às partilhas será interrompido.'
      )
    ) {
      return;
    }

    setTerminating(true);
    try {
      const res = await fetch('/api/spaces/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: space.id }),
      });
      if (res.ok) {
        setFeedback('Conexão privada encerrada com sucesso.');
        setSpace(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTerminating(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
        A carregar configurações...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="pb-8 border-b border-white/[0.08] mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-2">
            Área Pessoal
          </span>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-white">
            Configurações &amp; Privacidade
          </h1>
        </div>

        {feedback && (
          <div className="mb-8 p-4 border border-white/20 bg-[#0c0c0c] text-xs font-mono text-green-400">
            {feedback}
          </div>
        )}

        <div className="space-y-12">
          {/* 1. Profile Information */}
          <section className="border border-white/[0.08] bg-[#0c0c0c] p-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white mb-6 flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>Identidade de Utilizador</span>
            </h2>

            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="text-gray-500 uppercase tracking-widest block mb-1">
                  Nome de Apresentação
                </label>
                <div className="p-3 bg-black border border-white/10 text-white font-medium">
                  {user?.name}
                </div>
              </div>

              <div>
                <label className="text-gray-500 uppercase tracking-widest block mb-1">
                  Endereço de Email
                </label>
                <div className="p-3 bg-black border border-white/10 text-white font-mono">
                  {user?.email}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Cryptographic Device Identity (E2EE) */}
          <section className="border border-white/[0.08] bg-[#0c0c0c] p-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white mb-6 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Módulo Criptográfico Local (Web Crypto API)</span>
            </h2>

            <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
              A tua chave privada de encriptação reside no cofre isolado (IndexedDB) deste navegador e
              nunca é transmitida à rede. A tua chave pública é partilhada unicamente com o teu
              parceiro para o estabelecimento da chave simétrica de sessão.
            </p>

            <div className="p-4 border border-white/10 bg-black font-mono text-[11px] text-gray-400 break-all space-y-2">
              <div className="text-gray-500 uppercase tracking-wider text-[10px]">
                Chave Pública SPKI (ECDH NIST P-256):
              </div>
              <div className="text-gray-200">
                {localSpki || user?.publicKey || 'Chave não detetada neste dispositivo.'}
              </div>
            </div>
          </section>

          {/* 3. Space Management (Terminate Connection) */}
          {space && (
            <section className="border border-red-500/20 bg-[#0d0909] p-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Gestão da Conexão Privada</span>
              </h2>

              <p className="text-xs text-gray-400 font-light leading-relaxed mb-6">
                Podes terminar a qualquer momento a conexão com o teu parceiro. O espaço privado será
                marcado como inativo e nenhum dos participantes poderá enviar novas mensagens.
              </p>

              <button
                onClick={handleTerminateSpace}
                disabled={terminating}
                className="px-6 py-3 border border-red-500/40 text-red-400 hover:bg-red-950/40 font-semibold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {terminating ? 'A encerrar...' : 'Encerrar Conexão Privada'}
              </button>
            </section>
          )}

          {/* 4. Authorized Devices */}
          <section className="border border-white/[0.08] bg-[#0c0c0c] p-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white mb-6 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <span>Dispositivos Autorizados</span>
            </h2>

            <div className="space-y-3">
              {user?.devices.map((device: any) => (
                <div
                  key={device.id}
                  className="p-4 border border-white/10 bg-black flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{device.deviceName}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      Último acesso: {new Date(device.lastActive).toLocaleString('pt-PT')}
                    </div>
                  </div>
                  <span className="text-[10px] text-green-400 uppercase tracking-widest">
                    Ativo
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Session Actions */}
          <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={handleLogout}
              className="px-6 py-3 border border-white/20 text-gray-300 hover:text-white hover:border-white text-xs uppercase tracking-widest transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminar Sessão</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
