'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES, formatCurrency, formatDate } from '@/lib/utils';
import type { Purchase, PurchaseAnalytics } from '@/types';

export default function AnalyticsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [analytics, setAnalytics] = useState<PurchaseAnalytics | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState<{
    produtosNoMes: number;
    produtosNoBanco: number;
    produtosComPrecoZero: number;
  } | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [selectedMonth, selectedYear]);

  async function loadPurchases() {
    setLoading(true);
    setLoadError(null);
    try {
      const [purchasesRes, analyticsRes] = await Promise.all([
        fetch(`/api/purchases?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/analytics?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const purchasesData = await purchasesRes.json();
      const analyticsData = await analyticsRes.json();

      if (!purchasesRes.ok) {
        throw new Error(purchasesData.error ?? 'Falha ao carregar compras');
      }
      if (!analyticsRes.ok) {
        throw new Error(analyticsData.error ?? 'Falha ao carregar análises');
      }

      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setAnalytics(analyticsData);
      setDiagnostico(analyticsData.diagnostico ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Failed to load purchases:', message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  function previousMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function nextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  const monthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(selectedYear, selectedMonth - 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            📊 Minhas Compras
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation */}
        <div className="glass p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="glass-button text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
              {monthName}
            </h2>
            <button
              onClick={nextMonth}
              className="glass-button text-slate-700 dark:text-slate-300"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Total Spending */}
          {analytics && (
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Total Gasto
              </p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(analytics.totalAmount)}
              </p>
            </div>
          )}
        </div>

        {loadError && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-800 p-4 rounded-glass">
            <p className="font-semibold">Erro ao carregar dados</p>
            <p className="text-sm mt-1 break-words">{loadError}</p>
          </div>
        )}

        {/* Explica um total zerado em vez de deixar a tela muda. */}
        {!loading && diagnostico && analytics?.totalAmount === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 text-yellow-900 p-4 rounded-glass">
            <p className="font-semibold mb-1">Por que está tudo zerado?</p>

            {diagnostico.produtosNoBanco === 0 ? (
              <p className="text-sm">
                Ainda não há nenhum produto cadastrado. Registre uma compra para
                ver os gastos aqui.
              </p>
            ) : diagnostico.produtosNoMes === 0 ? (
              <p className="text-sm">
                Existem {diagnostico.produtosNoBanco} produtos cadastrados, mas
                nenhum neste mês. Navegue para o mês da compra usando as setas
                acima.
              </p>
            ) : (
              <p className="text-sm">
                {diagnostico.produtosComPrecoZero} de {diagnostico.produtosNoMes}{' '}
                produtos deste mês estão com preço R$ 0,00 — provavelmente a IA
                não conseguiu ler os valores da nota. Registre a compra de novo
                digitando os preços na etapa de conciliação, ou ajuste os itens
                direto no Supabase.
              </p>
            )}
          </div>
        )}

        {/* Category Breakdown */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(CATEGORIES).map(([key, category]) => {
              const catData = analytics.categories[key as keyof typeof CATEGORIES];
              return (
                <div key={key} className="glass p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {category.label}
                        </p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(catData.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {catData.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/50 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${category.color}`}
                      style={{ width: `${catData.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Purchases List */}
        <div className="glass p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Notas Fiscais
          </h3>

          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Carregando...
            </p>
          ) : purchases.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Nenhuma compra registrada neste mês.
            </p>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-glass hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Compra em {formatDate(purchase.receiptDate)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {purchase.products.length} itens
                    </p>
                  </div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(purchase.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 dark:border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
            <span>🏠</span>
            <span className="text-xs">Estoque</span>
          </Link>
          <Link href="/analytics" className="flex flex-col items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
            <span>📊</span>
            <span className="text-xs">Compras</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
