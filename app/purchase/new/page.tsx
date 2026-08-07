'use client';

import { useState, useRef } from 'react';
import { ArrowRight, Camera, Upload, X, Check, ChevronDown } from 'lucide-react';
import { fileToBase64, CATEGORIES, formatCurrency } from '@/lib/utils';
import type { Category } from '@/types';

type Step = 'receipt' | 'products' | 'reconciliation' | 'expiry' | 'done';

interface ReceiptItem {
  name: string;
  price: number;
}

interface IdentifiedProduct {
  name: string;
  category: Category;
}

interface ReconciliationItem {
  id: string;
  receiptName: string;
  receiptPrice: number;
  matchedProduct?: IdentifiedProduct | null;
  manualCategory?: Category;
  status: 'auto-matched' | 'manual-matched' | 'unmatched';
}

export default function NewPurchasePage() {
  const [step, setStep] = useState<Step>('receipt');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    store?: string;
    date?: string;
    items: ReceiptItem[];
  } | null>(null);
  const [identifiedProducts, setIdentifiedProducts] = useState<IdentifiedProduct[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([]);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const productsInputRef = useRef<HTMLInputElement>(null);

  async function handleReceiptUpload(file: File) {
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      setReceiptImage(base64);

      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      setReceiptData(data);
      setStep('products');
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Erro ao processar nota fiscal');
    } finally {
      setLoading(false);
    }
  }

  async function handleProductsUpload(files: File[]) {
    setLoading(true);
    try {
      const images: string[] = [];
      for (const file of files) {
        const base64 = await fileToBase64(file);
        images.push(base64);
      }
      setProductImages(images);

      const response = await fetch('/api/identify-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      const products = await response.json();
      setIdentifiedProducts(products);
      performAutoMatching(receiptData?.items || [], products);
      setStep('reconciliation');
    } catch (error) {
      console.error('Error identifying products:', error);
      alert('Erro ao identificar produtos');
    } finally {
      setLoading(false);
    }
  }

  function performAutoMatching(receiptItems: ReceiptItem[], products: IdentifiedProduct[]) {
    const reconciled = receiptItems.map((item, idx) => {
      const matched = products.find(
        (p) => p.name.toLowerCase().includes(item.name.toLowerCase()) ||
               item.name.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        id: `item-${idx}`,
        receiptName: item.name,
        receiptPrice: item.price,
        matchedProduct: matched || null,
        status: matched ? 'auto-matched' : 'unmatched',
      } as ReconciliationItem;
    });

    setReconciliation(reconciled);
  }

  function updateReconciliation(id: string, product: IdentifiedProduct | null) {
    setReconciliation((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              matchedProduct: product,
              status: product ? 'manual-matched' : 'unmatched',
            }
          : item
      )
    );
  }

  function setManualCategory(id: string, category: Category) {
    setReconciliation((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, manualCategory: category } : item
      )
    );
  }

  function StepIndicator() {
    const steps: { id: Step; label: string }[] = [
      { id: 'receipt', label: 'Nota Fiscal' },
      { id: 'products', label: 'Produtos' },
      { id: 'reconciliation', label: 'Conciliação' },
      { id: 'expiry', label: 'Validades' },
      { id: 'done', label: 'Concluído' },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step === s.id || ['receipt', 'products', 'reconciliation', 'expiry'].includes(step)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  ['receipt', 'products', 'reconciliation', 'expiry', 'done'].indexOf(step) > idx
                    ? 'bg-blue-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Nova Compra
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {step === 'receipt' && 'Fotografe a nota fiscal de sua compra'}
            {step === 'products' && 'Fotografe os produtos comprados'}
            {step === 'reconciliation' && 'Revise e casque os itens'}
            {step === 'expiry' && 'Registre as datas de validade'}
            {step === 'done' && 'Compra registrada com sucesso!'}
          </p>
        </div>

        <StepIndicator />

        <div className="space-y-6">
          {/* Step 1: Receipt Photo */}
          {step === 'receipt' && (
            <div className="glass p-8">
              {receiptImage ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-black/20 rounded-glass overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${receiptImage}`}
                      alt="Receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {receiptData && (
                    <div className="bg-white/50 dark:bg-white/10 p-4 rounded-glass">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Dados Extraídos:
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <strong>Loja:</strong> {receiptData.store}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        <strong>Data:</strong> {receiptData.date}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong>{receiptData.items?.length || 0} itens encontrados</strong>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => receiptInputRef.current?.click()}
                    className="w-full glass-button text-slate-700 dark:text-slate-300"
                  >
                    Tirar nova foto
                  </button>
                  <button
                    onClick={() => setStep('products')}
                    className="w-full glass-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
                  >
                    Próximo <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => receiptInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-glass p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Camera className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Fotografar Nota Fiscal
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Clique para fotografar ou fazer upload
                  </p>
                </div>
              )}
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleReceiptUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Step 2: Products Photos */}
          {step === 'products' && (
            <div className="glass p-8 space-y-4">
              {receiptImage && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nota Fiscal Capturada ✓
                  </p>
                  <div className="aspect-video bg-black/20 rounded-glass overflow-hidden max-h-32">
                    <img
                      src={`data:image/jpeg;base64,${receiptImage}`}
                      alt="Receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {productImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {productImages.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-black/20 rounded-glass overflow-hidden">
                        <img
                          src={`data:image/jpeg;base64,${img}`}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => productsInputRef.current?.click()}
                    className="w-full glass-button text-slate-700 dark:text-slate-300"
                  >
                    Adicionar mais fotos
                  </button>
                  <button
                    onClick={() => setStep('reconciliation')}
                    className="w-full glass-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Processando...' : 'Próximo'} <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => productsInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-glass p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Fotografar Produtos
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Faça uma ou mais fotos dos produtos dispostos na mesa
                  </p>
                </div>
              )}

              <input
                ref={productsInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleProductsUpload(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Step 3: Reconciliation */}
          {step === 'reconciliation' && (
            <div className="glass p-8 space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reconciliation.map((item) => (
                  <div key={item.id} className="bg-white/50 dark:bg-white/10 p-4 rounded-glass">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.receiptName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.receiptPrice)}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.status === 'auto-matched'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'manual-matched'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {item.status === 'auto-matched' && '✓ Automático'}
                        {item.status === 'manual-matched' && '✓ Manual'}
                        {item.status === 'unmatched' && '⚠ Não mapeado'}
                      </div>
                    </div>

                    {item.matchedProduct ? (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {item.matchedProduct.name}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {CATEGORIES[item.matchedProduct.category].label}
                          </p>
                        </div>
                        <button
                          onClick={() => updateReconciliation(item.id, null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={item.manualCategory || ''}
                          onChange={(e) => setManualCategory(item.id, e.target.value as Category)}
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        >
                          <option value="">Selecione uma categoria...</option>
                          {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <option key={key} value={key}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {identifiedProducts.map((product, idx) => (
                            <button
                              key={idx}
                              onClick={() => updateReconciliation(item.id, product)}
                              className="w-full text-left p-2 rounded bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-900 dark:text-blue-100 text-sm transition-colors"
                            >
                              <span className="font-semibold">{product.name}</span>
                              <span className="text-xs ml-2 opacity-70">
                                ({CATEGORIES[product.category].label})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('expiry')}
                className="w-full glass-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              >
                Próximo <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Step 4: Expiry Dates */}
          {step === 'expiry' && (
            <div className="glass p-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Configure as datas de validade dos produtos. Você pode fotografar as datas ou preenchê-las manualmente.
              </p>
              <button
                onClick={() => setStep('done')}
                className="w-full glass-button bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
              >
                Salvar Compra <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="glass p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Compra Registrada!
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Seus produtos foram adicionados ao estoque com sucesso.
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
