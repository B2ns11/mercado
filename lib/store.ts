import { create } from 'zustand';
import type { Product, Purchase } from '@/types';

interface AppStore {
  products: Product[];
  purchases: Purchase[];
  setProducts: (products: Product[]) => void;
  setPurchases: (purchases: Purchase[]) => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  addPurchase: (purchase: Purchase) => void;
}

export const useStore = create<AppStore>((set) => ({
  products: [],
  purchases: [],
  setProducts: (products) => set({ products }),
  setPurchases: (purchases) => set({ purchases }),
  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  addPurchase: (purchase) =>
    set((state) => ({
      purchases: [...state.purchases, purchase],
    })),
}));
