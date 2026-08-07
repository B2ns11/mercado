'use client';

import { useState, useRef } from 'react';
import { ArrowRight, Camera, Upload } from 'lucide-react';
import { fileToBase64 } from '@/lib/utils';

type Step = 'receipt' | 'products' | 'reconciliation' | 'expiry' | 'done';

export default function NewPurchasePage() {
  const [step, setStep] = useState<Step>('receipt');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const productsInputRef = useRef<HTMLInputElement>(null);

  async function handleReceiptUpload(file: File) {
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      setReceiptImage(base64);

      // Extract receipt data using Gemini
      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      setExtractedData(data);
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

      // Identify products using Gemini
      const response = await fetch('/api/identify-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();
      setExtractedData((prev: any) => ({
        ...prev,
        identifiedProducts: data,
      }));

      setStep('reconciliation');
    } catch (error) {
      console.error('Error identifying products:', error);
      alert('Erro ao identificar produtos');
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Nova Compra
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {step === 'receipt' && 'Fotografe a nota fiscal de sua compra'}
            {step === 'products' && 'Fotografe os produtos comprados'}
            {step === 'reconciliation' && 'Verifique e ajuste os itens'}
            {step === 'expiry' && 'Registre as datas de validade'}
            {step === 'done' && 'Compra registrada com sucesso!'}
          </p>
        </div>

        <StepIndicator />

        {/* Content */}
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
            <div className="glass p-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Esta funcionalidade será implementada com a comparação automática entre itens da nota fiscal e produtos identificados.
              </p>
              <button
                onClick={() => setStep('expiry')}
                className="w-full glass-button bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight size={20} />
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
