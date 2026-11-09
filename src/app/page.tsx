'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ArrowRight, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="h-screen w-screen bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between overflow-hidden">
      <Navbar />

      {/* HERO SECTION - ONLY THIS */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto">
        {/* Privacy Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-gray-400 text-[11px] tracking-[0.25em] uppercase mb-8">
          <Lock className="w-3 h-3 text-white/80" />
          <span>Criptografia Ponta a Ponta Real</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[0.22em] uppercase text-white leading-[1.1] mb-8">
          ONLY TWO.
          <br />
          NOTHING ELSE.
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-sm sm:text-base text-gray-400 font-light leading-relaxed tracking-wide mb-12">
          Um espaço privado para duas pessoas. Conversas, ficheiros e momentos protegidos por
          criptografia ponta a ponta. Sem terceiros. Sem distrações.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-14">
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

        {/* Institutional Quote */}
        <p className="text-[11px] sm:text-xs text-gray-500 font-mono uppercase tracking-[0.2em] max-w-2xl">
          "Num mundo onde tudo é partilhado, criámos um espaço onde algumas coisas permanecem apenas entre dois."
        </p>
      </main>

      {/* Empty space at the bottom to balance the navbar */}
      <div className="h-8" />
    </div>
  );
}
