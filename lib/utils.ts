import type { CategoryInfo, Category } from '@/types';

export const CATEGORIES: Record<Category, CategoryInfo> = {
  limpeza: {
    id: 'limpeza',
    label: 'Limpeza e Lavanderia',
    icon: '🧹',
    color: 'from-blue-400 to-blue-600',
  },
  higiene: {
    id: 'higiene',
    label: 'Higiene Pessoal',
    icon: '🧴',
    color: 'from-pink-400 to-pink-600',
  },
  alimentos: {
    id: 'alimentos',
    label: 'Alimentos Básicos',
    icon: '🥗',
    color: 'from-orange-400 to-orange-600',
  },
  laticinios: {
    id: 'laticinios',
    label: 'Laticínios e Condimentos',
    icon: '🧀',
    color: 'from-yellow-400 to-yellow-600',
  },
  lanches: {
    id: 'lanches',
    label: 'Biscoitos e Lanches',
    icon: '🍪',
    color: 'from-amber-400 to-amber-600',
  },
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function getMonthName(month: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
  }).format(new Date(2024, month - 1));
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(expiryDate: string, days: number = 7): boolean {
  return getDaysUntilExpiry(expiryDate) <= days;
}

export function isExpired(expiryDate: string): boolean {
  return getDaysUntilExpiry(expiryDate) < 0;
}

/**
 * Reduz a foto antes de mandar para a IA. Câmera de celular gera imagens de
 * 4000px que viram base64 de vários MB — lento para enviar e caro em tokens.
 * 1600px de lado maior é mais que suficiente para ler texto de nota fiscal.
 */
export function fileToCompressedBase64(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;

    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;

      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Sem canvas disponível: manda a imagem original.
          resolve((reader.result as string).split(',')[1]);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };

      img.src = reader.result as string;
    };
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

export function base64ToDataUrl(base64: string, mimeType: string = 'image/jpeg'): string {
  return `data:${mimeType};base64,${base64}`;
}
