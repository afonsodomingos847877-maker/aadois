import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ADOIS — Only Two. Nothing Else.',
  description:
    'Plataforma de comunicação e partilha privada para exclusivamente duas pessoas, protegida por criptografia ponta a ponta.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className="dark">
      <body className="bg-black text-white min-h-screen selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
