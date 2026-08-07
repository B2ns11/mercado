'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'mercado-tema';

/** Aplica (ou remove) a classe .dark no <html>. */
export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  // Antes da hidratação não dá para saber o tema salvo; renderizar o estado
  // errado por um instante faria o botão "piscar" de opção.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setTheme(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // No modo "sistema", acompanha a troca feita no SO em tempo real.
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, mounted]);

  function cycle() {
    // Partindo de "sistema", ir para a próxima opção da lista poderia cair no
    // modo que já está na tela — clique sem efeito visível. Então salta para o
    // oposto do que está sendo exibido.
    if (theme === 'system') {
      const estaEscuro = document.documentElement.classList.contains('dark');
      setTheme(estaEscuro ? 'light' : 'dark');
      return;
    }

    setTheme(theme === 'dark' ? 'light' : 'system');
  }

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const Icon = current.Icon;

  return (
    <button
      onClick={cycle}
      title={`Tema: ${current.label} (clique para alternar)`}
      aria-label={`Alternar tema. Atual: ${current.label}`}
      className="glass-button flex items-center gap-2 text-sm"
      suppressHydrationWarning
    >
      {mounted ? <Icon size={18} /> : <Monitor size={18} />}
      <span className="hidden sm:inline">{mounted ? current.label : 'Tema'}</span>
    </button>
  );
}
