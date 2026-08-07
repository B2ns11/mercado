'use client';

import { useState, useRef } from 'react';
import { ArrowRight, Camera } from 'lucide-react';
import { fileToCompressedBase64, CATEGORIES, formatCurrency } from '@/lib/utils';
import type { Category, ReceiptItem } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

type Step = 'receipt' | 'review' | 'expiry' | 'done';

/** Item da nota já pronto para revisão e edição pelo usuário. */
interface PurchaseItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  unitPrice: number;
  expiryDate?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'receipt', label: 'Nota Fiscal' },
  { id: 'review', label: 'Revisão' },
  { id: 'expiry', label: 'Validades' },
  { id: 'done', label: 'Concluído' },
];

export default function NewPurchasePage() {
  const [step, setStep] = useState<Step>('receipt');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  async function handleReceiptUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToCompressedBase64(file);
      setReceiptImage(base64);

      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Falha ao ler a nota fiscal');
      }

      setStore(data.store ?? '');
      setPurchaseDate(data.date || new Date().toISOString().slice(0, 10));
      setItems(
        (data.items ?? []).map((item: ReceiptItem, idx: number) => ({
          id: `item-${idx}`,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        }))
      );

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(id: string, changes: Partial<PurchaseItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: '',
        category: 'alimentos',
        quantity: 1,
        unit: 'un',
        unitPrice: 0,
      },
    ]);
  }

  /** Foto do rótulo → Gemini extrai a data de validade. */
  async function handleExpiryPhoto(id: string, file: File) {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToCompressedBase64(file);
      const response = await fetch('/api/extract-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Falha ao ler a validade');
      }

      if (data.expiryDate) {
        updateItem(id, { expiryDate: data.expiryDate });
      } else {
        setError('Não foi possível ler a data nesta foto. Preencha manualmente.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function savePurchase() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptPhoto: receiptImage ? `data:image/jpeg;base64,${receiptImage}` : '',
          receiptDate: purchaseDate || new Date().toISOString().slice(0, 10),
          totalAmount: total,
          products: items.map((item) => ({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            price: item.unitPrice,
            expiryDate: item.expiryDate || null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Falha ao salvar compra');
      }

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  function StepIndicator() {
    const currentIndex = STEPS.findIndex((s) => s.id === step);

    return (
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                idx <= currentIndex
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 texto-suave'
              }`}
            >
              {idx + 1}
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  idx < currentIndex ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-2">
          <ThemeToggle />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Nova Compra</h1>
          <p className="texto-suave">
            {step === 'receipt' && 'Fotografe a nota fiscal da sua compra'}
            {step === 'review' && 'Confira os itens lidos da nota'}
            {step === 'expiry' && 'Registre as datas de validade'}
            {step === 'done' && 'Compra registrada com sucesso!'}
          </p>
        </div>

        <StepIndicator />

        {loading && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-4 rounded-glass flex items-center gap-3">
            <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Processando com a IA... isso pode levar alguns segundos.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-glass">
            <p className="font-semibold">Erro:</p>
            <p className="text-sm mt-1 break-words">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs mt-2 underline hover:no-underline"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Etapa 1: foto da nota fiscal */}
          {step === 'receipt' && (
            <div className="glass p-8">
              <div
                onClick={() => receiptInputRef.current?.click()}
                className="border-2 border-dashed rounded-glass p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <Camera className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="font-semibold mb-2">
                  Fotografar Nota Fiscal
                </p>
                <p className="text-sm texto-suave">
                  A IA lê os produtos, quantidades, preços e já classifica por categoria
                </p>
              </div>

              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleReceiptUpload(e.target.files[0]);
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Etapa 2: revisão dos itens */}
          {step === 'review' && (
            <div className="glass p-6 space-y-4">
              <div className="flex flex-wrap gap-3 pb-4 border-b">
                <label className="flex-1 min-w-[180px]">
                  <span className="block text-xs texto-suave mb-1">Loja</span>
                  <input
                    type="text"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full p-2 rounded border text-sm"
                  />
                </label>
                <label className="w-44">
                  <span className="block text-xs texto-suave mb-1">Data da compra</span>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 rounded border text-sm"
                  />
                </label>
              </div>

              {items.length === 0 && (
                <p className="text-sm text-slate-600 py-4 text-center">
                  A IA não encontrou itens nesta nota. Adicione manualmente abaixo.
                </p>
              )}

              <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="glass-card">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={item.name}
                        placeholder="Nome do produto"
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="flex-1 p-2 rounded border text-sm font-semibold"
                      />
                      <button
                        onClick={() => removeItem(item.id)}
                        className="px-3 text-red-600 hover:text-red-800 text-sm"
                        title="Remover item"
                      >
                        Remover
                      </button>
                    </div>

                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(item.id, { category: e.target.value as Category })
                      }
                      className="w-full p-2 mb-2 rounded border text-sm"
                    >
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <label className="w-24">
                        <span className="block text-xs texto-suave mb-1">Qtd.</span>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                          className="w-full p-2 rounded border text-sm"
                        />
                      </label>
                      <label className="w-20">
                        <span className="block text-xs texto-suave mb-1">Un.</span>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          className="w-full p-2 rounded border text-sm"
                        />
                      </label>
                      <label className="flex-1">
                        <span className="block text-xs texto-suave mb-1">
                          Preço unitário (R$)
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, { unitPrice: Number(e.target.value) || 0 })
                          }
                          className={`w-full p-2 rounded border text-sm ${
                            item.unitPrice > 0
                              ? 'border-slate-300'
                              : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40'
                          }`}
                        />
                      </label>
                      <div className="w-28 text-right">
                        <span className="block text-xs texto-suave mb-1">Subtotal</span>
                        <span className="block p-2 text-sm font-semibold">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>

                    {item.unitPrice === 0 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                        Preço não lido da nota. Digite o valor, senão o item entra
                        como R$ 0,00 e não aparece nos gastos.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="w-full glass-button text-sm"
              >
                + Adicionar item que faltou
              </button>

              <div className="flex items-center justify-between px-2 py-3 border-t">
                <span className="font-semibold">Total da compra</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(total)}
                </span>
              </div>

              <button
                onClick={() => setStep('expiry')}
                disabled={items.length === 0}
                className="w-full glass-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Próximo <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Etapa 3: validades */}
          {step === 'expiry' && (
            <div className="glass p-6 space-y-4">
              <p className="text-sm texto-suave">
                Informe as validades. Você pode digitar a data ou fotografar o
                rótulo para a IA ler. Itens sem data ficam sem alerta de vencimento.
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="glass-card">
                    <p className="font-semibold mb-1">{item.name}</p>
                    <p className="text-xs texto-suave mb-3">
                      {CATEGORIES[item.category].icon} {CATEGORIES[item.category].label}{' '}
                      · {item.quantity} {item.unit} ·{' '}
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={item.expiryDate ?? ''}
                        onChange={(e) => updateItem(item.id, { expiryDate: e.target.value })}
                        className="flex-1 p-2 rounded border text-sm"
                      />
                      <label className="glass-button cursor-pointer flex items-center gap-1 text-sm">
                        <Camera size={16} />
                        Foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleExpiryPhoto(item.id, e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('review')}
                  className="glass-button"
                >
                  Voltar
                </button>
                <button
                  onClick={savePurchase}
                  disabled={loading}
                  className="flex-1 glass-button bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? 'Salvando...' : 'Salvar Compra'} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Etapa 4: concluído */}
          {step === 'done' && (
            <div className="glass p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-xl font-semibold mb-2">
                Compra Registrada!
              </p>
              <p className="texto-suave mb-6">
                {items.length} {items.length === 1 ? 'produto foi adicionado' : 'produtos foram adicionados'}{' '}
                ao estoque, totalizando {formatCurrency(total)}.
              </p>
              <a
                href="/"
                className="inline-block glass-button bg-blue-500 hover:bg-blue-600 text-white"
              >
                Ir para Estoque
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
