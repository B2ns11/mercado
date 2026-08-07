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

  useEffect(() => {
    loadPurchases();
  }, [selectedMonth, selectedYear]);

  async function loadPurchases() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/purchases?month=${selectedMonth}&year=${selectedYear}`
      );
      const data = await response.json();
      setPurchases(data || []);
      calculateAnalytics(data);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateAnalytics(purchaseList: Purchase[]) {
    const categoryTotals: Record<string, number> = {};
    let total = 0;

    Object.keys(CATEGORIES).forEach((cat) => {
      categoryTotals[cat] = 0;
    });

    purchaseList.forEach((p) => {
      total += p.totalAmount;
      // Aggregate by category
    });

    setAnalytics({
      month: String(selectedMonth),
      year: selectedYear,
      categories: Object.keys(CATEGORIES).reduce(
        (acc, cat) => ({
          ...acc,
          [cat]: {
            amount: categoryTotals[cat] || 0,
            percentage: total > 0 ? ((categoryTotals[cat] || 0) / total) * 100 : 0,
          },
        }),
        {} as Record<string, any>
      ),
      totalAmount: total,
    });
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
      <div className="sticky top-0 z-50 glass-light dark:glass-dark border-b border-white/20 dark:border-white/10">
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

        {/* Category Breakdown */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(CATEGORIES).map(([key, category]) => {
              const catData = analytics.categories[key as any];
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
      <div className="fixed bottom-0 left-0 right-0 glass-light dark:glass-dark border-t border-white/20 dark:border-white/10 px-4 py-3">
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
