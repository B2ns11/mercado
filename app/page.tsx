'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES, isExpiringSoon, isExpired, formatDate, formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchTerm, showExpiringSoon]);

  async function loadProducts() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Falha na requisição');
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Failed to load products:', message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  function filterProducts() {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showExpiringSoon) {
      filtered = filtered.filter(
        (p) => p.expiryDate && isExpiringSoon(p.expiryDate, 7)
      );
    }

    setFilteredProducts(filtered);
  }

  async function updateQuantity(id: string, newQuantity: number) {
    if (newQuantity <= 0) {
      await removeProduct(id);
      return;
    }

    try {
      await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      loadProducts();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  }

  async function removeProduct(id: string) {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch (error) {
      console.error('Failed to remove product:', error);
    }
  }

  function getExpiryStatus(expiryDate: string | null) {
    if (!expiryDate) return { text: 'Data desconhecida', color: 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300' };
    if (isExpired(expiryDate)) return { text: 'Vencido', color: 'bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-300' };
    if (isExpiringSoon(expiryDate, 7)) return { text: 'Vencendo em breve', color: 'bg-yellow-200 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300' };
    return { text: 'OK', color: 'bg-green-200 dark:bg-green-950 text-green-800 dark:text-green-300' };
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                🛒 Mercado
              </h1>
              <p className="text-sm texto-suave">Controle inteligente de compras</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/purchase/new"
                className="flex items-center gap-2 glass-button bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus size={20} />
                Nova Compra
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="glass p-6 mb-8 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowExpiringSoon(!showExpiringSoon)}
              className={`glass-button ${
                showExpiringSoon
                  ? 'bg-yellow-500 text-white'
                  : 'texto-suave'
              }`}
            >
              <AlertCircle size={20} />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'glass bg-blue-500 text-white'
                  : 'glass texto-suave hover:opacity-80'
              }`}
            >
              Todos
            </button>
            {Object.values(CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? `glass bg-gradient-to-r ${cat.color} text-white`
                    : 'glass texto-suave hover:opacity-80'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="mb-6 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-glass">
            <p className="font-semibold">Erro ao carregar produtos</p>
            <p className="text-sm mt-1 break-words">{loadError}</p>
            <p className="text-xs mt-2">
              Verifique as variáveis do Supabase no .env.local e se as tabelas foram criadas.
            </p>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="texto-suave">Carregando produtos...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass p-12 text-center">
            <p className="texto-suave mb-4">
              {products.length === 0
                ? 'Nenhum produto cadastrado. Comece uma nova compra!'
                : 'Nenhum produto encontrado com esses filtros.'}
            </p>
            {products.length === 0 && (
              <Link
                href="/purchase/new"
                className="inline-block glass-button bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus size={20} className="inline mr-2" />
                Adicionar Compra
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const category = CATEGORIES[product.category];
              const expiryStatus = getExpiryStatus(product.expiryDate);

              return (
                <div
                  key={product.id}
                  className="glass p-4 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm texto-suave">
                        {category.icon} {category.label}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Price */}
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(product.price * product.quantity)}
                    </div>

                    {/* Expiry Status */}
                    {product.expiryDate && (
                      <div className="space-y-1">
                        <p className="text-xs texto-suave">
                          Vence em: {formatDate(product.expiryDate)}
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${expiryStatus.color}`}>
                          {expiryStatus.text}
                        </span>
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity - 1)}
                        className="glass-button w-8 h-8 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center font-semibold">
                        {product.quantity} {product.unit}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity + 1)}
                        className="glass-button w-8 h-8 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
            <span>🏠</span>
            <span className="text-xs">Estoque</span>
          </Link>
          <Link href="/analytics" className="flex flex-col items-center gap-1 texto-suave hover:opacity-80">
            <span>📊</span>
            <span className="text-xs">Compras</span>
          </Link>
        </div>
      </div>

      {/* Bottom Padding */}
      <div className="h-20" />
    </div>
  );
}
