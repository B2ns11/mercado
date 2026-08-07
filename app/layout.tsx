import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mercado - Controle de Compras',
  description: 'App inteligente de controle de compras residencial com IA',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
