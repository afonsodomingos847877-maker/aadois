'use client';

import Link from 'next/link';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  Shield,
  Lock,
  Users2,
  HardDrive,
  KeyRound,
  FileText,
  ChevronDown,
  ArrowRight,
  EyeOff,
  Cpu,
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'O que torna a ADOIS diferente de outras aplicações de mensagens?',
      a: 'A ADOIS foi concebida exclusivamente para duas pessoas. Não existem canais, grupos, feeds ou terceiros. Cada espaço possui uma barreira técnica arquitetural que impede estritamente a entrada de qualquer outra pessoa além dos dois participantes autenticados.',
    },
    {
      q: 'O servidor ou a equipa da ADOIS tem acesso às minhas mensagens ou ficheiros?',
      a: 'Não. Implementamos arquitetura Zero-Knowledge. Todas as mensagens e ficheiros são encriptados no seu dispositivo antes de saírem dele, utilizando chaves derivadas pelo protocolo ECDH P-256 e cifra AES-256-GCM. O servidor guarda apenas dados binários cifrados e opacos, sendo matematicamente incapaz de ler o conteúdo.',
    },
    {
      q: 'Como funciona o código de convite?',
      a: 'O primeiro participante cria o espaço privado e gera um código aleatório exclusivo de uso único com tempo de validade. Ao partilhar este código com a segunda pessoa, ela insere-o na plataforma, estabelecendo a conexão privada entre os dois dispositivos. O código serve apenas para emparelhamento, não como chave de cifra.',
    },
    {
      q: 'É possível adicionar uma terceira pessoa a um espaço privado?',
      a: 'Não. É uma regra estrutural inviolável da plataforma. A base de dados e a camada de autorização rejeitam tecnicamente qualquer tentativa de associar um terceiro participante a um espaço.',
    },
    {
      q: 'O que acontece aos ficheiros partilhados no "Nosso Espaço"?',
      a: 'Os ficheiros (fotos, vídeos, documentos) são cifrados localmente no seu navegador ou smartphone antes do envio. Ficam organizados cronologicamente e em categorias, e apenas os dois participantes com as chaves correspondentes conseguem decifrá-los.',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative pt-36 pb-28 md:pt-48 md:pb-36 px-6 overflow-hidden border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Subtle Privacy Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-gray-400 text-xs tracking-widest uppercase mb-8">
            <Lock className="w-3.5 h-3.5 text-white/70" />
            <span>Criptografia Ponta a Ponta Real</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white leading-tight mb-8">
            ONLY TWO.
            <br />
            NOTHING ELSE.
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl text-base sm:text-lg text-gray-400 font-light leading-relaxed tracking-wide mb-12">
            Um espaço privado para duas pessoas. Conversas, ficheiros e momentos protegidos por
            criptografia ponta a ponta. Sem terceiros. Sem distrações.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/auth?mode=register&action=create"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Criar Espaço Privado</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth?mode=login&action=join"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/30 text-white font-medium text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
            >
              <span>Entrar com Código</span>
            </Link>
          </div>

          <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest">
            "Num mundo onde tudo é partilhado, criámos um espaço onde algumas coisas permanecem apenas entre dois."
          </p>
        </div>
      </section>

      {/* 2. COMO FUNCIONA */}
      <section className="py-24 px-6 border-b border-white/[0.06] bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-3">
              Fluxo Simplificado
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white">
              Como Funciona a Conexão
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-white/[0.08] bg-[#0c0c0c] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-light text-gray-500 font-mono">01</span>
                <h3 className="text-base font-semibold uppercase tracking-widest text-white mt-6 mb-3">
                  Cria o teu Espaço
                </h3>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  Cria uma conta individual. Com um clique no dashboard, o sistema inicializa um
                  ambiente privado e gera um código de convite seguro.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.05] text-xs text-gray-500 uppercase tracking-wider">
                Par de chaves gerado no dispositivo
              </div>
            </div>

            <div className="p-8 border border-white/[0.08] bg-[#0c0c0c] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-light text-gray-500 font-mono">02</span>
                <h3 className="text-base font-semibold uppercase tracking-widest text-white mt-6 mb-3">
                  Partilha o Código
                </h3>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  Envia o código temporário exclusivamente à segunda pessoa. O código possui validade
                  temporal configurável e proteção contra tentativas repetidas.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.05] text-xs text-gray-500 uppercase tracking-wider">
                Uso único e revogável
              </div>
            </div>

            <div className="p-8 border border-white/[0.08] bg-[#0c0c0c] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-light text-gray-500 font-mono">03</span>
                <h3 className="text-base font-semibold uppercase tracking-widest text-white mt-6 mb-3">
                  Conexão Blindada
                </h3>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  A segunda pessoa entra com o código. É efetuado o aperto de mão criptográfico e o
                  espaço é trancado permanentemente a terceiros.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.05] text-xs text-gray-500 uppercase tracking-wider">
                Exclusivamente dois participantes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIVACIDADE E CRIPTOGRAFIA */}
      <section className="py-24 px-6 border-b border-white/[0.06] bg-[#080808]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-3">
                Segurança Sem Concessões
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase tracking-widest text-white leading-tight mb-6">
                Criptografia Ponta a Ponta Real
              </h2>
              <p className="text-gray-400 font-light leading-relaxed mb-8">
                Não simulamos segurança visual. Todas as mensagens e ficheiros são cifrados através da
                API nativa do W3C (Web Crypto API) no seu próprio navegador ou smartphone antes de
                qualquer transmissão.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 border border-white/10 bg-black text-white shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold text-white">
                      ECDH P-256 & HKDF SHA-256
                    </h4>
                    <p className="text-xs text-gray-400 font-light mt-1">
                      Acordo seguro de chaves elípticas. O servidor apenas faz relay e desconhece o
                      segredo compartilhado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 border border-white/10 bg-black text-white shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold text-white">
                      AES-256-GCM com IV Dinâmico
                    </h4>
                    <p className="text-xs text-gray-400 font-light mt-1">
                      Cifra com autenticação de integridade (AEAD). Cada mensagem possui um vetor de
                      inicialização de 96 bits único.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 border border-white/10 bg-black text-white shrink-0">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold text-white">
                      Servidor Cego (Zero-Knowledge)
                    </h4>
                    <p className="text-xs text-gray-400 font-light mt-1">
                      Nem o administrador nem o servidor conseguem ler mensagens ou abrir ficheiros.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Architecture Box */}
            <div className="border border-white/10 bg-black p-8 font-mono text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                <span className="text-gray-400 uppercase tracking-widest">adois-crypto-protocol.v1</span>
                <span className="text-green-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                  <span>Ativo</span>
                </span>
              </div>
              <div className="space-y-4 text-gray-400">
                <div>
                  <span className="text-gray-600">// Geração de chaves no cliente</span>
                  <div className="text-white mt-1">const keyPair = crypto.subtle.generateKey('ECDH', ...)</div>
                </div>
                <div>
                  <span className="text-gray-600">// Derivação simétrica de espaço</span>
                  <div className="text-white mt-1">const sharedSecret = crypto.subtle.deriveBits(...)</div>
                  <div className="text-white">const roomKey = crypto.subtle.deriveKey('HKDF', ...)</div>
                </div>
                <div>
                  <span className="text-gray-600">// Cifragem autenticada (AEAD)</span>
                  <div className="text-white mt-1">
                    const cipher = crypto.subtle.encrypt('AES-GCM', roomKey, payload)
                  </div>
                </div>
                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-gray-500">
                  <span>CAPACIDADE MÁXIMA</span>
                  <span className="text-white font-semibold">2 PARTICIPANTES</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PARTILHA DE FICHEIROS & MEMÓRIAS */}
      <section className="py-24 px-6 border-b border-white/[0.06] bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-3">
              O Nosso Espaço
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white">
              Cofre de Memórias Partilhadas
            </h2>
            <p className="text-sm text-gray-400 font-light mt-4">
              Fotografias, vídeos, documentos e notas organizados numa cronologia segura e privada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-6 text-white">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-2">
                Documentos
              </h3>
              <p className="text-xs text-gray-400 font-light">
                PDFs, folhas de cálculo e contratos cifrados antes do upload.
              </p>
            </div>

            <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-6 text-white">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-2">
                Galeria Multimédia
              </h3>
              <p className="text-xs text-gray-400 font-light">
                Fotografias e vídeos em alta definição decifrados em tempo real em memória.
              </p>
            </div>

            <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-6 text-white">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-2">
                Mensagens Temporárias
              </h3>
              <p className="text-xs text-gray-400 font-light">
                Temporizadores de autodestruição para mensagens confidenciais (30s a 24h).
              </p>
            </div>

            <div className="p-6 border border-white/[0.08] bg-[#0c0c0c]">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-6 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-2">
                Códigos de Segurança
              </h3>
              <p className="text-xs text-gray-400 font-light">
                Verificação de impressão digital numérica para certificar a identidade do par.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PERGUNTAS FREQUENTES */}
      <section className="py-24 px-6 border-b border-white/[0.06] bg-[#080808]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-3">
              Transparência Total
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-white/[0.08] bg-black transition-colors hover:border-white/20"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left flex items-center justify-between text-sm uppercase tracking-wider font-medium text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-xs text-gray-400 font-light leading-relaxed border-t border-white/[0.04] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FINAL */}
      <section className="py-28 px-6 bg-black text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500 block mb-4">
            O vosso mundo. Apenas vocês os dois.
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-[0.2em] text-white leading-tight mb-8">
            ONLY TWO.
            <br />
            NOTHING ELSE.
          </h2>
          <p className="text-sm text-gray-400 font-light mb-10 max-w-xl">
            Inicia hoje o vosso espaço exclusivo. Sem rastreadores, sem anúncios e com proteção
            criptográfica inviolável.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/auth?mode=register&action=create"
              className="px-10 py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all duration-200"
            >
              Criar Espaço Privado
            </Link>
            <Link
              href="/auth?mode=login&action=join"
              className="px-10 py-4 border border-white/30 text-white font-medium text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-200"
            >
              Entrar com Código
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/[0.08] bg-black text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <span className="font-bold tracking-[0.3em] text-white uppercase">ADOIS</span>
            <span>•</span>
            <span className="tracking-widest uppercase">Zero-Knowledge Private Platform</span>
          </div>
          <div className="flex items-center space-x-6 uppercase tracking-wider text-[11px]">
            <span>ECDH P-256</span>
            <span>AES-256-GCM</span>
            <span>IndexedDB Key Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
