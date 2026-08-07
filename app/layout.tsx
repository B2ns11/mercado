import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mercado - Controle de Compras',
  description: 'App inteligente de controle de compras residencial com IA',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Roda antes da primeira pintura: sem isso a página aparece clara por um
 * instante antes do React hidratar e aplicar o tema escuro salvo.
 */
const APLICAR_TEMA = `
(function () {
  try {
    var salvo = localStorage.getItem('mercado-tema') || 'system';
    var escuro =
      salvo === 'dark' ||
      (salvo === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (escuro) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />
      </head>
      <body className="antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
