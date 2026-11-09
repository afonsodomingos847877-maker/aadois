'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowRight, Lock, Shield, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between">
      <Navbar />

      {/* HERO SECTION - PURE MINIMALISM */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16 text-center max-w-4xl mx-auto">
        {/* Subtle Tagline Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-gray-400 text-[11px] tracking-[0.25em] uppercase mb-10">
          <Lock className="w-3 h-3 text-white/80" />
          <span>Only Two. Nothing Else.</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-[0.22em] uppercase text-white leading-[1.15] mb-8">
          ONLY TWO.
          <br />
          NOTHING ELSE.
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-sm sm:text-base text-gray-400 font-light leading-relaxed tracking-wide mb-12">
          Um espaço privado para duas pessoas. Conversas, ficheiros e momentos protegidos por
          criptografia ponta a ponta.
        </p>

        {/* Main Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
          <Link
            href="/auth?mode=register&action=create"
            className="w-full sm:w-auto px-9 py-4 bg-white text-black font-semibold text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>Criar Espaço Privado</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth?mode=login&action=join"
            className="w-full sm:w-auto px-9 py-4 bg-transparent border border-white/25 text-white font-medium text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
          >
            <span>Entrar com Código</span>
          </Link>
        </div>

        {/* Quote */}
        <p className="text-xs text-gray-500 font-light max-w-md italic tracking-wide">
          "Num mundo onde tudo é partilhado, criámos um espaço onde algumas coisas permanecem apenas entre dois."
        </p>

        {/* 3 ESSENTIAL PILLARS (Clean Linear Strip) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 pt-16 border-t border-white/[0.08] w-full text-left">
          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-600">01</span>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
              Dois Participantes
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Exclusivamente duas pessoas por espaço. Sem terceiros, sem grupos e sem seguidores.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-600">02</span>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
              Criptografia E2EE
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Chaves geradas no dispositivo. Nem o servidor nem administradores conseguem ler conversas.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-gray-600">03</span>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
              O Nosso Espaço
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Cofre cifrado para guardar fotografias, vídeos, documentos e mensagens temporárias.
            </p>
          </div>
        </div>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="py-8 px-6 border-t border-white/[0.06] text-center text-xs text-gray-600 tracking-widest uppercase">
        <span>ADOIS — Your world. Just the two of you.</span>
      </footer>
    </div>
  );
}
