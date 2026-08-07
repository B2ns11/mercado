export type Category =
  | 'limpeza'
  | 'higiene'
  | 'alimentos'
  | 'laticinios'
  | 'lanches';

export interface Product {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  price: number;
  expiryDate: string | null;
  expiryDatePhoto?: string;
  createdAt: string;
  userId: string;
}

export interface Purchase {
  id: string;
  userId: string;
  receiptPhoto: string;
  receiptDate: string;
  products: Product[];
  totalAmount: number;
  createdAt: string;
}

export interface PurchaseAnalytics {
  month: string;
  year: number;
  categories: {
    [key in Category]: {
      amount: number;
      percentage: number;
    };
  };
  totalAmount: number;
}

export interface CategoryInfo {
  id: Category;
  label: string;
  icon: string;
  color: string;
}

export interface ReceiptItem {
  name: string;
  /** Quantidade lida da nota (coluna Qtde.). 1 quando não informada. */
  quantity: number;
  /** Unidade da nota: UN, KG, L... */
  unit: string;
  /** Preço unitário. O total do item é quantity × unitPrice. */
  unitPrice: number;
  /** Categoria inferida pela IA a partir do nome do produto. */
  category: Category;
}

export interface ExtractedData {
  store: string;
  date: string;
  items: ReceiptItem[];
}

export interface ReconciliationItem {
  id: string;
  source: 'receipt' | 'photo';
  name: string;
  category?: Category;
  status: 'matched' | 'unmatched' | 'duplicate';
}
